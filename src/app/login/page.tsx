'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function signIn() {
    if (!email || !password) {
      setErr('Informe e-mail e senha.');
      return;
    }
    setBusy(true);
    setErr(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setErr('E-mail ou senha incorretos.');
      setBusy(false);
      return;
    }
    router.push('/');
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/domani-vertical.png" alt="Domani" className="mx-auto h-24 w-auto" />
          <div className="domani-horizon mx-auto mt-4 w-20" />
          <div className="mt-2 text-[11px] uppercase tracking-[0.22em] text-ink/40">Mailer</div>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-white p-7 shadow-card">
          <h1 className="mb-5 font-display text-lg text-ink">Entrar</h1>
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink/80">E-mail</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && signIn()}
                className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-ink focus:border-brand-400"
                placeholder="voce@domani.com.br"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink/80">Senha</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && signIn()}
                className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-ink focus:border-brand-400"
                placeholder="••••••••"
              />
            </label>
            <button
              onClick={signIn}
              disabled={busy}
              className="w-full rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
            >
              {busy ? 'Entrando…' : 'Entrar'}
            </button>
            {err && <p className="text-sm text-red-600">{err}</p>}
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-ink/45">
          Acesso restrito à equipe Domani.
        </p>
      </div>
    </main>
  );
}
