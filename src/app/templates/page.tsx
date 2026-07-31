'use client';

import { useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useApi, api } from '../../lib/client-api';
import { useSelectedClient } from '../../lib/use-client';
import { ClientPicker } from '../../components/ClientPicker';
import { PageHeader, Card, Button, Field, Input, EmptyState } from '../../components/ui';
import type { Template } from '../../types';
import type { BlockEditorApi } from '../../components/BlockEditor';

const BlockEditor = dynamic(() => import('../../components/BlockEditor'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[560px] items-center justify-center rounded-lg border border-[var(--border)] bg-stone-50 text-sm text-ink/50">
      Carregando editor…
    </div>
  ),
});

export default function TemplatesPage() {
  const { clients, clientId, setClientId, loading: lc } = useSelectedClient();
  const { data, loading, reload } = useApi<{ templates: Template[] }>(clientId ? `/api/templates?clientId=${clientId}` : null);
  const templates = data?.templates ?? [];
  const [editing, setEditing] = useState<Template | 'new' | null>(null);

  return (
    <>
      <PageHeader
        title="Templates"
        subtitle="Modelos de e-mail com blocos, imagens e variáveis"
        action={
          <div className="flex items-center gap-3">
            {!lc && <ClientPicker clients={clients} clientId={clientId} onChange={setClientId} />}
            {clientId && !editing && <Button onClick={() => setEditing('new')}>Novo template</Button>}
          </div>
        }
      />

      {!clientId ? (
        <EmptyState title="Selecione um cliente" description="Escolha um cliente para gerenciar os templates dele." />
      ) : editing ? (
        <Editor
          clientId={clientId}
          template={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); reload(); }}
        />
      ) : loading ? (
        <Card className="p-6 text-sm text-ink/50">Carregando…</Card>
      ) : templates.length === 0 ? (
        <EmptyState title="Nenhum template" description="Crie um modelo reutilizável para este cliente." action={<Button onClick={() => setEditing('new')}>Criar template</Button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <TemplateCard key={t.id} t={t} onEdit={() => setEditing(t)} onDeleted={reload} />
          ))}
        </div>
      )}
    </>
  );
}

function TemplateCard({ t, onEdit, onDeleted }: { t: Template; onEdit: () => void; onDeleted: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function remove() {
    setBusy(true); setErr(null);
    try {
      await api(`/api/templates/${t.id}`, { method: 'DELETE' });
      onDeleted();
    } catch (e) {
      setErr((e as Error).message);
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="flex flex-col p-5">
      <h3 className="font-display text-lg text-ink">{t.name}</h3>
      <p className="mt-1 line-clamp-1 text-sm text-ink/55">{t.subject}</p>

      {err && <p className="mt-2 text-xs text-red-600">{err}</p>}

      {confirming ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3">
          <p className="text-xs text-red-700">Excluir <strong>{t.name}</strong>? Não pode ser desfeito.</p>
          <div className="mt-2 flex gap-2">
            <Button variant="ghost" onClick={() => setConfirming(false)} className="flex-1">Cancelar</Button>
            <button
              onClick={remove}
              disabled={busy}
              className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              {busy ? 'Excluindo…' : 'Excluir'}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex gap-2">
          <Button variant="ghost" onClick={onEdit} className="flex-1">Editar</Button>
          <button
            onClick={() => setConfirming(true)}
            title="Excluir template"
            className="rounded-lg border border-line/30 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
          >
            Excluir
          </button>
        </div>
      )}
    </Card>
  );
}

function Editor({ clientId, template, onClose, onSaved }: {
  clientId: string; template: Template | null; onClose: () => void; onSaved: () => void;
}) {
  const [name, setName] = useState(template?.name ?? '');
  const [subject, setSubject] = useState(template?.subject ?? '');
  const apiRef = useRef<BlockEditorApi | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    if (!name.trim() || !subject.trim()) { setErr('Preencha nome e assunto.'); return; }
    if (!apiRef.current) { setErr('O editor ainda está carregando, aguarde um instante.'); return; }
    setBusy(true); setErr(null);
    try {
      const { html, design } = await apiRef.current.exportHtml();
      const payload = { name: name.trim(), subject: subject.trim(), html, design };
      if (template) {
        await api(`/api/templates/${template.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      } else {
        await api('/api/templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId, ...payload }) });
      }
      onSaved();
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg text-ink">{template ? 'Editar template' : 'Novo template'}</h2>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={busy}>{busy ? 'Salvando…' : 'Salvar template'}</Button>
        </div>
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <Field label="Nome interno"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Boas-vindas" /></Field>
        <Field label="Assunto" hint="Aceita variáveis, ex.: Novidades da {{empresa}}!"><Input value={subject} onChange={(e) => setSubject(e.target.value)} /></Field>
      </div>

      <Field label="Conteúdo do e-mail" hint="Arraste blocos (imagem, botão, colunas). As imagens sobem para o seu armazenamento.">
        <BlockEditor clientId={clientId} initialDesign={template?.design ?? null} onReady={(a) => { apiRef.current = a; }} />
      </Field>

      {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
    </Card>
  );
}
