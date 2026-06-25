'use client';

import Link from 'next/link';
import { useApi } from '../lib/client-api';
import { PageHeader, Card, Stat, Button, StatusBadge, EmptyState } from '../components/ui';
import type { CampaignStats, Client } from '../types';

interface CampaignRow {
  id: string; name: string; status: string; created_at: string;
  subject: string; stats: CampaignStats | null;
}

export default function DashboardPage() {
  const { data, loading } = useApi<{ campaigns: CampaignRow[] }>('/api/campaigns');
  const { data: clientsData } = useApi<{ clients: Client[] }>('/api/clients');
  const campaigns = data?.campaigns ?? [];
  const clientCount = clientsData?.clients.length ?? 0;

  const totals = campaigns.reduce(
    (acc, c) => {
      if (c.stats) { acc.sent += c.stats.sent; acc.opened += c.stats.opened; acc.clicked += c.stats.clicked; }
      return acc;
    },
    { sent: 0, opened: 0, clicked: 0 },
  );
  const openRate = totals.sent ? Math.round((totals.opened / totals.sent) * 100) : 0;
  const clickRate = totals.sent ? Math.round((totals.clicked / totals.sent) * 100) : 0;

  return (
    <>
      <PageHeader
        title="Visão geral"
        subtitle="Desempenho de todas as campanhas, somando os clientes"
        action={<Link href="/campaigns/new"><Button>Nova campanha</Button></Link>}
      />

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="E-mails enviados" value={totals.sent.toLocaleString('pt-BR')} accent />
        <Stat label="Aberturas" value={`${openRate}%`} sub={`${totals.opened.toLocaleString('pt-BR')} aberturas`} />
        <Stat label="Cliques" value={`${clickRate}%`} sub={`${totals.clicked.toLocaleString('pt-BR')} cliques`} />
        <Stat label="Clientes" value={clientCount} />
      </div>

      <h2 className="mb-3 font-display text-lg text-ink">Campanhas recentes</h2>

      {loading ? (
        <Card className="p-6 text-sm text-ink/50">Carregando…</Card>
      ) : campaigns.length === 0 ? (
        <EmptyState
          title="Nenhuma campanha ainda"
          description="Cadastre um cliente, conecte o SMTP, suba uma lista e dispare."
          action={<Link href="/clients"><Button>Começar pelos clientes</Button></Link>}
        />
      ) : (
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wide text-ink/45">
                <th className="px-5 py-3 font-medium">Campanha</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Enviados</th>
                <th className="px-5 py-3 font-medium text-right">Aberturas</th>
                <th className="px-5 py-3 font-medium text-right">Cliques</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.slice(0, 8).map((c) => (
                <tr key={c.id} className="border-b border-[var(--border)] last:border-0 hover:bg-brand-50/40">
                  <td className="px-5 py-3.5">
                    <Link href={`/campaigns/${c.id}`} className="font-medium text-ink hover:text-brand-500">{c.name}</Link>
                    <div className="text-xs text-ink/45">{c.subject}</div>
                  </td>
                  <td className="px-5 py-3.5"><StatusBadge status={c.status} /></td>
                  <td className="px-5 py-3.5 text-right tabular-nums">{c.stats?.sent ?? 0}</td>
                  <td className="px-5 py-3.5 text-right tabular-nums">{c.stats?.opened ?? 0}</td>
                  <td className="px-5 py-3.5 text-right tabular-nums">{c.stats?.clicked ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
