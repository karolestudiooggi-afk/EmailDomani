'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '../../../lib/client-api';
import { PageHeader, Card, Button, Stat, StatusBadge, Ring } from '../../../components/ui';
import type { Campaign, CampaignStats, EmailSend } from '../../../types';

interface Payload { campaign: Campaign; stats: CampaignStats | null; sends: EmailSend[]; }

function fmt(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}
function fmtFull(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function pct(part: number, total: number): string {
  if (!total) return '0%';
  return `${Math.round((part / total) * 100)}%`;
}
function deliveryState(s: EmailSend): string {
  if (s.bounced_at) return 'bounce';
  if (s.status === 'failed') return 'failed';
  if (s.status === 'sent') return 'sent';
  return 'pending';
}

export default function CampaignReportPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<Payload | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await api<Payload>(`/api/campaigns/${params.id}`);
    setData(res);
    return res;
  }, [params.id]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (data?.campaign.status !== 'sending') return;
    const t = setInterval(() => void load(), 5000);
    return () => clearInterval(t);
  }, [data?.campaign.status, load]);

  if (!data) return <Card className="p-6 text-sm text-ink/50">Carregando relatório…</Card>;

  const { campaign, stats, sends } = data;
  const s = stats ?? { total: 0, sent: 0, failed: 0, pending: 0, bounced: 0, opened: 0, clicked: 0 };

  async function dispatch() {
    setBusy(true); setNote(null);
    try {
      if (campaign.status === 'draft') {
        await api(`/api/campaigns/${params.id}`, { method: 'POST' });
        setNote('Campanha enfileirada. O envio continua em segundo plano.');
      } else {
        await api('/api/cron');
        setNote('Lote processado.');
      }
      await load();
    } catch (e) { setNote((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <>
      <PageHeader
        title={campaign.name}
        subtitle={campaign.subject}
        action={
          <div className="flex items-center gap-3">
            <StatusBadge status={campaign.status} />
            {(campaign.status === 'draft' || campaign.status === 'queued') && <Button onClick={dispatch} disabled={busy}>{busy ? 'Disparando…' : 'Disparar agora'}</Button>}
            {(campaign.status === 'sending' || s.pending > 0) && <Button variant="ghost" onClick={dispatch} disabled={busy}>Processar fila</Button>}
          </div>
        }
      />

      {note && <div className="mb-6 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-700">{note}</div>}

      {campaign.status === 'queued' && campaign.scheduled_at && (
        <div className="mb-6 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-700">
          Agendada para <strong>{fmtFull(campaign.scheduled_at)}</strong>. O envio começa sozinho no horário — ou use “Disparar agora”.
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Ring value={s.sent ? Math.round((s.opened / s.sent) * 100) : 0} label="Taxa de abertura" sub={`${s.opened} de ${s.sent} enviados`} />
        <Ring value={s.sent ? Math.round((s.clicked / s.sent) * 100) : 0} label="Taxa de clique" sub={`${s.clicked} cliques`} color="graphite" />
        <Ring value={s.total ? Math.round((s.sent / s.total) * 100) : 0} label="Progresso do envio" sub={`${s.pending} na fila`} />
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat label="Enviados" value={s.sent.toLocaleString('pt-BR')} accent />
        <Stat label="Aberturas" value={s.opened.toLocaleString('pt-BR')} sub={`${pct(s.opened, s.sent)} taxa`} />
        <Stat label="Cliques" value={s.clicked.toLocaleString('pt-BR')} sub={`${pct(s.clicked, s.sent)} taxa`} />
        <Stat label="Na fila" value={s.pending.toLocaleString('pt-BR')} />
        <Stat label="Bounces" value={s.bounced.toLocaleString('pt-BR')} sub="rejeições no envio" />
      </div>

      <h2 className="mb-3 font-display text-lg text-ink">Destinatários</h2>
      <Card>
        <div className="max-h-[600px] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wide text-ink/45">
                <th className="px-5 py-3 font-medium">E-mail</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Enviado</th>
                <th className="px-5 py-3 font-medium">Aberto</th>
                <th className="px-5 py-3 font-medium">Clicado</th>
              </tr>
            </thead>
            <tbody>
              {sends.map((row) => (
                <tr key={row.id} className="border-b border-[var(--border)] last:border-0 hover:bg-brand-50/30">
                  <td className="px-5 py-3 text-ink">
                    {row.email}
                    {row.error && <div className="text-xs text-red-500">{row.error}</div>}
                  </td>
                  <td className="px-5 py-3"><StatusBadge status={deliveryState(row)} /></td>
                  <td className="px-5 py-3 text-ink/60 tabular-nums">{fmt(row.sent_at)}</td>
                  <td className="px-5 py-3 tabular-nums">
                    {row.opened_at ? <span className="text-brand-600">{fmt(row.opened_at)}{row.open_count > 1 && <span className="ml-1 text-xs text-ink/40">×{row.open_count}</span>}</span> : <span className="text-ink/35">—</span>}
                  </td>
                  <td className="px-5 py-3 tabular-nums">
                    {row.clicked_at ? <span className="font-medium text-graphite">{fmt(row.clicked_at)}{row.click_count > 1 && <span className="ml-1 text-xs text-ink/40">×{row.click_count}</span>}</span> : <span className="text-ink/35">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
