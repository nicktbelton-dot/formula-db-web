'use client';

import Link from '@/components/AppLink';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import LogoMark from '@/components/LogoMark';
import SearchBox from '@/components/SearchBox';

const ITEMS = [
  { href: '/', label: 'Home' },
  { href: '/drivers', label: 'Drivers' },
  { href: '/teams', label: 'Teams' },
  { href: '/circuits', label: 'Circuits' },
  { href: '/seasons', label: 'Seasons' },
  { href: '/compare', label: 'Compare' },
  { href: '/records', label: 'Records' },
];
// Sections that exist so far; the others show greyed out until they are built.
const BUILT = new Set(['/', '/drivers', '/teams', '/circuits', '/seasons', '/compare', '/records']);

function toggleTheme() {
  const root = document.documentElement;
  const current = root.dataset.theme === 'light' ? 'light' : 'dark'; // dark is the default
  const next = current === 'dark' ? 'light' : 'dark';
  root.dataset.theme = next;
  try {
    localStorage.setItem('fdb:theme', next);
  } catch {
    /* the choice just will not be remembered */
  }
}

export default function Header() {
  const pathname = usePathname();
  const [mobileSearch, setMobileSearch] = useState(false);

  const isOn = (href: string) =>
    href === '/' ? pathname === '/' : href === '/seasons' ? pathname.startsWith('/seasons') || pathname.startsWith('/races') : pathname.startsWith(href);
  const items = ITEMS.map((i) =>
    BUILT.has(i.href) ? (
      <Link key={i.href} href={i.href} className={isOn(i.href) ? 'on' : ''}>
        {i.label}
      </Link>
    ) : (
      <span key={i.href} className="soon" title="Coming soon">
        {i.label}
      </span>
    )
  );

  return (
    <>
      <header className="nav">
        <div className="wrap nav-in">
          <Link className="logo" href="/" aria-label="Formula DB home">
            <LogoMark />
          </Link>
          <nav className="menu" aria-label="Main">
            {items}
          </nav>
          <SearchBox id="site-search" />
          <button className="ib search-toggle" onClick={() => setMobileSearch(!mobileSearch)} aria-label="Search" aria-expanded={mobileSearch}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
          </button>
          <span className="grow" />
          <Link className="ib" href="/favourites" aria-label="My favourites" title="My favourites">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 21s-7-4.5-9.3-9A5.4 5.4 0 0 1 12 6.2 5.4 5.4 0 0 1 21.3 12C19 16.5 12 21 12 21z" />
            </svg>
          </Link>
          <button className="ib" onClick={toggleTheme} aria-label="Switch light and dark mode">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
            </svg>
          </button>
        </div>
      </header>
      <div className="wrap">
        {mobileSearch ? (
          <div className="mobile-search">
            <SearchBox id="mobile-search" autoFocus onDone={() => setMobileSearch(false)} />
          </div>
        ) : null}
        <nav className="pillnav" aria-label="Main">
          {items}
        </nav>
      </div>
    </>
  );
}
