import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { SITE_NAME, siteUrl } from '@/lib/config';
import { getUser } from '@/lib/supabase/server';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: `${SITE_NAME}: where the crowd picks the best ad`, template: `%s | ${SITE_NAME}` },
  description: 'Claim a section, build your ad, and let the crowd judge it head to head. Season winners are paid in XRP.',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
        />
      </head>
      <body>
        <header className="site-header">
          <div className="wrap">
            <Link href="/" className="brand">
              <svg width="34" height="34" viewBox="0 0 34 34" fill="none" stroke="#C6F432" strokeWidth="2.5" aria-hidden="true">
                <ellipse cx="17" cy="17" rx="15" ry="10" />
                <ellipse cx="17" cy="17" rx="7" ry="4" />
              </svg>
              <span className="brand-name">{SITE_NAME}</span>
            </Link>
            <nav className="nav" aria-label="Main">
              <Link className="link" href="/#vote">Vote</Link>
              <Link className="link" href="/#standings">Standings</Link>
              <Link className="link" href="/rules">Rules</Link>
              {user ? (
                <>
                  <Link className="link" href="/dashboard">My sections</Link>
                  <form action="/auth/signout" method="post">
                    <button className="link" type="submit">Sign out</button>
                  </form>
                </>
              ) : (
                <Link className="link" href="/login">Sign in</Link>
              )}
              <Link className="btn" href="/claim">Claim a section</Link>
            </nav>
          </div>
        </header>
        {children}
        <footer className="site-footer">
          <div className="wrap">
            <span>{SITE_NAME}</span>
            <Link href="/rules">Official rules</Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
