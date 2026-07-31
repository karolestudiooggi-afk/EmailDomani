import { supabaseAdmin } from '../lib/supabase/server';
import { renderForSend, unsubscribePostUrl } from '../lib/email/render';
import { sendOne, fromAddress } from '../lib/email/send';
import { buildAgencyTransporter } from '../lib/email/transporter';
import { enqueueCampaign } from './campaigns.service';
import { env } from '../lib/env';

interface PendingRow {
  id: string;
  email: string;
  contact_id: string | null;
  campaign_id: string;
  campaigns: { subject: string; html: string; from_name: string; from_email: string; client_id: string };
  contacts: { name: string | null; fields: Record<string, string> } | null;
}

interface ClientRow {
  id: string;
  brand_name: string;
  brand_fields: Record<string, string>;
  daily_limit: number;
}

/**
 * Trava de execução: o cron roda a cada minuto, mas um lote grande pode demorar
 * mais que isso. Sem essa trava, a execução seguinte pegaria as MESMAS linhas
 * ainda pendentes e o contato receberia o e-mail duplicado.
 * (Vale para 1 processo — mantenha o PM2 em modo fork, não cluster.)
 */
let dispatchRunning = false;

/**
 * Worker do cron. A cada minuto:
 *  1. libera campanhas agendadas cujo horário chegou;
 *  2. processa um lote da fila, respeitando o LIMITE DIÁRIO DE CADA CLIENTE
 *     (a cota de um cliente nunca consome a de outro).
 */
export async function processDispatchBatch(): Promise<{
  released: number;
  processed: number;
  sent: number;
  failed: number;
  skipped?: boolean;
}> {
  // já tem um lote rodando → sai sem fazer nada (evita envio duplicado)
  if (dispatchRunning) return { released: 0, processed: 0, sent: 0, failed: 0, skipped: true };
  dispatchRunning = true;
  try {
  const db = supabaseAdmin();

  const released = await releaseScheduledCampaigns(db);

  const { data: rows, error } = await db
    .from('email_sends')
    .select(
      'id, email, contact_id, campaign_id, ' +
        'campaigns(subject, html, from_name, from_email, client_id), ' +
        'contacts(name, fields)',
    )
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(env.DISPATCH_BATCH_SIZE);
  if (error) throw error;

  const pending = (rows ?? []) as unknown as PendingRow[];
  if (pending.length === 0) {
    await closeFinishedCampaigns(db);
    return { released, processed: 0, sent: 0, failed: 0 };
  }

  // clientes envolvidos (limite + dados de marca; SMTP agora é da agência)
  const clientIds = [...new Set(pending.map((p) => p.campaigns.client_id))];
  const { data: clientsData } = await db
    .from('clients')
    .select('id, brand_name, brand_fields, daily_limit')
    .in('id', clientIds);
  const clients = new Map((clientsData ?? []).map((c) => [c.id, c as ClientRow]));

  // cota restante de cada cliente HOJE (limite - já enviados hoje)
  const remaining = new Map<string, number>();
  for (const id of clientIds) {
    const { data: usedToday } = await db.rpc('sends_today_by_client', { p_client: id });
    const limit = clients.get(id)?.daily_limit ?? 0;
    remaining.set(id, Math.max(0, limit - (Number(usedToday) || 0)));
  }

  const agency = buildAgencyTransporter();
  const now = () => new Date().toISOString();
  let sent = 0;
  let failed = 0;

  for (const row of pending) {
    const clientId = row.campaigns.client_id;
    const client = clients.get(clientId);
    if (!client) {
      failed++;
      await db.from('email_sends').update({ status: 'failed', error: 'Cliente não encontrado' }).eq('id', row.id);
      continue;
    }
    // cota do cliente esgotada hoje → deixa pendente para o próximo dia/lote
    if ((remaining.get(clientId) ?? 0) <= 0) continue;

    const { transporter, mock } = agency;

    const vars: Record<string, string> = {
      ...client.brand_fields,
      empresa: client.brand_name,
      email: row.email,
      email_remetente: row.campaigns.from_email,
      nome: row.contacts?.name ?? '',
      ...(row.contacts?.fields ?? {}),
    };

    const rendered = renderForSend(row.campaigns.subject, row.campaigns.html, row.id, vars);
    const unsub = unsubscribePostUrl(row.id);
    const result = await sendOne(transporter, mock, {
      to: row.email,
      from: fromAddress(row.campaigns.from_name, row.campaigns.from_email),
      subject: rendered.subject,
      html: rendered.html,
      headers: {
        'List-Unsubscribe': `<${unsub}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    });

    if (result.ok) {
      sent++;
      remaining.set(clientId, (remaining.get(clientId) ?? 1) - 1);
      await db.from('email_sends').update({ status: 'sent', sent_at: now(), message_id: result.messageId }).eq('id', row.id);
    } else {
      failed++;
      await db.from('email_sends').update({ status: 'failed', error: result.error, bounced_at: now() }).eq('id', row.id);
      if (row.contact_id) await db.from('contacts').update({ status: 'bounced' }).eq('id', row.contact_id);
    }
  }

  await closeFinishedCampaigns(db);
  return { released, processed: pending.length, sent, failed };
  } finally {
    dispatchRunning = false;
  }
}

/** Enfileira campanhas 'queued' cujo horário agendado já chegou. */
async function releaseScheduledCampaigns(db: ReturnType<typeof supabaseAdmin>): Promise<number> {
  const { data: due } = await db
    .from('campaigns')
    .select('id')
    .eq('status', 'queued')
    .not('scheduled_at', 'is', null)
    .lte('scheduled_at', new Date().toISOString());
  let released = 0;
  for (const camp of due ?? []) {
    try {
      await enqueueCampaign(camp.id);
      released++;
    } catch {
      // sem contatos/lista: volta pra rascunho pra não ficar travada
      await db.from('campaigns').update({ status: 'draft', scheduled_at: null }).eq('id', camp.id);
    }
  }
  return released;
}

async function closeFinishedCampaigns(db: ReturnType<typeof supabaseAdmin>): Promise<void> {
  const { data: sending } = await db.from('campaigns').select('id').eq('status', 'sending');
  for (const camp of sending ?? []) {
    const { count } = await db
      .from('email_sends')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', camp.id)
      .eq('status', 'pending');
    if ((count ?? 0) === 0) await db.from('campaigns').update({ status: 'sent' }).eq('id', camp.id);
  }
}
