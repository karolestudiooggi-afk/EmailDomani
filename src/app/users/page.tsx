'use client';

import { useApi, api } from '../../lib/client-api';
import { useMe } from '../../lib/use-me';
import { PageHeader, Card, EmptyState, Select } from '../../components/ui';
import type { Profile } from '../../types';

export default function UsersPage() {
  const { isAdmin, loading: lm } = useMe();
  const { data, loading, reload } = useApi<{ users: Profile[] }>('/api/users');
  const users = data?.users ?? [];

  async function setRole(id: string, role: 'admin' | 'operator') {
    try {
      await api('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, role }),
      });
      reload();
    } catch (e) {
      alert((e as Error).message);
    }
  }

  if (!lm && !isAdmin) {
    return (
      <>
        <PageHeader title="Usuários" />
        <EmptyState title="Acesso restrito" description="Apenas administradores podem gerenciar usuários." />
      </>
    );
  }

  return (
    <>
      <PageHeader title="Usuários" subtitle="Quem acessa a plataforma e com qual papel" />
      {loading ? (
        <Card className="p-6 text-sm text-ink/50">Carregando…</Card>
      ) : (
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wide text-ink/45">
                <th className="px-5 py-3 font-medium">E-mail</th>
                <th className="px-5 py-3 font-medium">Papel</th>
                <th className="px-5 py-3 font-medium text-right">Alterar</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="px-5 py-3 text-ink">{u.email ?? '—'}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${u.role === 'admin' ? 'bg-brand-100 text-brand-700' : 'bg-stone-100 text-stone-600'}`}>
                      {u.role === 'admin' ? 'Administrador' : 'Operador'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Select
                      value={u.role}
                      onChange={(v) => setRole(u.id, v as 'admin' | 'operator')}
                      options={[
                        { value: 'operator', label: 'Operador' },
                        { value: 'admin', label: 'Administrador' },
                      ]}
                      className="inline-block min-w-[150px] text-left"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <p className="mt-4 text-xs text-ink/45">
        Operadores disparam campanhas, gerenciam contatos e templates. Administradores
        também cadastram clientes e usuários. Novos usuários são criados no painel do
        Supabase (Authentication → Users) e entram como operador.
      </p>
    </>
  );
}
