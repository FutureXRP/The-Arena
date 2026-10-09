import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

type CookieToSet = { name: string; value: string; options: CookieOptions };

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function isConfigured(): boolean {
  return Boolean(url && anon && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// Cookie-bound client. Used only to know who is signed in.
export async function supabaseAuth() {
  const store = await cookies();
  return createServerClient(url!, anon!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list: CookieToSet[]) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Called from a Server Component: the middleware refreshes cookies instead.
        }
      },
    },
  });
}

export async function getUser(): Promise<User | null> {
  if (!url || !anon) return null;
  const supabase = await supabaseAuth();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

let admin: SupabaseClient | null = null;

// Service role client. Server only. Every table read and write goes through this.
export function db(): SupabaseClient {
  if (!admin) {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Supabase is not configured');
    admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return admin;
}
