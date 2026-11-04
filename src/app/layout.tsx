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

// Applies a saved light or dark choice before the page paints, so there is no flash
const themeScript = `try{var t=localStorage.getItem('fdb:theme');if(t)document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${barlow.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
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
