import { NextResponse } from 'next/server';
import { siteUrl } from '@/lib/config';
import { supabaseAuth } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  const supabase = await supabaseAuth();
  await supabase.auth.signOut();
  return NextResponse.redirect(siteUrl(), 303);
}
