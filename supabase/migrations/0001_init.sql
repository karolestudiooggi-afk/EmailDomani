-- ============================================================================
--  Edulis Mailer — schema inicial
--  Rodar no SQL Editor do Supabase (ou via supabase db push).
-- ============================================================================

create extension if not exists "pgcrypto";

-- ─── Listas de contatos ─────────────────────────────────────────────────────
create table if not exists contact_lists (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  source_file text,                       -- caminho no Storage da planilha original
  created_at  timestamptz not null default now()
);

-- ─── Contatos ───────────────────────────────────────────────────────────────
create table if not exists contacts (
  id            uuid primary key default gen_random_uuid(),
  list_id       uuid not null references contact_lists(id) on delete cascade,
  email         text not null,
  name          text,
  -- colunas extras da planilha (telefone, unidade, aniversário...) viram JSON
  fields        jsonb not null default '{}'::jsonb,
  status        text not null default 'active'  -- active | unsubscribed | bounced
                  check (status in ('active', 'unsubscribed', 'bounced')),
  created_at    timestamptz not null default now(),
  unique (list_id, email)
);
create index if not exists idx_contacts_list on contacts(list_id);
create index if not exists idx_contacts_email on contacts(email);

-- ─── Templates ──────────────────────────────────────────────────────────────
create table if not exists templates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  subject     text not null,
  html        text not null,             -- aceita variáveis {{nome}}, {{email}}...
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─── Campanhas ──────────────────────────────────────────────────────────────
create table if not exists campaigns (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  list_id       uuid references contact_lists(id) on delete set null,
  template_id   uuid references templates(id) on delete set null,
  -- snapshot do conteúdo no momento do disparo (não muda se o template mudar)
  subject       text not null,
  html          text not null,
  from_name     text not null,
  from_email    text not null,
  status        text not null default 'draft'   -- draft | queued | sending | sent | paused
                  check (status in ('draft', 'queued', 'sending', 'sent', 'paused')),
  scheduled_at  timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists idx_campaigns_status on campaigns(status);

-- ─── Fila de envios (1 linha por destinatário) ──────────────────────────────
-- Esta tabela é a fila. O worker do cron pega linhas 'pending' em lotes.
create table if not exists email_sends (
  id            uuid primary key default gen_random_uuid(),
  campaign_id   uuid not null references campaigns(id) on delete cascade,
  contact_id    uuid references contacts(id) on delete set null,
  email         text not null,
  status        text not null default 'pending'  -- pending | sent | failed
                  check (status in ('pending', 'sent', 'failed')),
  message_id    text,                     -- id retornado pelo SMTP
  error         text,
  -- métricas estilo Brevo
  sent_at       timestamptz,
  opened_at     timestamptz,             -- primeira abertura
  open_count    int not null default 0,
  clicked_at    timestamptz,             -- primeiro clique
  click_count   int not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists idx_sends_campaign on email_sends(campaign_id);
create index if not exists idx_sends_pending on email_sends(status) where status = 'pending';

-- ─── Log de eventos (auditoria detalhada de cada abertura/clique) ───────────
create table if not exists email_events (
  id          uuid primary key default gen_random_uuid(),
  send_id     uuid not null references email_sends(id) on delete cascade,
  type        text not null check (type in ('open', 'click', 'bounce')),
  url         text,                       -- destino, para cliques
  user_agent  text,
  ip          text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_events_send on email_events(send_id);

-- ─── Trigger: manter updated_at do template ─────────────────────────────────
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists trg_templates_touch on templates;
create trigger trg_templates_touch before update on templates
  for each row execute function touch_updated_at();

-- ─── RPC: estatísticas agregadas de uma campanha (para a tela de relatório) ──
create or replace function campaign_stats(p_campaign uuid)
returns table (
  total      bigint,
  sent       bigint,
  failed     bigint,
  pending    bigint,
  opened     bigint,
  clicked    bigint
) language sql stable as $$
  select
    count(*)                                            as total,
    count(*) filter (where status = 'sent')             as sent,
    count(*) filter (where status = 'failed')           as failed,
    count(*) filter (where status = 'pending')          as pending,
    count(*) filter (where opened_at is not null)       as opened,
    count(*) filter (where clicked_at is not null)      as clicked
  from email_sends
  where campaign_id = p_campaign;
$$;

-- ─── RPC: contagem de envios do dia (respeitar limite do Gmail) ─────────────
create or replace function sends_today()
returns bigint language sql stable as $$
  select count(*) from email_sends
  where status = 'sent' and sent_at >= date_trunc('day', now());
$$;
