import { z } from 'zod';

/**
 * Validação centralizada de env (server-only).
 * SMTP ÚNICO DA AGÊNCIA (uma conta SendPulse com vários domínios). Cada cliente
 * só define o remetente (from_name/from_email); o transporte é o mesmo pra todos.
 * Sem SMTP_HOST → modo mock (loga, não envia).
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // URL pública — usada nos links de tracking (pixel/clique).
  APP_URL: z.string().url().default('http://localhost:3000'),

  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // SMTP da agência (conta SendPulse). Sem host → mock.
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z.coerce.boolean().default(false), // 465 = true; 587 = false (STARTTLS)
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),

  // Chave de criptografia (mantida p/ compatibilidade; não mais usada no envio).
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
