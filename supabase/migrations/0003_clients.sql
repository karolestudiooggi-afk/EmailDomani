-- ============================================================================
--  Domani Mailer — migração 0003: multi-cliente (BYO-SMTP)
--  Rodar DEPOIS de 0001_init.sql e 0002_resend.sql.
-- ============================================================================

-- ─── Clientes ───────────────────────────────────────────────────────────────
-- Cada cliente conecta o SMTP dele (Gmail, SendPulse, Brevo...). A senha é
-- guardada criptografada (AES-256-GCM) na coluna smtp_pass_enc.
create table if not exists clients (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,            -- nome interno (agência)
  brand_name      text not null,            -- nome exibido / variável {{empresa}}
  from_name       text not null,
  from_email      text not null,
  smtp_host       text,
  smtp_port       int  default 587,
  smtp_secure     boolean default false,
  smtp_user       text,
  smtp_pass_enc   text,                     -- senha SMTP criptografada
  -- campos de marca usáveis no template: {{logo}}, {{assinatura}}, {{site}}...
  brand_fields    jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

-- ─── Escopo por cliente ─────────────────────────────────────────────────────
alter table contact_lists add column if not exists client_id uuid references clients(id) on delete cascade;
alter table templates     add column if not exists client_id uuid references clients(id) on delete cascade;
alter table campaigns     add column if not exists client_id uuid references clients(id) on delete cascade;

create index if not exists idx_lists_client      on contact_lists(client_id);
create index if not exists idx_templates_client  on templates(client_id);
create index if not exists idx_campaigns_client  on campaigns(client_id);

-- ─── Coluna de bounce síncrono (rejeição na hora do envio) ──────────────────
alter table email_sends add column if not exists bounced_at timestamptz;

-- ─── Eventos: voltar ao conjunto do tracking próprio (pixel/clique/bounce) ───
alter table email_events drop constraint if exists email_events_type_check;
alter table email_events add constraint email_events_type_check
  check (type in ('open', 'click', 'bounce'));

-- ─── Stats agregadas para SMTP (sem "entregue/spam" de provedor) ────────────
drop function if exists campaign_stats(uuid);
create function campaign_stats(p_campaign uuid)
returns table (
  total    bigint,
  sent     bigint,
  failed   bigint,
  pending  bigint,
  bounced  bigint,
  opened   bigint,
  clicked  bigint
) language sql stable as $$
  select
    count(*)                                          as total,
    count(*) filter (where status = 'sent')          as sent,
    count(*) filter (where status = 'failed')        as failed,
    count(*) filter (where status = 'pending')       as pending,
    count(*) filter (where bounced_at is not null)   as bounced,
    count(*) filter (where opened_at is not null)    as opened,
    count(*) filter (where clicked_at is not null)   as clicked
  from email_sends
  where campaign_id = p_campaign;
$$;
