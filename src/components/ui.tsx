'use client';

import React from 'react';
import type {
  CampaignStatus,
  SendStatus,
  ContactStatus,
} from '../types';

export function cn(...parts: Array<string | false | undefined | null>): string {
  return parts.filter(Boolean).join(' ');
}

// ─── Card ────────────────────────────────────────────────────────────────────
export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-[var(--border)] bg-white shadow-card',
        className,
      )}
    >
      {children}
    </div>
  );
}

// ─── PageHeader ──────────────────────────────────────────────────────────────
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-8 flex items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink/60">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

// ─── Button ──────────────────────────────────────────────────────────────────
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'danger';
};
export function Button({ variant = 'primary', className, ...props }: ButtonProps) {
  const styles = {
    primary:
      'bg-brand-500 text-brand-50 hover:bg-brand-600 disabled:opacity-50',
    ghost:
      'bg-transparent text-brand-600 border border-[var(--border)] hover:bg-brand-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  }[variant];
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed',
        styles,
        className,
      )}
      {...props}
    />
  );
}

// ─── Input / Field ───────────────────────────────────────────────────────────
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink/80">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink/50">{hint}</span>}
    </label>
  );
}

export const inputClass =
  'w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-ink placeholder:text-ink/35 focus:border-brand-400';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input(props, ref) {
    return <input ref={ref} className={cn(inputClass, props.className)} {...props} />;
  },
);

// ─── Badge de status ─────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  // campanha
  draft: 'bg-stone-100 text-stone-600',
  queued: 'bg-amber-50 text-amber-600',
  sending: 'bg-blue-50 text-blue-600',
  sent: 'bg-brand-100 text-brand-600',
  paused: 'bg-orange-50 text-orange-600',
  // envio
  pending: 'bg-amber-50 text-amber-600',
  failed: 'bg-red-50 text-red-600',
  // entrega (Resend)
  delivered: 'bg-brand-100 text-brand-600',
  bounce: 'bg-red-50 text-red-600',
  complaint: 'bg-orange-100 text-orange-700',
  // contato
  active: 'bg-brand-100 text-brand-600',
  unsubscribed: 'bg-stone-100 text-stone-500',
  bounced: 'bg-red-50 text-red-600',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho',
  queued: 'Na fila',
  sending: 'Enviando',
  sent: 'Enviada',
  paused: 'Pausada',
  pending: 'Pendente',
  failed: 'Falhou',
  delivered: 'Entregue',
  bounce: 'Bounce',
  complaint: 'Spam',
  active: 'Ativo',
  unsubscribed: 'Descadastrado',
  bounced: 'Bounce',
};

export function StatusBadge({
  status,
}: {
  status: CampaignStatus | SendStatus | ContactStatus | string;
}) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
        STATUS_COLORS[status] ?? 'bg-stone-100 text-stone-600',
      )}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ─── Stat (métrica grande) ───────────────────────────────────────────────────
export function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <Card className="p-5">
      <div className="text-xs font-medium uppercase tracking-wide text-ink/50">{label}</div>
      <div
        className={cn(
          'mt-2 font-display text-3xl',
          accent ? 'text-brand-500' : 'text-ink',
        )}
      >
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-ink/50">{sub}</div>}
    </Card>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="font-display text-lg text-ink">{title}</div>
      <p className="mt-1 max-w-sm text-sm text-ink/55">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </Card>
  );
}

// ─── Ring (anel de porcentagem, p/ dashboard visual) ─────────────────────────
export function Ring({
  value,
  label,
  sub,
  color = 'brand',
}: {
  value: number; // 0..100
  label: string;
  sub?: string;
  color?: 'brand' | 'graphite';
}) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const dash = (pct / 100) * c;
  const stroke = color === 'graphite' ? '#1d1d1f' : '#e56d23';

  return (
    <Card className="flex items-center gap-4 p-5">
      <svg width="84" height="84" viewBox="0 0 84 84" className="shrink-0">
        <circle cx="42" cy="42" r={r} fill="none" stroke="#eceae3" strokeWidth="9" />
        <circle
          cx="42" cy="42" r={r} fill="none" stroke={stroke} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`} transform="rotate(-90 42 42)"
        />
        <text x="42" y="42" textAnchor="middle" dominantBaseline="central"
          className="fill-ink font-display" style={{ fontSize: 18, fontWeight: 600 }}>
          {pct}%
        </text>
      </svg>
      <div>
        <div className="text-sm font-medium text-ink">{label}</div>
        {sub && <div className="mt-0.5 text-xs text-ink/50">{sub}</div>}
      </div>
    </Card>
  );
}
