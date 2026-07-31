import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase/server';
import { enqueueCampaign } from '../../../../services/campaigns.service';
import { processDispatchBatch } from '../../../../services/dispatch.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** GET /api/campaigns/:id → detalhe + stats + amostra de envios */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const db = supabaseAdmin();
  const { data: campaign, error } = await db.from('campaigns').select('*').eq('id', params.id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  const { data: stats } = await db.rpc('campaign_stats', { p_campaign: params.id });
  const { data: sends } = await db
    .from('email_sends')
    .select('id, email, status, sent_at, bounced_at, opened_at, open_count, clicked_at, click_count, error')
    .eq('campaign_id', params.id)
    .order('sent_at', { ascending: false, nullsFirst: false })
    .limit(200);

  return NextResponse.json({ campaign, stats: stats?.[0] ?? null, sends: sends ?? [] });
}

/** POST /api/campaigns/:id → enfileira e dispara o primeiro lote */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { queued } = await enqueueCampaign(params.id);
    const batch = await processDispatchBatch();
    return NextResponse.json({ ok: true, queued, firstBatch: batch });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 400 });
  }
}

/**
 * DELETE /api/campaigns/:id — remove uma campanha.
 * - Rascunho / agendada / na fila: exclui de vez (e a fila de envios junto).
 * - Já enviada (ou enviando): NÃO apaga o histórico; marca como 'archived'
 *   (some da lista, mas o relatório de aberturas/cliques é preservado).
 */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const db = supabaseAdmin();

  const { data: campaign, error: findErr } = await db
    .from('campaigns')
    .select('id, status')
    .eq('id', params.id)
    .single();
  if (findErr) return NextResponse.json({ error: findErr.message }, { status: 404 });

  const jaEnviou = ['sending', 'sent'].includes(campaign.status);

  if (jaEnviou) {
    const { error } = await db.from('campaigns').update({ status: 'archived' }).eq('id', params.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, archived: true });
  }

  // rascunho/agendada/queued: apaga a fila de envios e a campanha
  await db.from('email_sends').delete().eq('campaign_id', params.id);
  const { error } = await db.from('campaigns').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, archived: false });
}
