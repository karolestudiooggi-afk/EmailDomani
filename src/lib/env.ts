import { z } from 'zod';

/**
 * Validação centralizada de env (server-only).
 * Cada cliente tem seu próprio SMTP (guardado no banco, criptografado), então
 * não há SMTP global. Cliente sem SMTP cadastrado roda em modo mock (loga).
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // URL pública — usada nos links de tracking (pixel/clique).
  APP_URL: z.string().url().default('http://localhost:3000'),

  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Chave de criptografia das senhas SMTP dos clientes (32 bytes hex ou base64).
  // Gere com:  openssl rand -hex 32
  ENCRYPTION_KEY: z.string().min(16).default('dev-only-key-troque-em-producao!!'),

  // Fila
  DISPATCH_BATCH_SIZE: z.coerce.number().int().positive().default(40),
  DAILY_SEND_LIMIT: z.coerce.number().int().positive().default(12000),

  // Protege o endpoint do cron.
  CRON_SECRET: z.string().optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Variáveis de ambiente inválidas:\n', parsed.error.flatten().fieldErrors);
  throw new Error('Configuração de ambiente inválida. Verifique seu .env');
}

export const env = parsed.data;
export type Env = typeof env;
