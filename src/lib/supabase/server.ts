import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../env';

/**
 * Client de servidor com service_role.
 * NUNCA importar em componentes client — ignora RLS e tem acesso total.
 * Use somente em route handlers / server actions / services.
 */
let cached: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (cached) return cached;
  cached = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
