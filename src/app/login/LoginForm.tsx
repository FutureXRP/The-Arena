'use client';

import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/browser';

export function LoginForm({ next }: { next: string }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState('sending');
    const { error } = await supabaseBrowser().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    setState(error ? 'error' : 'sent');
  }

  if (state === 'sent') {
    return <div className="notice">Check {email} for your sign-in link.</div>;
  }

  return (
    <form className="stack" onSubmit={submit} style={{ maxWidth: 420 }}>
      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      {state === 'error' && <p className="error" role="alert">Could not send the link. Try again in a minute.</p>}
      <button className="btn" type="submit" disabled={state === 'sending'}>
        {state === 'sending' ? 'Sending' : 'Email me a link'}
      </button>
    </form>
  );
}
