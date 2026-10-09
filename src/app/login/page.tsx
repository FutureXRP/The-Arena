import type { Metadata } from 'next';
import { safeNext } from '@/lib/validate';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const sp = await searchParams;
  return (
    <main className="narrow stack">
      <h1 className="h2">Sign in</h1>
      <p className="muted">Enter your email and we will send a sign-in link. No password needed.</p>
      {sp.error && <p className="error" role="alert">That link did not work. Request a new one.</p>}
      <LoginForm next={safeNext(sp.next)} />
    </main>
  );
}
