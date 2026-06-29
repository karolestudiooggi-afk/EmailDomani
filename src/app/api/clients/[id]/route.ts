import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getClient, updateClient } from '../../../../services/clients.service';
import { requireAdmin } from '../../../../lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    return NextResponse.json({ client: await getClient(params.id) });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 404 });
  }
}

const schema = z.object({
  name: z.string().min(1),
  brandName: z.string().min(1),
  fromName: z.string().min(1),
  fromEmail: z.string().email(),
  dailyLimit: z.coerce.number().int().positive().optional(),
  brandFields: z.record(z.string()).optional(),
});

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Apenas administradores podem editar clientes.' }, { status: 403 });
  }
  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  try {
    return NextResponse.json({ client: await updateClient(params.id, body.data) });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
