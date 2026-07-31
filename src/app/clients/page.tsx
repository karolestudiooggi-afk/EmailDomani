'use client';

import { useState } from 'react';
import { useApi, api } from '../../lib/client-api';
import { useMe } from '../../lib/use-me';
import {
  PageHeader,
  Card,
  Button,
  Field,
  Input,
  EmptyState,
} from '../../components/ui';
import type { Client } from '../../types';

export default function ClientsPage() {
  const { isAdmin } = useMe();
  const { data, loading, reload } = useApi<{ clients: Client[] }>('/api/clients');
  const clients = data?.clients ?? [];
  const [editing, setEditing] = useState<Client | 'new' | null>(null);

  return (
    <>
      <PageHeader
        title="Clientes"
        subtitle="Cada cliente envia do domínio dele, com a marca dele"
        action={isAdmin ? <Button onClick={() => setEditing('new')}>Novo cliente</Button> : undefined}
      />

      {editing ? (
        <ClientForm
          client={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      ) : loading ? (
        <Card className="p-6 text-sm text-ink/50">Carregando…</Card>
      ) : clients.length === 0 ? (
        <EmptyState
          title="Nenhum cliente"
          description="Cadastre um cliente e o remetente dele para começar a disparar com a marca dele."
          action={isAdmin ? <Button onClick={() => setEditing('new')}>Cadastrar cliente</Button> : undefined}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((c) => (
            <ClientCard key={c.id} client={c} isAdmin={isAdmin} onEdit={() => setEditing(c)} onDeleted={reload} />
          ))}
        </div>
      )}
    </>
  );
}

function ClientCard({
  client,
  isAdmin,
  onEdit,
  onDeleted,
}: {
  client: Client;
  isAdmin: boolean;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setErr(null);
    try {
      await api(`/api/clients/${client.id}`, { method: 'DELETE' });
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
      <h3 className="font-display text-lg text-ink">{client.brand_name}</h3>
      <p className="mt-0.5 text-sm text-ink/50">{client.from_email}</p>
      <div className="mt-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-700">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-500" /> {client.daily_limit.toLocaleString('pt-BR')}/dia
        </span>
      </div>

      {err && <p className="mt-3 text-xs text-red-600">{err}</p>}

      {isAdmin && (
        confirming ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3">
            <p className="text-xs text-red-700">Excluir <strong>{client.brand_name}</strong>? Não pode ser desfeito.</p>
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
              title="Excluir cliente"
              className="rounded-lg border border-line/30 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
            >
              Excluir
            </button>
          </div>
        )
      )}
    </Card>
  );
}

function ClientForm({
  client,
  onClose,
  onSaved,
}: {
  client: Client | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(client?.name ?? '');
  const [brandName, setBrandName] = useState(client?.brand_name ?? '');
  const [fromName, setFromName] = useState(client?.from_name ?? '');
  const [fromEmail, setFromEmail] = useState(client?.from_email ?? '');
  const [dailyLimit, setDailyLimit] = useState(String(client?.daily_limit ?? 2000));
  const [signature, setSignature] = useState(client?.brand_fields?.assinatura ?? '');

  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function testConnection() {
    setTesting(true);
    setTestMsg(null);
    try {
      const res = await api<{ ok: boolean; error?: string }>('/api/clients/test', { method: 'POST' });
      setTestMsg(res.ok ? '✓ SMTP da agência conectou.' : `Falhou: ${res.error}`);
    } catch (e) {
      setTestMsg((e as Error).message);
    } finally {
      setTesting(false);
    }
  }

  async function save() {
    if (!brandName.trim() || !fromName.trim() || !fromEmail.trim()) {
      setErr('Preencha nome da marca, remetente e e-mail.');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const payload = {
        name: name.trim() || brandName.trim(),
        brandName: brandName.trim(),
        fromName: fromName.trim(),
        fromEmail: fromEmail.trim(),
        dailyLimit: Number(dailyLimit) || 2000,
        brandFields: { assinatura: signature },
      };
      if (client) {
        await api(`/api/clients/${client.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        await api('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      onSaved();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="p-5">
        <h2 className="mb-4 font-display text-lg text-ink">Marca</h2>
        <div className="space-y-4">
          <Field label="Nome da marca" hint="Aparece como {{empresa}} no template.">
            <Input value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="Privillège" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Remetente (nome)">
              <Input value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="Privillège" />
            </Field>
            <Field label="Remetente (e-mail)" hint="O domínio deve estar autenticado na conta SendPulse da agência.">
              <Input value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} placeholder="contato@cliente.com.br" />
            </Field>
          </div>
          <Field label="Assinatura" hint="Disponível como {{assinatura}} no template.">
            <Input value={signature} onChange={(e) => setSignature(e.target.value)} placeholder="Equipe Privillège" />
          </Field>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-1 font-display text-lg text-ink">Envio</h2>
        <p className="mb-4 text-xs text-ink/50">
          O SMTP é único da agência (conta SendPulse), configurado no servidor. Cada cliente envia
          do <strong>próprio domínio</strong> (o remetente ao lado) por essa conta.
        </p>
        <div className="space-y-4">
          <Field label="Limite diário deste cliente" hint="Teto de envios por dia para este cliente.">
            <Input value={dailyLimit} onChange={(e) => setDailyLimit(e.target.value)} placeholder="2000" />
          </Field>
          <Button variant="ghost" onClick={testConnection} disabled={testing}>
            {testing ? 'Testando…' : 'Testar SMTP da agência'}
          </Button>
          {testMsg && (
            <p className={`text-sm ${testMsg.startsWith('✓') ? 'text-brand-600' : 'text-amber-500'}`}>{testMsg}</p>
          )}
        </div>
      </Card>

      <div className="lg:col-span-2">
        {err && <p className="mb-3 text-sm text-red-600">{err}</p>}
        <div className="flex gap-3">
          <Button onClick={save} disabled={busy}>
            {busy ? 'Salvando…' : 'Salvar cliente'}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}
