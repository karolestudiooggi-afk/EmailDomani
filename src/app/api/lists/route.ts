import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const clientId = new URL(req.url).searchParams.get('clientId');
  const db = supabaseAdmin();
  let q = db.from('contact_lists').select('id, name, created_at, client_id').order('created_at', { ascending: false });
  if (clientId) q = q.eq('client_id', clientId);
  const { data: lists, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Contagem por lista, resiliente: se uma contagem falhar, devolve 0 em vez de
  // derrubar a resposta inteira (a lista ainda aparece na tela).
  const withCounts = await Promise.all(
    (lists ?? []).map(async (l) => {
      try {
        const { count } = await db
          .from('contacts')
          .select('id', { count: 'exact', head: true })
          .eq('list_id', l.id);
        return { ...l, count: count ?? 0 };
      } catch {
        return { ...l, count: 0 };
      }
    }),
  );
  return NextResponse.json({ lists: withCounts });
}
