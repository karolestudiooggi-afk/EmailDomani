'use client';

import Link from 'next/link';
import type { Client } from '../types';

export function ClientPicker({
  clients,
  clientId,
  onChange,
}: {
  clients: Client[];
  clientId: string;
  onChange: (id: string) => void;
}) {
  if (clients.length === 0) {
    return (
      <Link
        href="/clients"
        className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-brand-600 hover:bg-brand-50"
      >
        + Cadastrar primeiro cliente
      </Link>
    );
  }
  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="text-ink/50">Cliente</span>
      <select
        value={clientId}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm font-medium text-ink focus:border-brand-400"
      >
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.brand_name}
          </option>
        ))}
      </select>
    </label>
  );
}
