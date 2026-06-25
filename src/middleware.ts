import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Rotas que NÃO exigem login:
//  - /login                 (a própria tela de entrada)
//  - /unsubscribe           (destinatário do e-mail clica no rodapé)
//  - /api/track             (pixel/clique, abertos no cliente de e-mail)
//  - /api/unsubscribe       (one-click do Gmail/Yahoo)
//  - /api/cron              (Vercel Cron, protegido por CRON_SECRET)
function isPublic(pathname: string): boolean {
  return (
    pathname.startsWith('/login') ||
    pathname.startsWith('/unsubscribe') ||
    pathname.startsWith('/api/track') ||
    pathname.startsWith('/api/unsubscribe') ||
    pathname.startsWith('/api/cron')
  );
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  if (!user && !isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }
  if (user && pathname.startsWith('/login')) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Protege tudo, exceto assets do Next, favicon e ARQUIVOS DE IMAGEM
    // (senão o middleware barra a logo no /login, onde o usuário ainda não logou).
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)$).*)',
  ],
};
