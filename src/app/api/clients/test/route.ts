import { NextResponse } from 'next/server';
import { verifyAgencySmtp } from '../../../../lib/email/transporter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/clients/test — testa o SMTP da AGÊNCIA (configurado no .env). */
export async function POST() {
  const result = await verifyAgencySmtp();
  return NextResponse.json(result);
}
