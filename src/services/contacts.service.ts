import * as XLSX from 'xlsx';
import { supabaseAdmin } from '../lib/supabase/server';

const EMAIL_KEYS = ['email', 'e-mail', 'mail'];
const NAME_KEYS = ['nome', 'name', 'cliente'];
const norm = (s: string) => s.trim().toLowerCase();
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

function pick(row: Record<string, unknown>, candidates: string[]): string | null {
  for (const key of Object.keys(row)) {
    if (candidates.includes(norm(key))) {
      const v = row[key];
      return v == null ? null : String(v).trim();
    }
  }
  return null;
}

export interface ImportResult {
  listId: string;
  imported: number;
  skipped: number;
}

/** Lê a planilha (xlsx/csv), cria a lista (do cliente) e insere os contatos. */
export async function importContactsFromBuffer(
  buffer: Buffer,
  clientId: string,
  listName: string,
  sourceFile?: string,
): Promise<ImportResult> {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

  const db = supabaseAdmin();
  const { data: list, error: listErr } = await db
    .from('contact_lists')
    .insert({ client_id: clientId, name: listName, source_file: sourceFile ?? null })
    .select()
    .single();
  if (listErr) throw listErr;

  const seen = new Set<string>();
  const toInsert: Array<{ list_id: string; email: string; name: string | null; fields: Record<string, string> }> = [];
  let skipped = 0;

  for (const row of rows) {
    const email = pick(row, EMAIL_KEYS);
    if (!email || !isEmail(email) || seen.has(norm(email))) {
      skipped++;
      continue;
    }
    seen.add(norm(email));
    const name = pick(row, NAME_KEYS);
    const fields: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) {
      const nk = norm(k);
      if (EMAIL_KEYS.includes(nk) || NAME_KEYS.includes(nk)) continue;
      if (v !== '' && v != null) fields[nk] = String(v).trim();
    }
    toInsert.push({ list_id: list.id, email: norm(email), name, fields });
  }

  let imported = 0;
  for (let i = 0; i < toInsert.length; i += 1000) {
    const chunk = toInsert.slice(i, i + 1000);
    const { error } = await db
      .from('contacts')
      .upsert(chunk, { onConflict: 'list_id,email', ignoreDuplicates: true });
    if (error) throw error;
    imported += chunk.length;
  }
  return { listId: list.id, imported, skipped };
}
