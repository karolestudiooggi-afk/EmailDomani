'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useApi, api } from '../../../lib/client-api';
import { useSelectedClient } from '../../../lib/use-client';
import { ClientPicker } from '../../../components/ClientPicker';
import { PageHeader, Card, Button, Field, Input, EmptyState, Select } from '../../../components/ui';
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
  const [fromName, setFromName] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (selected) { setFromName(selected.from_name); setFromEmail(selected.from_email); }
  }, [selected]);

  const selectedTemplate = templates.find((t) => t.id === templateId);
  const selectedList = lists.find((l) => l.id === listId);

  function pickTemplate(id: string) {
    setTemplateId(id);
    const t = templates.find((x) => x.id === id);
    if (t) setSubject(t.subject); // assunto começa do template (editável)
  }

  // prévia do template selecionado, com variáveis de exemplo
  const preview = (selectedTemplate?.html ?? '')
    .replace(/\{\{\s*nome\s*\}\}/g, 'Maria')
    .replace(/\{\{\s*email\s*\}\}/g, 'maria@email.com')
    .replace(/\{\{\s*empresa\s*\}\}/g, selected?.brand_name ?? 'Empresa')
    .replace(/\{\{\s*assinatura\s*\}\}/g, selected?.brand_fields?.assinatura ?? '');

  async function submit(mode: 'now' | 'schedule' | 'draft') {
    if (!clientId || !name.trim() || !listId || !templateId || !subject.trim() || !fromEmail.trim()) {
      setErr('Preencha nome, lista, template, remetente e assunto.'); return;
    }
    if (!selectedTemplate) { setErr('Selecione um template.'); return; }
    if (mode === 'schedule' && !scheduledAt) { setErr('Escolha a data e a hora do agendamento.'); return; }
    setBusy(true); setErr(null);
    try {
      const iso = mode === 'schedule' ? new Date(scheduledAt).toISOString() : null;
      const { campaign } = await api<{ campaign: { id: string } }>('/api/campaigns', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId, name: name.trim(), listId, templateId,
          subject: subject.trim(), html: selectedTemplate.html,
          fromName: fromName.trim(), fromEmail: fromEmail.trim(),
          scheduledAt: iso,
        }),
      });
      if (mode === 'now') await api(`/api/campaigns/${campaign.id}`, { method: 'POST' });
      router.push(`/campaigns/${campaign.id}`);
    } catch (e) { setErr((e as Error).message); setBusy(false); }
  }

  return (
    <>
      <PageHeader
        title="Nova campanha"
        subtitle="Escolha a lista e o template — e dispare pelo SMTP do cliente"
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
                  <Select
                    value={listId}
                    onChange={setListId}
                    placeholder="Selecione uma lista…"
                    options={lists.map((l) => ({ value: l.id, label: `${l.name} (${l.count} contatos)` }))}
                  />
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
              <h2 className="mb-4 font-display text-lg text-ink">3. Conteúdo</h2>
              {templates.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[var(--border)] bg-stone-50 px-4 py-6 text-center text-sm text-ink/60">
                  Nenhum template para este cliente ainda.{' '}
                  <Link href="/templates" className="font-medium text-brand-600 hover:underline">Criar um template</Link> primeiro.
                </div>
              ) : (
                <div className="space-y-4">
                  <Field label="Template" hint="O conteúdo é montado na aba Templates. Aqui você só escolhe qual usar.">
                    <Select
                      value={templateId}
                      onChange={pickTemplate}
                      placeholder="Selecione um template…"
                      options={templates.map((t) => ({ value: t.id, label: t.name }))}
                    />
                  </Field>
                  <Field label="Assunto" hint="Começa do template — edite se quiser."><Input value={subject} onChange={(e) => setSubject(e.target.value)} /></Field>
                  {selectedTemplate && (
                    <Link href="/templates" className="inline-block text-xs text-brand-600 hover:underline">✎ Editar este template na aba Templates</Link>
                  )}
                </div>
              )}
            </Card>

            <Card className="p-5">
              <h2 className="mb-4 font-display text-lg text-ink">4. Quando enviar</h2>
              <Field label="Agendar para (opcional)" hint="Vazio = dispara na hora. Agendado, começa sozinho no horário.">
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
              <div className="border-b border-[var(--border)] bg-stone-50 px-5 py-2.5 text-xs font-medium uppercase tracking-wide text-ink/45">
                Prévia do template
              </div>
              {selectedTemplate ? (
                <iframe title="preview" className="h-[640px] w-full bg-white" srcDoc={preview} />
              ) : (
                <div className="flex h-[640px] items-center justify-center px-6 text-center text-sm text-ink/40">
                  Selecione um template para ver a prévia do e-mail.
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
