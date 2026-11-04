'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useRef } from 'react';

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
const BUILT = new Set(['/', '/drivers']);

function toggleTheme() {
  const root = document.documentElement;
  const current = root.dataset.theme ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
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
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);

  // Press / to jump to the search box
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function submit(e: FormEvent) {
    e.preventDefault();
    const q = input.current?.value.trim();
    if (q) router.push(`/ask?q=${encodeURIComponent(q)}`);
  }

  const isOn = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));
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
            <span className="logo-tile" aria-hidden="true">
              <i style={{ height: 14 }} />
              <i style={{ height: 22 }} />
              <i style={{ height: 18 }} />
            </span>
            <span className="logo-word">
              <span>FORMULA</span>
              <b>DB</b>
            </span>
          </Link>
          <nav className="menu" aria-label="Main">
            {items}
          </nav>
          <form className="search" onSubmit={submit} role="search">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <input ref={input} type="search" placeholder="Search, or ask a question" aria-label="Search or ask a question" />
            <kbd>/</kbd>
          </form>
          <span className="grow" />
          <button className="ib" onClick={toggleTheme} aria-label="Switch light and dark mode">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
            </svg>
          </button>
        </div>
      </header>
      <div className="wrap">
        <nav className="pillnav" aria-label="Main">
          {items}
        </nav>
      </div>
    </>
  );
}
