export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Supabase's newer "publishable" key, or the legacy anon key. Either works.
export const SUPABASE_KEY = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!;

export const hasSupabaseEnv = Boolean(SUPABASE_URL && SUPABASE_KEY);

/**
 * Production sets NEXT_PUBLIC_COOKIE_DOMAIN=.progresshub.space so one sign-in covers
 * progresshub.space and fit.progresshub.space. Unset locally: cookies stay host-only.
 */
export const COOKIE_OPTIONS = process.env.NEXT_PUBLIC_COOKIE_DOMAIN
  ? { domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN }
  : undefined;
