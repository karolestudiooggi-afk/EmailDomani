import { NextResponse } from 'next/server';
import { importContactsFromBuffer } from '../../../services/contacts.service';
import { supabaseAdmin } from '../../../lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** GET /api/contacts?listId=  → contatos de uma lista */
export async function GET(req: Request) {
  const listId = new URL(req.url).searchParams.get('listId');
  if (!listId) return NextResponse.json({ error: 'listId é obrigatório' }, { status: 400 });
  const db = supabaseAdmin();
  const { data, error } = await db
    .from('contacts')
    .select('id, email, name, fields, status, created_at')
    .eq('list_id', listId)
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ contacts: data ?? [] });
}

/** POST /api/contacts (multipart) → importa planilha e cria a lista */
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get('file');
    const listName = String(form.get('name') ?? '').trim();
    const clientId = String(form.get('clientId') ?? '').trim();

    if (!(file instanceof File)) return NextResponse.json({ error: 'Envie um arquivo no campo "file".' }, { status: 400 });
    if (!listName) return NextResponse.json({ error: 'Informe o nome da lista.' }, { status: 400 });
    if (!clientId) return NextResponse.json({ error: 'Selecione um cliente.' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    let storedPath: string | undefined;
    try {
      const db = supabaseAdmin();
      const path = `${clientId}/${Date.now()}-${file.name}`;
      const { error } = await db.storage.from('imports').upload(path, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });
      if (!error) storedPath = path;
    } catch { /* bucket pode não existir */ }

    const result = await importContactsFromBuffer(buffer, clientId, listName, storedPath);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}

/** PATCH /api/contacts → altera o status de um contato (ativo/descadastrado). */
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const id = String(body.id ?? '');
    const status = String(body.status ?? '');
    if (!id || !['active', 'unsubscribed'].includes(status)) {
      return NextResponse.json({ error: 'id e status (active|unsubscribed) são obrigatórios.' }, { status: 400 });
    }
    const db = supabaseAdmin();
    const { error } = await db.from('contacts').update({ status }).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
