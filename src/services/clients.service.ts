import { supabaseAdmin } from '../lib/supabase/server';
import { encrypt } from '../lib/crypto';
import type { Client } from '../types';

// Colunas seguras de expor ao front (sem a senha).
const PUBLIC_COLS =
  'id, name, brand_name, from_name, from_email, smtp_host, smtp_port, smtp_secure, smtp_user, daily_limit, brand_fields, created_at';

export interface ClientInput {
  name: string;
  brandName: string;
  fromName: string;
  fromEmail: string;
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpSecure?: boolean | null;
  smtpUser?: string | null;
  smtpPass?: string | null; // texto puro — será criptografado aqui
  dailyLimit?: number;
  brandFields?: Record<string, string>;
}

function toRow(input: ClientInput) {
  const row: Record<string, unknown> = {
    name: input.name,
    brand_name: input.brandName,
    from_name: input.fromName,
    from_email: input.fromEmail,
    smtp_host: input.smtpHost ?? null,
    smtp_port: input.smtpPort ?? 587,
    smtp_secure: input.smtpSecure ?? false,
    smtp_user: input.smtpUser ?? null,
    daily_limit: input.dailyLimit ?? 2000,
    brand_fields: input.brandFields ?? {},
  };
  // só sobrescreve a senha se veio uma nova (não apaga ao editar sem mexer nela)
  if (input.smtpPass) row.smtp_pass_enc = encrypt(input.smtpPass);
  return row;
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
