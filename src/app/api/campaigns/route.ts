import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '../../../lib/supabase/server';
import { createCampaign } from '../../../services/campaigns.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const clientId = new URL(req.url).searchParams.get('clientId');
  const db = supabaseAdmin();
  let q = db
    .from('campaigns')
    .select('id, name, status, created_at, from_email, subject, client_id')
    .neq('status', 'archived')
    .order('created_at', { ascending: false });
  if (clientId) q = q.eq('client_id', clientId);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const withStats = await Promise.all(
    (data ?? []).map(async (c) => {
      const { data: stats } = await db.rpc('campaign_stats', { p_campaign: c.id });
      return { ...c, stats: stats?.[0] ?? null };
    }),
  );
  return NextResponse.json({ campaigns: withStats });
}

const schema = z.object({
  clientId: z.string().uuid(),
  name: z.string().min(1),
  listId: z.string().uuid(),
  templateId: z.string().uuid().nullable().optional(),
  subject: z.string().min(1),
  html: z.string().min(1),
  fromName: z.string().min(1),
  fromEmail: z.string().email(),
  scheduledAt: z.string().datetime().nullable().optional(),
});

export async function POST(req: Request) {
  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  try {
    return NextResponse.json({ campaign: await createCampaign(body.data) });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
