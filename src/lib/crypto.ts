import crypto from 'crypto';
import { env } from './env';

/**
 * Criptografia simétrica (AES-256-GCM) para guardar a senha SMTP de cada
 * cliente. A chave vem de ENCRYPTION_KEY (32 bytes em base64 ou hex).
 * Formato armazenado: base64(iv).base64(tag).base64(ciphertext)
 */
function key(): Buffer {
  const raw = env.ENCRYPTION_KEY ?? '';
  // aceita hex (64 chars) ou base64; cai pra derivação por hash se vier curto
  let k: Buffer;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) k = Buffer.from(raw, 'hex');
  else k = Buffer.from(raw, 'base64');
  if (k.length !== 32) k = crypto.createHash('sha256').update(raw).digest();
  return k;
}

export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${tag.toString('base64')}.${enc.toString('base64')}`;
}

export function decrypt(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split('.');
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key(),
    Buffer.from(ivB64, 'base64'),
  );
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const dec = Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]);
  return dec.toString('utf8');
}
