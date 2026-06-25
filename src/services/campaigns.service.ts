import { supabaseAdmin } from '../lib/supabase/server';
import type { Campaign } from '../types';

export interface CreateCampaignInput {
  clientId: string;
  name: string;
  listId: string;
  templateId?: string | null;
  subject: string;
  html: string;
  fromName: string;
  fromEmail: string;
  scheduledAt?: string | null; // ISO; se presente, a campanha fica agendada
}

export async function createCampaign(input: CreateCampaignInput): Promise<Campaign> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from('campaigns')
    .insert({
      client_id: input.clientId,
      name: input.name,
      list_id: input.listId,
      template_id: input.templateId ?? null,
      subject: input.subject,
      html: input.html,
      from_name: input.fromName,
      from_email: input.fromEmail,
      // agendada → 'queued' + horário; o cron libera quando chegar a hora
      status: input.scheduledAt ? 'queued' : 'draft',
      scheduled_at: input.scheduledAt ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Campaign;
}

/** Enfileira 1 envio por contato ativo da lista e marca a campanha 'sending'. */
export async function enqueueCampaign(campaignId: string): Promise<{ queued: number }> {
  const db = supabaseAdmin();
  const { data: campaign, error: cErr } = await db
    .from('campaigns')
    .select('id, list_id, status')
    .eq('id', campaignId)
    .single();
  if (cErr) throw cErr;
  if (!campaign.list_id) throw new Error('Campanha sem lista associada.');
  if (campaign.status === 'sending' || campaign.status === 'sent') {
    throw new Error('Esta campanha já foi disparada.');
  }

  const { data: contacts, error: ctErr } = await db
    .from('contacts')
    .select('id, email')
    .eq('list_id', campaign.list_id)
    .eq('status', 'active');
  if (ctErr) throw ctErr;
  if (!contacts || contacts.length === 0) throw new Error('A lista não tem contatos ativos.');

  const sends = contacts.map((c) => ({
    campaign_id: campaignId,
    contact_id: c.id,
    email: c.email,
    status: 'pending' as const,
  }));
  for (let i = 0; i < sends.length; i += 500) {
    const { error } = await db.from('email_sends').insert(sends.slice(i, i + 500));
    if (error) throw error;
  }
  await db.from('campaigns').update({ status: 'sending' }).eq('id', campaignId);
  return { queued: sends.length };
}
