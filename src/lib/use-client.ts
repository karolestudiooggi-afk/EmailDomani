'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from './client-api';
import type { Client } from '../types';

const STORAGE_KEY = 'domani.selectedClient';

/** Mantém a lista de clientes e qual está selecionado (persistido no navegador). */
export function useSelectedClient() {
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientIdState] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const setClientId = useCallback((id: string) => {
    setClientIdState(id);
    if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, id);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { clients } = await api<{ clients: Client[] }>('/api/clients');
      setClients(clients);
      const saved = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
      const valid = clients.find((c) => c.id === saved);
      setClientIdState(valid ? valid.id : clients[0]?.id ?? '');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = clients.find((c) => c.id === clientId) ?? null;
  return { clients, clientId, setClientId, selected, loading, reload: load };
}
