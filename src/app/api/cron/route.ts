import { NextResponse } from 'next/server';
import { processDispatchBatch } from '../../../services/dispatch.service';
import { env } from '../../../lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Sem limite prático na VPS (essa linha só vale na Vercel).
export const maxDuration = 300;

/** Chamado pelo cron do sistema (crontab) e pelo botão "processar fila". */
export async function GET(req: Request) {
  if (env.CRON_SECRET) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
  }
  try {
    return NextResponse.json({ ok: true, ...(await processDispatchBatch()) });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}