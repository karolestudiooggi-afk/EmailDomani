'use client';

import { useEffect, useState } from 'react';
import type { Role } from '../types';

interface Me { id: string; email: string | null; role: Role; }

/** Carrega o usuário logado e o papel dele (para ajustar a UI). */
export function useMe() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch('/api/me')
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((d) => setMe(d.user))
      .catch(() => setMe(null))
      .finally(() => setLoading(false));
  }, []);
  return { me, isAdmin: me?.role === 'admin', loading };
}
