import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifySmtp } from '../../../../lib/email/transporter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  host: z.string().min(1),
  port: z.coerce.number().int().positive(),
  secure: z.boolean(),
  user: z.string().min(1),
  pass: z.string().min(1),
});

/** POST /api/clients/test — verifica se as credenciais SMTP conectam. */
export async function POST(req: Request) {
  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ ok: false, error: 'Dados incompletos' }, { status: 400 });
  const result = await verifySmtp(body.data);
  return NextResponse.json(result);
}
