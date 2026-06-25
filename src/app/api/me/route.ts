import { NextResponse } from 'next/server';
import { currentUser } from '../../../lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/me → usuário atual + papel (usado pela UI para ajustar permissões). */
export async function GET() {
  const me = await currentUser();
  if (!me) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ user: me });
}
