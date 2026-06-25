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
