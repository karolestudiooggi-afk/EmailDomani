'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApi, api } from '../../../lib/client-api';
import { useSelectedClient } from '../../../lib/use-client';
import { ClientPicker } from '../../../components/ClientPicker';
import { PageHeader, Card, Button, Field, Input, EmptyState } from '../../../components/ui';
import type { Template } from '../../../types';

interface ListRow { id: string; name: string; count: number; }

export default function NewCampaignPage() {
  const router = useRouter();
  const { clients, clientId, setClientId, selected, loading: lc } = useSelectedClient();
  const { data: listsData } = useApi<{ lists: ListRow[] }>(clientId ? `/api/lists?clientId=${clientId}` : null);
  const { data: tplData } = useApi<{ templates: Template[] }>(clientId ? `/api/templates?clientId=${clientId}` : null);
  const lists = listsData?.lists ?? [];
  const templates = tplData?.templates ?? [];

  const [name, setName] = useState('');
  const [listId, setListId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [subject, setSubject] = useState('');
  const [html, setHtml] = useState('');
  const [fromName, setFromName] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // remetente puxa do cliente selecionado
  useEffect(() => {
    if (selected) { setFromName(selected.from_name); setFromEmail(selected.from_email); }
  }, [selected]);

  function applyTemplate(id: string) {
    setTemplateId(id);
    const t = templates.find((x) => x.id === id);
    if (t) { setSubject(t.subject); setHtml(t.html); }
  }

  const selectedList = lists.find((l) => l.id === listId);

  async function submit(mode: 'now' | 'schedule' | 'draft') {
    if (!clientId || !name.trim() || !listId || !subject.trim() || !html.trim() || !fromEmail.trim()) {
      setErr('Preencha cliente, nome, lista, remetente, assunto e conteúdo.'); return;
    }
    if (mode === 'schedule' && !scheduledAt) { setErr('Escolha a data e a hora do agendamento.'); return; }
    setBusy(true); setErr(null);
    try {
      const iso = mode === 'schedule' ? new Date(scheduledAt).toISOString() : null;
      const { campaign } = await api<{ campaign: { id: string } }>('/api/campaigns', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId, name: name.trim(), listId, templateId: templateId || null,
          subject: subject.trim(), html, fromName: fromName.trim(), fromEmail: fromEmail.trim(),
          scheduledAt: iso,
        }),
      });
      if (mode === 'now') await api(`/api/campaigns/${campaign.id}`, { method: 'POST' });
      router.push(`/campaigns/${campaign.id}`);
    } catch (e) { setErr((e as Error).message); setBusy(false); }
  }

  const preview = html
    .replace(/\{\{\s*nome\s*\}\}/g, 'Maria')
    .replace(/\{\{\s*empresa\s*\}\}/g, selected?.brand_name ?? 'Empresa')
    .replace(/\{\{\s*assinatura\s*\}\}/g, selected?.brand_fields?.assinatura ?? '');

  return (
    <>
      <PageHeader
        title="Nova campanha"
        subtitle="Configure e dispare pelo SMTP do cliente"
        action={!lc && <ClientPicker clients={clients} clientId={clientId} onChange={setClientId} />}
      />

      {!clientId ? (
        <EmptyState title="Selecione um cliente" description="Escolha o cliente que vai disparar esta campanha." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <Card className="p-5">
              <h2 className="mb-4 font-display text-lg text-ink">1. Destinatários</h2>
              <div className="space-y-4">
                <Field label="Nome da campanha"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Newsletter de Junho" /></Field>
                <Field label="Lista de contatos">
                  <select value={listId} onChange={(e) => setListId(e.target.value)}
                    className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-ink focus:border-brand-400">
                    <option value="">Selecione uma lista…</option>
                    {lists.map((l) => <option key={l.id} value={l.id}>{l.name} ({l.count} contatos)</option>)}
                  </select>
                </Field>
                {selectedList && <p className="text-sm text-brand-600">Vai para <strong>{selectedList.count}</strong> contatos.</p>}
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="mb-4 font-display text-lg text-ink">2. Remetente</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nome"><Input value={fromName} onChange={(e) => setFromName(e.target.value)} /></Field>
                <Field label="E-mail"><Input value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} /></Field>
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="mb-4 font-display text-lg text-ink">3. Mensagem</h2>
              <div className="space-y-4">
                <Field label="Usar template (opcional)">
                  <select value={templateId} onChange={(e) => applyTemplate(e.target.value)}
                    className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-ink focus:border-brand-400">
                    <option value="">Escrever do zero…</option>
                    {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </Field>
                <Field label="Assunto"><Input value={subject} onChange={(e) => setSubject(e.target.value)} /></Field>
                <Field label="Conteúdo HTML" hint="Variáveis: {{nome}}, {{email}}, {{empresa}}, {{assinatura}} e colunas da planilha.">
                  <textarea value={html} onChange={(e) => setHtml(e.target.value)} rows={10}
                    className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 font-mono text-xs text-ink focus:border-brand-400" placeholder="<h2>Olá, {{nome}}!</h2>" />
                </Field>
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="mb-4 font-display text-lg text-ink">4. Quando enviar</h2>
              <Field label="Agendar para (opcional)" hint="Deixe vazio para disparar na hora. Agendado, o envio começa sozinho no horário.">
                <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
              </Field>
            </Card>

            {err && <p className="text-sm text-red-600">{err}</p>}
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => submit('now')} disabled={busy}>{busy ? 'Processando…' : 'Disparar agora'}</Button>
              <Button variant="ghost" onClick={() => submit('schedule')} disabled={busy || !scheduledAt}>Agendar</Button>
              <Button variant="ghost" onClick={() => submit('draft')} disabled={busy}>Salvar rascunho</Button>
            </div>
          </div>

          <div className="lg:sticky lg:top-10 lg:self-start">
            <Card className="overflow-hidden">
              <div className="border-b border-[var(--border)] bg-stone-50 px-5 py-2.5 text-xs font-medium uppercase tracking-wide text-ink/45">Pré-visualização</div>
              {html ? (
                <iframe title="preview" className="h-[640px] w-full bg-white" srcDoc={preview} />
              ) : (
                <div className="flex h-[640px] items-center justify-center text-sm text-ink/40">A prévia aparece aqui conforme você escreve.</div>
              )}
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
