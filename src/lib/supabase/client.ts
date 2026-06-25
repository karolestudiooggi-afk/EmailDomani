import { createBrowserClient } from '@supabase/ssr';

/** Client de browser (anon) com sessão persistida em cookie — usado no front. */
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
