'use client';

import { useState } from 'react';
import { useApi, api } from '../../lib/client-api';
import { useSelectedClient } from '../../lib/use-client';
import { ClientPicker } from '../../components/ClientPicker';
import { PageHeader, Card, Button, Field, Input, StatusBadge, EmptyState } from '../../components/ui';
import type { Contact } from '../../types';

interface ListRow { id: string; name: string; created_at: string; count: number; }

export default function ContactsPage() {
  const { clients, clientId, setClientId, loading: lc } = useSelectedClient();
  const { data, loading, reload } = useApi<{ lists: ListRow[] }>(clientId ? `/api/lists?clientId=${clientId}` : null);
  const lists = data?.lists ?? [];
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <>
      <PageHeader
        title="Contatos"
        subtitle="Suba uma planilha para criar uma lista de disparo"
        action={!lc && <ClientPicker clients={clients} clientId={clientId} onChange={setClientId} />}
      />

      {!clientId ? (
        <EmptyState title="Selecione um cliente" description="Cadastre ou escolha um cliente para gerenciar os contatos dele." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
          <div className="space-y-6">
            <UploadCard clientId={clientId} onDone={reload} />
            <Card>
              <div className="border-b border-[var(--border)] px-5 py-3 text-xs font-medium uppercase tracking-wide text-ink/45">
                Listas ({lists.length})
              </div>
              {loading ? (
                <div className="p-5 text-sm text-ink/50">Carregando…</div>
              ) : lists.length === 0 ? (
                <div className="p-5 text-sm text-ink/50">Nenhuma lista ainda.</div>
              ) : (
                <ul>
                  {lists.map((l) => (
                    <li key={l.id}>
                      <button
                        onClick={() => setSelected(l.id)}
                        className={`flex w-full items-center justify-between px-5 py-3 text-left text-sm hover:bg-brand-50/50 ${selected === l.id ? 'bg-brand-50' : ''}`}
                      >
                        <span className="font-medium text-ink">{l.name}</span>
                        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-ink/60">{l.count} contatos</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
          <div>
            {selected ? (
              <ContactTable listId={selected} />
            ) : (
              <EmptyState title="Selecione uma lista" description="Clique numa lista à esquerda para ver os contatos importados." />
            )}
          </div>
        </div>
      )}
    </>
  );
}

function UploadCard({ clientId, onDone }: { clientId: string; onDone: () => void }) {
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    if (!file || !name.trim()) { setErr('Informe o nome da lista e escolha um arquivo.'); return; }
    setBusy(true); setErr(null); setMsg(null);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('name', name.trim());
      form.append('clientId', clientId);
      const res = await api<{ imported: number; skipped: number }>('/api/contacts', { method: 'POST', body: form });
      setMsg(`${res.imported} contatos importados${res.skipped ? `, ${res.skipped} ignorados` : ''}.`);
      setName(''); setFile(null); onDone();
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <Card className="p-5">
      <h2 className="mb-4 font-display text-lg text-ink">Importar contatos</h2>
      <div className="space-y-4">
        <Field label="Nome da lista">
          <Input placeholder="Ex.: Base Privillège — Junho" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Planilha (.csv ou .xlsx)" hint="Colunas reconhecidas: email, nome. Demais viram variáveis ({{unidade}}…).">
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-ink/70 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-600 hover:file:bg-brand-200"
          />
        </Field>
        <Button onClick={submit} disabled={busy} className="w-full">
          {busy ? 'Importando…' : 'Importar lista'}
        </Button>
        {msg && <p className="text-sm text-brand-600">{msg}</p>}
        {err && <p className="text-sm text-red-600">{err}</p>}
      </div>
    </Card>
  );
}

function ContactTable({ listId }: { listId: string }) {
  const { data, loading, reload } = useApi<{ contacts: Contact[] }>(`/api/contacts?listId=${listId}`);
  const contacts = data?.contacts ?? [];
  const [saving, setSaving] = useState<string | null>(null);

  async function toggle(c: Contact) {
    const next = c.status === 'active' ? 'unsubscribed' : 'active';
    setSaving(c.id);
    try {
      await api('/api/contacts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: c.id, status: next }),
      });
      reload();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSaving(null);
    }
  }

  if (loading) return <Card className="p-6 text-sm text-ink/50">Carregando contatos…</Card>;
  if (contacts.length === 0) return <EmptyState title="Lista vazia" description="Nenhum contato nesta lista." />;
  return (
    <Card>
      <div className="border-b border-[var(--border)] px-5 py-3 text-xs font-medium uppercase tracking-wide text-ink/45">
        Contatos ({contacts.length})
      </div>
      <div className="max-h-[560px] overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-white">
            <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wide text-ink/45">
              <th className="px-5 py-2.5 font-medium">E-mail</th>
              <th className="px-5 py-2.5 font-medium">Nome</th>
              <th className="px-5 py-2.5 font-medium">Status</th>
              <th className="px-5 py-2.5 font-medium text-right">Recebe?</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((c) => {
              const on = c.status === 'active';
              const bounced = c.status === 'bounced';
              return (
                <tr key={c.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="px-5 py-2.5 text-ink">{c.email}</td>
                  <td className="px-5 py-2.5 text-ink/70">{c.name ?? '—'}</td>
                  <td className="px-5 py-2.5"><StatusBadge status={c.status} /></td>
                  <td className="px-5 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => toggle(c)}
                      disabled={saving === c.id || bounced}
                      title={bounced ? 'Bounce: e-mail recusado pelo servidor' : on ? 'Recebendo — clique para descadastrar' : 'Descadastrado — clique para reativar'}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-40 ${on ? 'bg-emerald-500' : 'bg-stone-300'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${on ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
