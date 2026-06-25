import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const BUCKET = 'email-assets'; // precisa ser PÚBLICO no Supabase

/** POST /api/upload (multipart, campo "file") → sobe imagem e devolve URL pública. */
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get('file');
    const clientId = String(form.get('clientId') ?? 'geral');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Envie um arquivo no campo "file".' }, { status: 400 });
    }
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Apenas imagens são aceitas.' }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Imagem muito grande (máx. 5MB).' }, { status: 400 });
    }

    const db = supabaseAdmin();
    const ext = file.name.split('.').pop() || 'png';
    const path = `${clientId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error } = await db.storage.from(BUCKET).upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });
    if (error) {
      return NextResponse.json(
        { error: `Falha ao subir: ${error.message}. Crie um bucket PÚBLICO chamado "email-assets" no Supabase Storage.` },
        { status: 500 },
      );
    }

    const { data } = db.storage.from(BUCKET).getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
