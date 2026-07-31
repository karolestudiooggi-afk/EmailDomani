'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from './client-api';
import type { Client } from '../types';

const STORAGE_KEY = 'domani.selectedClient';

function initialClientId(): string {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(STORAGE_KEY) ?? '';
}

/** Mantém a lista de clientes e qual está selecionado (persistido no navegador). */
export function useSelectedClient() {
  const [clients, setClients] = useState<Client[]>([]);
  // Já nasce com o cliente salvo no navegador — NÃO espera o /api/clients.
  const [clientId, setClientIdState] = useState<string>(initialClientId);
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
      setClientIdState((current) => {
        if (current && clients.some((c) => c.id === current)) return current;
        const next = clients[0]?.id ?? '';
        if (typeof window !== 'undefined' && next) window.localStorage.setItem(STORAGE_KEY, next);
        return next;
      });
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