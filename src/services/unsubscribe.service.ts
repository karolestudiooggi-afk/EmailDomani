import { supabaseAdmin } from '../lib/supabase/server';

/**
 * Marca como descadastrado o contato dono de um envio.
 * O token do link é o próprio id do envio (UUID v4, não adivinhável), que
 * resolve o contato. O contato sai de todos os disparos futuros.
 */
export async function unsubscribeBySend(sendId: string): Promise<{ ok: boolean }> {
  const db = supabaseAdmin();
  const { data: send } = await db
    .from('email_sends')
    .select('contact_id')
    .eq('id', sendId)
    .single();
  if (!send?.contact_id) return { ok: false };
  await db.from('contacts').update({ status: 'unsubscribed' }).eq('id', send.contact_id);
  return { ok: true };
}
