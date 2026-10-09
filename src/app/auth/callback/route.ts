import { NextResponse } from 'next/server';
import { siteUrl } from '@/lib/config';
import { supabaseAuth } from '@/lib/supabase/server';
import { safeNext } from '@/lib/validate';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = safeNext(searchParams.get('next'));

  if (code) {
    const supabase = await supabaseAuth();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${siteUrl()}${next}`);
  }
  return NextResponse.redirect(`${siteUrl()}/login?error=1`);
}
