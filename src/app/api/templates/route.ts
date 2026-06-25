import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '../../../lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const clientId = new URL(req.url).searchParams.get('clientId');
  const db = supabaseAdmin();
  let q = db.from('templates').select('*').order('updated_at', { ascending: false });
  if (clientId) q = q.eq('client_id', clientId);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ templates: data ?? [] });
}

const createSchema = z.object({
  clientId: z.string().uuid(),
  name: z.string().min(1),
  subject: z.string().min(1),
  html: z.string().min(1),
});

export async function POST(req: Request) {
  const body = createSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  const db = supabaseAdmin();
  const { clientId, ...rest } = body.data;
  const { data, error } = await db.from('templates').insert({ client_id: clientId, ...rest }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ template: data });
}
