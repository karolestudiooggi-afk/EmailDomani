'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';

/** Telas públicas (login, descadastro) não mostram a navegação interna. */
const BARE = ['/login', '/unsubscribe'];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const bare = BARE.some((p) => pathname.startsWith(p));

  if (bare) return <>{children}</>;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-w-0">
        <div className="mx-auto max-w-6xl px-6 py-10 lg:px-10">{children}</div>
      </main>
    </div>
  );
}
