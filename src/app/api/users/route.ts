import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '../../../lib/supabase/server';
import { requireAdmin } from '../../../lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/users → lista de usuários e papéis (somente admin). */
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
  }
  const db = supabaseAdmin();
  const { data, error } = await db
    .from('profiles')
    .select('id, email, role, created_at')
    .order('created_at', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ users: data ?? [] });
}

const patchSchema = z.object({ id: z.string().uuid(), role: z.enum(['admin', 'operator']) });

/** PATCH /api/users → altera o papel de um usuário (somente admin). */
export async function PATCH(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
  }
  const body = patchSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
  const db = supabaseAdmin();
  const { error } = await db.from('profiles').update({ role: body.data.role }).eq('id', body.data.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
