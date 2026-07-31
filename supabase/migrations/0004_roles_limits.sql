-- ============================================================================
--  Domani Mailer — migração 0004: papéis, limite por cliente, agendamento
--  Rodar DEPOIS de 0001_init.sql e 0003_clients.sql.
-- ============================================================================

-- ─── Perfis de usuário (papéis) ─────────────────────────────────────────────
-- Liga o usuário do Supabase Auth a um papel. 'admin' gerencia clientes e
-- usuários; 'operator' opera campanhas/contatos/templates.
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  role        text not null default 'operator' check (role in ('admin', 'operator')),
  created_at  timestamptz not null default now()
);

-- Novo usuário do Auth ganha um perfil automaticamente.
-- O PRIMEIRO usuário vira admin; os demais, operator.
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
declare cnt int;
begin
  select count(*) into cnt from public.profiles;
  insert into public.profiles (id, email, role)
  values (new.id, new.email, case when cnt = 0 then 'admin' else 'operator' end)
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ─── Limite diário por cliente ──────────────────────────────────────────────
-- Cada cliente tem o teto dele (a cota do SendPulse é por conta). Um cliente
-- nunca consome a cota de outro.
alter table clients add column if not exists daily_limit int not null default 2000;

-- Quantos e-mails este cliente já enviou hoje (respeitar o teto por cliente).
create or replace function sends_today_by_client(p_client uuid)
returns bigint language sql stable as $$
  select count(*)
  from email_sends es
  join campaigns c on c.id = es.campaign_id
  where c.client_id = p_client
    and es.status = 'sent'
    and es.sent_at >= date_trunc('day', now());
$$;
