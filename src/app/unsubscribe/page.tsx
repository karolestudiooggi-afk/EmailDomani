import { unsubscribeBySend } from '../../services/unsubscribe.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Página pública: o destinatário clica no rodapé do e-mail e cai aqui. */
export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: { s?: string };
}) {
  const sendId = searchParams.s;
  let ok = false;
  if (sendId) {
    const res = await unsubscribeBySend(sendId).catch(() => ({ ok: false }));
    ok = res.ok;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-6">
      <div className="w-full max-w-md rounded-xl border border-[var(--border)] bg-white p-8 text-center shadow-card">
        <div className="domani-horizon mx-auto mb-6 w-16" />
        {ok ? (
          <>
            <h1 className="font-display text-2xl text-ink">Descadastro confirmado</h1>
            <p className="mt-2 text-sm text-ink/60">
              Você não receberá mais e-mails desta lista. Pode fechar esta página.
            </p>
          </>
        ) : (
          <>
            <h1 className="font-display text-2xl text-ink">Link inválido</h1>
            <p className="mt-2 text-sm text-ink/60">
              Não conseguimos processar o descadastro. O link pode ter expirado.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
