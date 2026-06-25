import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { supabaseAdmin } from './supabase/server';

type Role = 'admin' | 'operator';

/** Client do Supabase ligado aos cookies da requisição (identidade do usuário). */
function serverClient() {
  const store = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return store.getAll();
        },
        setAll(list: { name: string; value: string; options?: CookieOptions }[]) {
          try {
            list.forEach(({ name, value, options }) => store.set(name, value, options));
          } catch {
            /* em alguns contextos o store é só-leitura — ok p/ checagem */
          }
        },
      },
    },
  );
}

export async function getUser() {
  const {
    data: { user },
  } = await serverClient().auth.getUser();
  return user;
}

/**
 * Retorna o papel do usuário, criando o perfil se ainda não existir.
 * Se não houver nenhum perfil, o primeiro vira 'admin'.
 */
export async function ensureRole(userId: string, email?: string | null): Promise<Role> {
  const db = supabaseAdmin();
  const { data: existing } = await db.from('profiles').select('role').eq('id', userId).single();
  if (existing) return existing.role as Role;

  const { count } = await db.from('profiles').select('id', { count: 'exact', head: true });
  const role: Role = (count ?? 0) === 0 ? 'admin' : 'operator';
  await db.from('profiles').insert({ id: userId, email: email ?? null, role });
  return role;
}

/** Usuário atual + papel, ou null se não autenticado. */
export async function currentUser(): Promise<{ id: string; email: string | null; role: Role } | null> {
  const user = await getUser();
  if (!user) return null;
  const role = await ensureRole(user.id, user.email);
  return { id: user.id, email: user.email ?? null, role };
}

/** Garante que o chamador é admin. Lança erro 'forbidden' se não for. */
export async function requireAdmin(): Promise<void> {
  const me = await currentUser();
  if (!me || me.role !== 'admin') throw new Error('forbidden');
}
