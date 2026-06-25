'use client';

import Link from 'next/link';
import type { Client } from '../types';
import { Select } from './ui';

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
        className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-brand-600 transition-colors hover:bg-brand-50"
      >
        + Cadastrar primeiro cliente
      </Link>
    );
  }
  return (
    <div className="inline-flex items-center gap-2 text-sm">
      <span className="text-ink/50">Cliente</span>
      <Select
        value={clientId}
        onChange={onChange}
        options={clients.map((c) => ({ value: c.id, label: c.brand_name }))}
        className="min-w-[160px]"
      />
    </div>
  );
}
