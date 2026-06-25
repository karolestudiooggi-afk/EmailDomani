'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase/client';
import { useMe } from '../lib/use-me';

const nav = [
  { href: '/', label: 'Visão geral', icon: '◴' },
  { href: '/clients', label: 'Clientes', icon: '⬡' },
  { href: '/campaigns', label: 'Campanhas', icon: '✦' },
  { href: '/contacts', label: 'Contatos', icon: '☷' },
  { href: '/templates', label: 'Templates', icon: '❏' },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { me, isAdmin } = useMe();
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  async function signOut() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <aside className="scroll-dark sticky top-0 h-screen w-60 shrink-0 overflow-y-auto border-r border-[var(--border)] bg-ink text-white/85">
      <div className="flex h-full flex-col px-4 py-6">
        <div className="px-2 pb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/domani-horizontal.png" alt="Domani" className="h-7 w-auto" />
          <div className="domani-horizon mt-3 w-20" />
          <div className="mt-2 text-[11px] uppercase tracking-[0.22em] text-white/40">Mailer</div>
        </div>

        <nav className="flex flex-col gap-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                isActive(item.href)
                  ? 'bg-brand-500 text-white'
                  : 'text-white/55 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span className="w-4 text-center opacity-80">{item.icon}</span>
              {item.label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              href="/users"
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                isActive('/users') ? 'bg-brand-500 text-white' : 'text-white/55 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span className="w-4 text-center opacity-80">⚙</span>
              Usuários
            </Link>
          )}
        </nav>

        <div className="mt-auto space-y-3">
          {me?.email && (
            <div className="px-3 text-xs text-white/40">
              {me.email}
              <span className="ml-1 rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                {isAdmin ? 'admin' : 'operador'}
              </span>
            </div>
          )}
          <div className="rounded-lg bg-white/5 p-3 text-xs leading-relaxed text-white/45">
            Cada cliente envia pelo SMTP dele. A reputação e o limite são da
            conta do cliente, não da plataforma.
          </div>
          <button
            onClick={signOut}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-white/55 transition-colors hover:bg-white/5 hover:text-white"
          >
            ⏻ Sair
          </button>
        </div>
      </div>
    </aside>
  );
}
