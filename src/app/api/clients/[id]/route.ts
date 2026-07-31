import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getClient, updateClient } from '../../../../services/clients.service';
import { supabaseAdmin } from '../../../../lib/supabase/server';
import { requireAdmin } from '../../../../lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    return NextResponse.json({ client: await getClient(params.id) });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 404 });
  }
}

const schema = z.object({
  name: z.string().min(1),
  brandName: z.string().min(1),
  fromName: z.string().min(1),
  fromEmail: z.string().email(),
  dailyLimit: z.coerce.number().int().positive().optional(),
  brandFields: z.record(z.string()).optional(),
});

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Apenas administradores podem editar clientes.' }, { status: 403 });
  }
  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  try {
    return NextResponse.json({ client: await updateClient(params.id, body.data) });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

/**
 * DELETE /api/clients/:id — exclui um cliente.
 * Só admin. Bloqueia se o cliente ainda tiver campanhas ou listas (evita apagar
 * histórico/dados em cascata sem querer). O usuário remove esses itens antes.
 */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Apenas administradores podem excluir clientes.' }, { status: 403 });
  }
  const db = supabaseAdmin();

  const { count: campCount } = await db
    .from('campaigns')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', params.id);
  if ((campCount ?? 0) > 0) {
    return NextResponse.json(
      { error: `Este cliente tem ${campCount} campanha(s). Exclua as campanhas antes de remover o cliente.` },
      { status: 409 },
    );
  }

  const { count: listCount } = await db
    .from('contact_lists')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', params.id);
  if ((listCount ?? 0) > 0) {
    return NextResponse.json(
      { error: `Este cliente tem ${listCount} lista(s) de contatos. Exclua as listas antes de remover o cliente.` },
      { status: 409 },
    );
  }

  const { error } = await db.from('clients').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
