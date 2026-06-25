'use client';

import { useState } from 'react';
import { useApi, api } from '../../lib/client-api';
import { useSelectedClient } from '../../lib/use-client';
import { ClientPicker } from '../../components/ClientPicker';
import { PageHeader, Card, Button, Field, Input, EmptyState } from '../../components/ui';
import { RichEditor } from '../../components/RichEditor';
import type { Template } from '../../types';

const STARTER_HTML = `<div style="font-family:Arial,sans-serif;color:#16151f">
  <h2 style="color:#e56d23">Olá, {{nome}}!</h2>
  <p>Mensagem da {{empresa}}. Use variáveis como {{nome}}, {{email}}
     ou colunas da planilha.</p>
  <p><a href="https://seu-site.com" style="color:#e56d23">Saiba mais</a></p>
  <p style="color:#888">{{assinatura}}</p>
</div>`;

export default function TemplatesPage() {
  const { clients, clientId, setClientId, loading: lc } = useSelectedClient();
  const { data, loading, reload } = useApi<{ templates: Template[] }>(clientId ? `/api/templates?clientId=${clientId}` : null);
  const templates = data?.templates ?? [];
  const [editing, setEditing] = useState<Template | 'new' | null>(null);

  return (
    <>
      <PageHeader
        title="Templates"
        subtitle="Modelos com variáveis do cliente e do contato"
        action={
          <div className="flex items-center gap-3">
            {!lc && <ClientPicker clients={clients} clientId={clientId} onChange={setClientId} />}
            {clientId && <Button onClick={() => setEditing('new')}>Novo template</Button>}
          </div>
        }
      />

      {!clientId ? (
        <EmptyState title="Selecione um cliente" description="Escolha um cliente para gerenciar os templates dele." />
      ) : editing ? (
        <Editor
          clientId={clientId}
          clientName={clients.find((c) => c.id === clientId)?.brand_name ?? 'Sua Empresa'}
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
            <Card key={t.id} className="flex flex-col p-5">
              <h3 className="font-display text-lg text-ink">{t.name}</h3>
              <p className="mt-1 line-clamp-1 text-sm text-ink/55">{t.subject}</p>
              <Button variant="ghost" onClick={() => setEditing(t)} className="mt-4">Editar</Button>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

function Editor({ clientId, clientName, template, onClose, onSaved }: {
  clientId: string; clientName: string; template: Template | null; onClose: () => void; onSaved: () => void;
}) {
  const [name, setName] = useState(template?.name ?? '');
  const [subject, setSubject] = useState(template?.subject ?? '');
  const [html, setHtml] = useState(template?.html ?? STARTER_HTML);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    if (!name.trim() || !subject.trim() || !html.trim()) { setErr('Preencha nome, assunto e conteúdo.'); return; }
    setBusy(true); setErr(null);
    try {
      const payload = { name: name.trim(), subject: subject.trim(), html };
      if (template) {
        await api(`/api/templates/${template.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      } else {
        await api('/api/templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId, ...payload }) });
      }
      onSaved();
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }

  const preview = html
    .replace(/\{\{\s*nome\s*\}\}/g, 'Maria')
    .replace(/\{\{\s*email\s*\}\}/g, 'maria@email.com')
    .replace(/\{\{\s*empresa\s*\}\}/g, clientName)
    .replace(/\{\{\s*assinatura\s*\}\}/g, `Equipe ${clientName}`);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="p-5">
        <h2 className="mb-4 font-display text-lg text-ink">{template ? 'Editar template' : 'Novo template'}</h2>
        <div className="space-y-4">
          <Field label="Nome interno"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Boas-vindas" /></Field>
          <Field label="Assunto" hint="Aceita variáveis, ex.: Novidades da {{empresa}}!"><Input value={subject} onChange={(e) => setSubject(e.target.value)} /></Field>
          <Field label="Conteúdo do e-mail" hint="Escreva como num editor de texto. Use a barra para formatar, inserir imagem ou variáveis.">
            <RichEditor value={html} onChange={setHtml} clientId={clientId} />
          </Field>
          <div className="flex gap-2">
            <Button onClick={save} disabled={busy}>{busy ? 'Salvando…' : 'Salvar template'}</Button>
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          </div>
          {err && <p className="text-sm text-red-600">{err}</p>}
        </div>
      </Card>
      <Card className="overflow-hidden">
        <div className="border-b border-[var(--border)] bg-stone-50 px-5 py-2.5 text-xs font-medium uppercase tracking-wide text-ink/45">Pré-visualização</div>
        <iframe title="preview" className="h-[520px] w-full bg-white" srcDoc={preview} />
      </Card>
    </div>
  );
}
