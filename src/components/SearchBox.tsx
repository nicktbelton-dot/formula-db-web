'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { buildIndex, Entry, Group, looksLikeQuestion, Raw, search } from '@/lib/siteSearch';

// The search box in the top bar. Type a name, a year or a place and get matches as you type; a question goes to Ask.
// The list of things to search is one small file, loaded the first time the box is used.
let indexPromise: Promise<Entry[]> | null = null;
function loadIndex(): Promise<Entry[]> {
  if (!indexPromise) {
    indexPromise = fetch('/search-index.json')
      .then((r) => {
        if (!r.ok) throw new Error(`search index ${r.status}`);
        return r.json() as Promise<Raw[]>;
      })
      .then(buildIndex)
      .catch((e) => {
        indexPromise = null; // try again next time
        throw e;
      });
  }
  return indexPromise;
}

type Item = { key: string; label: string; sub: string; href: string; ask?: boolean };

export default function SearchBox({ id, autoFocus = false, onDone }: { id: string; autoFocus?: boolean; onDone?: () => void }) {
  const router = useRouter();
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [index, setIndex] = useState<Entry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null);
  const box = useRef<HTMLFormElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);

  const ensureIndex = useCallback(() => {
    if (index || failed) return;
    loadIndex().then(setIndex).catch(() => setFailed(true));
  }, [index, failed]);

  // press / anywhere to jump to the main search box
  useEffect(() => {
    if (id !== 'site-search') return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA' && !(e.target as HTMLElement | null)?.isContentEditable) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [id]);

  useEffect(() => {
    if (autoFocus) input.current?.focus();
  }, [autoFocus]);

  // close when clicking elsewhere
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (box.current?.contains(t) || list.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const place = useCallback(() => {
    const el = box.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const below = window.innerHeight - r.bottom - 16;
    setPos({ top: r.bottom + 6, left: r.left, width: Math.max(r.width, 360), maxHeight: Math.max(220, Math.min(520, below)) });
  }, []);
  useLayoutEffect(() => {
    if (!open) return;
    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open, place, text]);

  const query = text.trim();
  const groups: Group[] = useMemo(() => (index && query ? search(index, query) : []), [index, query]);
  const question = query ? looksLikeQuestion(query) : false;

  // one flat list, so the arrow keys move through everything
  const { items, sections } = useMemo(() => {
    const out: Item[] = [];
    const secs: { title: string | null; items: Item[] }[] = [];
    const askItem: Item = { key: 'ask', label: `Ask: ${query}`, sub: 'Answer this as a question', href: `/ask?q=${encodeURIComponent(query)}`, ask: true };
    if (query && question) {
      out.push(askItem);
      secs.push({ title: null, items: [askItem] });
    }
    for (const g of groups) {
      const gi = g.hits.map((h) => ({ key: `${g.kind}-${h.entry.href}`, label: h.entry.title, sub: h.entry.sub, href: h.entry.href }));
      out.push(...gi);
      secs.push({ title: g.label, items: gi });
    }
    if (query && !question) {
      out.push(askItem);
      secs.push({ title: groups.length ? 'Or ask it as a question' : null, items: [askItem] });
    }
    return { items: out, sections: secs };
  }, [groups, query, question]);

  // the best match (or the Ask line for a question) is highlighted, so Enter takes it
  useEffect(() => setActive(items.length > 0 ? 0 : -1), [items.length, query]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (href: string) => {
    setOpen(false);
    setText('');
    input.current?.blur();
    onDone?.();
    // the same page with a different car chosen: load it afresh so it reads the new address
    if (href.split('?')[0] === window.location.pathname && href.includes('?')) window.location.href = href;
    else router.push(href);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!query) return;
    const chosen = items[active] ?? items[0];
    go(chosen ? chosen.href : `/ask?q=${encodeURIComponent(query)}`);
  };

  const flatIndex = (item: Item) => items.findIndex((i) => i.key === item.key);

  const dropdown =
    open && pos && query ? (
      <div ref={list} className="search-list" role="listbox" id={`${id}-list`} style={{ top: pos.top, left: pos.left, width: pos.width, maxHeight: pos.maxHeight }}>
        {!index && !failed ? <p className="sl-note">Loading the search index…</p> : null}
        {failed ? <p className="sl-note">Search could not load. Press Enter to ask it as a question instead.</p> : null}
        {index && groups.length === 0 && !question ? <p className="sl-note">No names match &ldquo;{query}&rdquo;.</p> : null}
        {sections.map((sec, si) => (
          <div key={si}>
            {sec.title ? <p className="sl-group">{sec.title}</p> : null}
            {sec.items.map((it) => {
              const i = flatIndex(it);
              return (
                <button key={it.key} role="option" aria-selected={i === active} className={`sl-opt${it.ask ? ' ask' : ''}`} onMouseEnter={() => setActive(i)} onClick={() => go(it.href)}>
                  <span className="sl-label">{it.ask ? <span className="sl-ask">?</span> : null}{it.label}</span>
                  {it.sub ? <span className="sl-sub">{it.sub}</span> : null}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    ) : null;

  return (
    <form className="search" role="search" ref={box} onSubmit={submit}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" />
      </svg>
      <input
        id={id}
        ref={input}
        type="search"
        role="combobox"
        aria-expanded={open && !!query}
        aria-controls={`${id}-list`}
        autoComplete="off"
        placeholder="Search, or ask a question"
        aria-label="Search the site, or ask a question"
        value={text}
        onFocus={() => {
          ensureIndex();
          setOpen(true);
        }}
        onChange={(e) => {
          ensureIndex();
          setText(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
            setActive((a) => Math.min(a + 1, items.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === 'Escape') {
            setOpen(false);
            input.current?.blur();
          }
        }}
      />
      <kbd>/</kbd>
      {dropdown ? createPortal(dropdown, document.body) : null}
    </form>
  );
}
