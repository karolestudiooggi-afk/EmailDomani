import { NextResponse } from 'next/server';
import { z } from 'zod';
import { listClients, createClient } from '../../../services/clients.service';
import { requireAdmin } from '../../../lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json({ clients: await listClients() });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

const schema = z.object({
  name: z.string().min(1),
  brandName: z.string().min(1),
  fromName: z.string().min(1),
  fromEmail: z.string().email(),
  smtpHost: z.string().nullable().optional(),
  smtpPort: z.coerce.number().int().positive().nullable().optional(),
  smtpSecure: z.boolean().nullable().optional(),
  smtpUser: z.string().nullable().optional(),
  smtpPass: z.string().nullable().optional(),
  dailyLimit: z.coerce.number().int().positive().optional(),
  brandFields: z.record(z.string()).optional(),
});

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Apenas administradores podem cadastrar clientes.' }, { status: 403 });
  }
  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  try {
    return NextResponse.json({ client: await createClient(body.data) });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
