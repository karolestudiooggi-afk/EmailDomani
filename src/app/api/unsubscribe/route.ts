import { NextResponse } from 'next/server';
import { unsubscribeBySend } from '../../../services/unsubscribe.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/unsubscribe?s=ID  → descadastro "one-click" do Gmail/Yahoo
 * (acionado pelo header List-Unsubscribe-Post: List-Unsubscribe=One-Click).
 */
export async function POST(req: Request) {
  const s = new URL(req.url).searchParams.get('s');
  if (s) await unsubscribeBySend(s).catch(() => null);
  return NextResponse.json({ ok: true });
}
