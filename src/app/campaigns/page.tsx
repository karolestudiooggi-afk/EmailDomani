'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useApi, api } from '../../lib/client-api';
import { useSelectedClient } from '../../lib/use-client';
import { ClientPicker } from '../../components/ClientPicker';
import { PageHeader, Card, Button, StatusBadge, EmptyState } from '../../components/ui';
import type { CampaignStats } from '../../types';

interface CampaignRow {
  id: string; name: string; status: string; created_at: string;
  subject: string; from_email: string; stats: CampaignStats | null;
}

function rate(part: number, total: number): string {
  if (!total) return '—';
  return `${Math.round((part / total) * 100)}%`;
}

export default function CampaignsPage() {
  const { clients, clientId, setClientId, loading: lc } = useSelectedClient();
  const { data, loading, reload } = useApi<{ campaigns: CampaignRow[] }>(clientId ? `/api/campaigns?clientId=${clientId}` : '/api/campaigns');
  const campaigns = data?.campaigns ?? [];

  return (
    <>
      <PageHeader
        title="Campanhas"
        subtitle="Disparos do cliente selecionado"
        action={
          <div className="flex items-center gap-3">
            {!lc && <ClientPicker clients={clients} clientId={clientId} onChange={setClientId} />}
            <Link href="/campaigns/new"><Button>Nova campanha</Button></Link>
          </div>
        }
      />

      {loading ? (
        <Card className="p-6 text-sm text-ink/50">Carregando…</Card>
      ) : campaigns.length === 0 ? (
        <EmptyState title="Nenhuma campanha" description="Crie a primeira campanha deste cliente." action={<Link href="/campaigns/new"><Button>Criar campanha</Button></Link>} />
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => (
            <CampaignRowCard key={c.id} c={c} onChanged={reload} />
          ))}
        </div>
      )}
    </>
  );
}

function CampaignRowCard({ c, onChanged }: { c: CampaignRow; onChanged: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const jaEnviou = ['sending', 'sent'].includes(c.status);

  async function remove() {
    setBusy(true);
    setErr(null);
    try {
      await api(`/api/campaigns/${c.id}`, { method: 'DELETE' });
      onChanged();
    } catch (e) {
      setErr((e as Error).message);
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-6">
        <Link href={`/campaigns/${c.id}`} className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <span className="truncate font-display text-lg text-ink">{c.name}</span>
            <StatusBadge status={c.status} />
          </div>
          <div className="mt-0.5 truncate text-sm text-ink/50">{c.subject}</div>
        </Link>
        <div className="flex shrink-0 items-center gap-8 text-right text-sm">
          <Metric label="Enviados" value={c.stats?.sent ?? 0} />
          <Metric label="Aberturas" value={rate(c.stats?.opened ?? 0, c.stats?.sent ?? 0)} />
          <Metric label="Cliques" value={rate(c.stats?.clicked ?? 0, c.stats?.sent ?? 0)} />
          <button
            onClick={() => setConfirming(true)}
            title="Excluir campanha"
            className="rounded-lg border border-line/30 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
          >
            Excluir
          </button>
        </div>
      </div>

      {err && <p className="mt-3 text-xs text-red-600">{err}</p>}

      {confirming && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3">
          <p className="text-xs text-red-700">
            {jaEnviou
              ? <>Esta campanha já enviou. Ela será <strong>arquivada</strong> (sai da lista, mas o relatório é mantido). Continuar?</>
              : <>Excluir <strong>{c.name}</strong>? Não pode ser desfeito.</>}
          </p>
          <div className="mt-2 flex gap-2">
            <Button variant="ghost" onClick={() => setConfirming(false)}>Cancelar</Button>
            <button
              onClick={remove}
              disabled={busy}
              className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              {busy ? 'Processando…' : jaEnviou ? 'Arquivar' : 'Excluir'}
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="font-display text-xl text-ink tabular-nums">{value}</div>
      <div className="text-xs uppercase tracking-wide text-ink/40">{label}</div>
    </div>
  );
}
