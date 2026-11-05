import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Barlow_Semi_Condensed, Inter } from 'next/font/google';
import './globals.css';
import { DbProvider } from '@/components/DbProvider';
import Footer from '@/components/Footer';
import Header from '@/components/Header';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const barlow = Barlow_Semi_Condensed({ subsets: ['latin'], weight: ['500', '600', '700', '800'], variable: '--font-barlow', display: 'swap' });

export const metadata: Metadata = {
  title: 'Formula DB',
  description: 'A free, unofficial Formula One encyclopedia: every driver, team, circuit and season since 1950.',
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
        <div className="watermark" aria-hidden="true">
          <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" focusable="false">
            <defs>
              <linearGradient id="wm" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#C2253F" />
                <stop offset="1" stopColor="#7B4FBF" />
              </linearGradient>
            </defs>
            <rect x="14" y="30" width="16" height="40" rx="5" fill="url(#wm)" />
            <rect x="42" y="18" width="16" height="64" rx="5" fill="url(#wm)" />
            <rect x="70" y="24" width="16" height="52" rx="5" fill="url(#wm)" />
          </svg>
        </div>
        <DbProvider>
          <Header />
          <main className="wrap">{children}</main>
          <div className="wrap">
            <Footer />
          </div>
        </DbProvider>
      </body>
    </html>
  );
}
