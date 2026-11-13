import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Barlow_Semi_Condensed, Inter } from 'next/font/google';
import './globals.css';
import { DbProvider } from '@/components/DbProvider';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import { ANALYTICS_TOKEN, LAUNCHED, SITE_NAME, SITE_URL } from '@/lib/siteConfig';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const barlow = Barlow_Semi_Condensed({ subsets: ['latin'], weight: ['500', '600', '700', '800'], variable: '--font-barlow', display: 'swap' });

const DESCRIPTION = 'A free, unofficial Formula One encyclopedia: every driver, team, circuit and season since 1950.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_NAME,
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { canonical: '/' },
  // until LAUNCHED is true, every page asks search engines to stay away
  robots: LAUNCHED ? { index: true, follow: true } : { index: false, follow: false },
  openGraph: { title: SITE_NAME, description: DESCRIPTION, url: '/', siteName: SITE_NAME, type: 'website', locale: 'en_GB' },
  twitter: { card: 'summary_large_image', title: SITE_NAME, description: DESCRIPTION },
};

// The site is dark unless a light choice was saved; this applies it before the page paints, so there is no flash
const themeScript = `try{if(localStorage.getItem('fdb:theme')==='light')document.documentElement.dataset.theme='light'}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${barlow.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        {/* An address typed with capital letters goes to its lower-case form before anything else loads. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){var p=location.pathname,l=p.toLowerCase();if(p!==l&&p.indexOf('/_next/')!==0){location.replace(l+location.search+location.hash);}})();",
          }}
        />
        <div className="watermark" aria-hidden="true">
          <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" focusable="false">
            <defs>
              <linearGradient id="wm" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#C2253F" />
                <stop offset="1" stopColor="#7B4FBF" />
              </linearGradient>
            </defs>
            <rect x="27.3" y="14" width="64.8" height="18" rx="9" fill="url(#wm)" />
            <rect x="7.5" y="41" width="64.8" height="18" rx="9" fill="url(#wm)" />
            <rect x="27.3" y="68" width="64.8" height="18" rx="9" fill="url(#wm)" />
          </svg>
        </div>
        <DbProvider>
          <Header />
          <main className="wrap">{children}</main>
          <div className="wrap">
            <Footer />
          </div>
        </DbProvider>
        {LAUNCHED && /^[0-9a-f]{32}$/.test(ANALYTICS_TOKEN) ? (
          <script type="module" src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon={JSON.stringify({ token: ANALYTICS_TOKEN })} />
        ) : null}
      </body>
    </html>
  );
}
