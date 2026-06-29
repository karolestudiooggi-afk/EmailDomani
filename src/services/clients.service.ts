import { supabaseAdmin } from '../lib/supabase/server';
import type { Client } from '../types';

// Colunas seguras de expor ao front. O SMTP agora é único (da agência, no .env),
// então o cliente guarda só identidade e remetente.
const PUBLIC_COLS =
  'id, name, brand_name, from_name, from_email, daily_limit, brand_fields, created_at';

export interface ClientInput {
  name: string;
  brandName: string;
  fromName: string;
  fromEmail: string;
  dailyLimit?: number;
  brandFields?: Record<string, string>;
}

function toRow(input: ClientInput) {
  return {
    name: input.name,
    brand_name: input.brandName,
    from_name: input.fromName,
    from_email: input.fromEmail,
    daily_limit: input.dailyLimit ?? 2000,
    brand_fields: input.brandFields ?? {},
  };
}

export async function listClients(): Promise<Client[]> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from('clients')
    .select(PUBLIC_COLS)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Client[];
}

export async function getClient(id: string): Promise<Client> {
  const db = supabaseAdmin();
  const { data, error } = await db.from('clients').select(PUBLIC_COLS).eq('id', id).single();
  if (error) throw error;
  return data as Client;
}

export async function createClient(input: ClientInput): Promise<Client> {
  const db = supabaseAdmin();
  const { data, error } = await db.from('clients').insert(toRow(input)).select(PUBLIC_COLS).single();
  if (error) throw error;
  return data as Client;
}

export async function updateClient(id: string, input: ClientInput): Promise<Client> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from('clients')
    .update(toRow(input))
    .eq('id', id)
    .select(PUBLIC_COLS)
    .single();
  if (error) throw error;
  return data as Client;
}
