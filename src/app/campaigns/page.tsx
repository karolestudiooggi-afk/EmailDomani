'use client';

import Link from 'next/link';
import { useApi } from '../../lib/client-api';
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
  const { data, loading } = useApi<{ campaigns: CampaignRow[] }>(clientId ? `/api/campaigns?clientId=${clientId}` : '/api/campaigns');
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
            <Link key={c.id} href={`/campaigns/${c.id}`}>
              <Card className="flex items-center justify-between gap-6 p-5 transition-colors hover:border-brand-300">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="truncate font-display text-lg text-ink">{c.name}</span>
                    <StatusBadge status={c.status} />
                  </div>
                  <div className="mt-0.5 truncate text-sm text-ink/50">{c.subject}</div>
                </div>
                <div className="flex shrink-0 gap-8 text-right text-sm">
                  <Metric label="Enviados" value={c.stats?.sent ?? 0} />
                  <Metric label="Aberturas" value={rate(c.stats?.opened ?? 0, c.stats?.sent ?? 0)} />
                  <Metric label="Cliques" value={rate(c.stats?.clicked ?? 0, c.stats?.sent ?? 0)} />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
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
