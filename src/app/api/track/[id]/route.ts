import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GIF transparente 1x1
const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

/**
 * GET /api/track/:id          → registra abertura, devolve o pixel
 * GET /api/track/:id?to=<url> → registra clique e redireciona para <url>
 */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const to = new URL(req.url).searchParams.get('to');
  const isClick = !!to;

  try {
    const db = supabaseAdmin();
    const now = new Date().toISOString();

    await db.from('email_events').insert({
      send_id: params.id,
      type: isClick ? 'click' : 'open',
      url: to ?? null,
      user_agent: req.headers.get('user-agent'),
      ip: req.headers.get('x-forwarded-for'),
    });

    const { data: row } = await db
      .from('email_sends')
      .select('open_count, opened_at, click_count, clicked_at')
      .eq('id', params.id)
      .single();

    if (row) {
      const patch: Record<string, unknown> = isClick
        ? { click_count: (row.click_count ?? 0) + 1, clicked_at: row.clicked_at ?? now, opened_at: row.opened_at ?? now }
        : { open_count: (row.open_count ?? 0) + 1, opened_at: row.opened_at ?? now };
      await db.from('email_sends').update(patch).eq('id', params.id);
    }
  } catch (err) {
    console.error('[track]', err);
  }

  if (isClick) {
    try {
      return NextResponse.redirect(new URL(to!).toString(), 302);
    } catch {
      return NextResponse.json({ error: 'URL inválida' }, { status: 400 });
    }
  }
  return new Response(PIXEL, { headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-store, max-age=0' } });
}
