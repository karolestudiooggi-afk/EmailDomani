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
        subtitle="Cada cliente envia pelo SMTP dele, com a marca dele"
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
          description="Cadastre um cliente, conecte o SMTP dele e comece a disparar com a marca dele."
          action={isAdmin ? <Button onClick={() => setEditing('new')}>Cadastrar cliente</Button> : undefined}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((c) => (
            <Card key={c.id} className="flex flex-col p-5">
              <h3 className="font-display text-lg text-ink">{c.brand_name}</h3>
              <p className="mt-0.5 text-sm text-ink/50">{c.from_email}</p>
              <div className="mt-3">
                {c.smtp_host ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-500" /> SMTP conectado
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-2.5 py-0.5 text-xs font-medium text-amber-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> sem SMTP
                  </span>
                )}
              </div>
              {isAdmin && (
                <Button variant="ghost" onClick={() => setEditing(c)} className="mt-4">
                  Editar
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}
    </>
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
  const [smtpHost, setSmtpHost] = useState(client?.smtp_host ?? 'smtp.sendpulse.com');
  const [smtpPort, setSmtpPort] = useState(String(client?.smtp_port ?? 587));
  const [smtpUser, setSmtpUser] = useState(client?.smtp_user ?? '');
  const [smtpPass, setSmtpPass] = useState('');
  const [dailyLimit, setDailyLimit] = useState(String(client?.daily_limit ?? 2000));
  const [signature, setSignature] = useState(client?.brand_fields?.assinatura ?? '');

  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function testConnection() {
    if (!smtpHost || !smtpUser || !smtpPass) {
      setTestMsg('Preencha host, usuário e senha para testar.');
      return;
    }
    setTesting(true);
    setTestMsg(null);
    try {
      const res = await api<{ ok: boolean; error?: string }>('/api/clients/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: smtpHost,
          port: Number(smtpPort),
          secure: Number(smtpPort) === 465,
          user: smtpUser,
          pass: smtpPass,
        }),
      });
      setTestMsg(res.ok ? '✓ Conexão SMTP funcionou.' : `Falhou: ${res.error}`);
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
        smtpHost: smtpHost.trim() || null,
        smtpPort: Number(smtpPort) || 587,
        smtpSecure: Number(smtpPort) === 465,
        smtpUser: smtpUser.trim() || null,
        smtpPass: smtpPass || null, // só envia se mudou
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
            <Field label="Remetente (e-mail)">
              <Input value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} placeholder="contato@cliente.com.br" />
            </Field>
          </div>
          <Field label="Assinatura" hint="Disponível como {{assinatura}} no template.">
            <Input value={signature} onChange={(e) => setSignature(e.target.value)} placeholder="Equipe Privillège" />
          </Field>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-1 font-display text-lg text-ink">Conexão SMTP</h2>
        <p className="mb-4 text-xs text-ink/50">
          As credenciais de envio do cliente. A senha é guardada criptografada.
        </p>
        <div className="space-y-4">
          <Field label="Host SMTP">
            <Input value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder="smtp.sendpulse.com" />
          </Field>
          <Field label="Porta" hint="SendPulse: 587 (recomendada) ou 465. O TLS é definido sozinho pela porta.">
            <Input value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} placeholder="587" />
          </Field>
          <Field label="Usuário">
            <Input value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} placeholder="login do SMTP" />
          </Field>
          <Field label="Senha" hint={client ? 'Deixe em branco para manter a senha atual.' : undefined}>
            <Input type="password" value={smtpPass} onChange={(e) => setSmtpPass(e.target.value)} placeholder="••••••••" />
          </Field>
          <Field label="Limite diário deste cliente" hint="Teto de envios por dia. A cota do SendPulse é por conta — um cliente nunca consome a de outro.">
            <Input value={dailyLimit} onChange={(e) => setDailyLimit(e.target.value)} placeholder="2000" />
          </Field>
          <Button variant="ghost" onClick={testConnection} disabled={testing}>
            {testing ? 'Testando…' : 'Testar conexão'}
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
