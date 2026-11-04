'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import Globe from '@/components/Globe';
import { fold } from '@/core/search';
import type { CircuitRow } from '@/lib/circuitData';
import { useFavourites } from '@/lib/favourites';
import { EXTRA_SEARCH } from '@/core/circuitNames';

type Mode = 'globe' | 'list';
type Show = 'all' | 'calendar' | 'historic';
type SortKey = 'name' | 'country' | 'races' | 'first';

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Name A to Z' },
  { key: 'country', label: 'Country' },
  { key: 'races', label: 'Most races' },
  { key: 'first', label: 'Earliest first' },
];
const span = (a: number | null, b: number | null) => (a === null ? '' : a === b ? String(a) : `${a} to ${b}`);

export default function CircuitsExplorer({ rows }: { rows: CircuitRow[] }) {
  const { favs, toggle } = useFavourites();
  const [mode, setMode] = useState<Mode>('globe');
  const [selected, setSelected] = useState<string | null>(null);
  const [show, setShow] = useState<Show>('all');
  const [onlyFavs, setOnlyFavs] = useState(false);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<SortKey>('name');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('fdb:circuitsView');
      if (saved === 'list' || saved === 'globe') setMode(saved);
    } catch {
      /* the globe stays the default */
    }
  }, []);
  const pick = (m: Mode) => {
    setMode(m);
    try {
      localStorage.setItem('fdb:circuitsView', m);
    } catch {
      /* not remembered */
    }
  };

  const visible = useMemo(
    () =>
      rows.filter((r) => {
        if (show === 'calendar' && !r.on_calendar) return false;
        if (show === 'historic' && r.on_calendar) return false;
        if (onlyFavs && !favs.has(`circuit:${r.id}`)) return false;
        return true;
      }),
    [rows, show, onlyFavs, favs]
  );

  const pins = useMemo(
    () => visible.filter((r) => r.lat !== null && r.lon !== null).map((r) => ({ id: r.id, name: r.name, lon: r.lon as number, lat: r.lat as number, current: !!r.on_calendar })),
    [visible]
  );

  const listRows = useMemo(() => {
    const needle = fold(q);
    const list = visible.filter((r) => !needle || fold(`${r.name} ${r.official} ${r.locality ?? ''} ${r.country ?? ''} ${EXTRA_SEARCH[r.id] ?? ''}`).includes(needle));
    list.sort((a, b) => {
      switch (sort) {
        case 'country': return (a.country ?? '').localeCompare(b.country ?? '') || a.name.localeCompare(b.name);
        case 'races': return b.total_races - a.total_races || a.name.localeCompare(b.name);
        case 'first': return (a.first_race_year ?? 9999) - (b.first_race_year ?? 9999) || a.name.localeCompare(b.name);
        default: return a.name.localeCompare(b.name);
      }
    });
    return list;
  }, [visible, q, sort]);

  // which filters are switched on, so they can be named and cleared
  const active = [show === 'calendar' ? "On this season's calendar" : show === 'historic' ? 'Historic only' : null, onlyFavs ? 'Favourites only' : null].filter(Boolean) as string[];
  const clear = () => {
    setShow('all');
    setOnlyFavs(false);
    setQ('');
  };
  const sel = rows.find((r) => r.id === selected) ?? null;
  const place = (r: CircuitRow) => [r.locality, r.country].filter(Boolean).join(', ');
  const heart = (r: CircuitRow) => {
    const on = favs.has(`circuit:${r.id}`);
    return (
      <button className="ib" style={{ width: 36, height: 36 }} onClick={() => toggle(`circuit:${r.id}`)} aria-pressed={on} aria-label={`${on ? 'Remove' : 'Add'} ${r.name} ${on ? 'from' : 'to'} favourites`}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill={on ? '#C2253F' : 'none'} stroke={on ? '#C2253F' : 'currentColor'} strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 21s-7-4.5-9.3-9A5.4 5.4 0 0 1 12 6.2 5.4 5.4 0 0 1 21.3 12C19 16.5 12 21 12 21z" />
        </svg>
      </button>
    );
  };

  return (
    <div>
      <p className="crumb">Circuits</p>
      <div className="between" style={{ margin: '4px 0 22px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 'clamp(34px, 5vw, 46px)', fontWeight: 800 }}>Circuits</h1>
          <p className="muted" style={{ marginTop: 4 }}>{rows.length} circuits, from Silverstone in 1950 to today.</p>
        </div>
        <div className="seg" role="group" aria-label="View">
          <button className={mode === 'globe' ? 'on' : ''} onClick={() => pick('globe')}>Globe</button>
          <button className={mode === 'list' ? 'on' : ''} onClick={() => pick('list')}>List</button>
        </div>
      </div>

      <div className="chips filters" style={{ marginBottom: 12 }} role="group" aria-label="Which circuits to show">
        <button className={`chip${active.length === 0 ? ' on' : ''}`} aria-pressed={active.length === 0} onClick={clear}>All circuits</button>
        <button className={`chip${show === 'calendar' ? ' on' : ''}`} aria-pressed={show === 'calendar'} onClick={() => setShow(show === 'calendar' ? 'all' : 'calendar')}>{show === 'calendar' ? '✓ ' : ''}On this season&apos;s calendar</button>
        <button className={`chip${show === 'historic' ? ' on' : ''}`} aria-pressed={show === 'historic'} onClick={() => setShow(show === 'historic' ? 'all' : 'historic')}>{show === 'historic' ? '✓ ' : ''}Historic only</button>
        <button className={`chip${onlyFavs ? ' on' : ''}`} aria-pressed={onlyFavs} onClick={() => setOnlyFavs(!onlyFavs)}>{onlyFavs ? '✓ ' : ''}Favourites only</button>
      </div>
      <div className={`filter-status${active.length ? ' active' : ''}`} role="status">
        <span>Showing <b>{visible.length}</b> of {rows.length} circuits{active.length ? ` · filters on: ${active.join(' + ')}` : ''}</span>
        {active.length ? <button className="link-btn" onClick={clear}>Clear filters</button> : null}
      </div>

      <div hidden={mode !== 'globe'}>
        <section className="split" style={{ gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: 28 }}>
          <div>
            {pins.length === 0 ? (
              <p className="empty" style={{ marginBottom: 12 }}>
                No circuits match {active.length ? active.join(' + ') : 'these filters'}. <button className="link-btn" onClick={clear}>Clear filters</button>
              </p>
            ) : null}
            <Globe pins={pins} selectedId={selected} onSelect={setSelected} />
          </div>
          <aside className="col" style={{ gap: 16 }}>
            {sel ? (
              <div className="panel" style={{ padding: 18 }}>
                <span className="lbl">Selected</span>
                <h2 style={{ fontSize: 30, color: '#fff', margin: '4px 0' }}>{sel.name}</h2>
                {sel.official !== sel.name ? <p className="sub">{sel.official}</p> : null}
                <p className="sub" style={{ marginTop: 4 }}>{place(sel)}</p>
                <p className="sub" style={{ marginTop: 4 }}>{sel.total_races} races · {span(sel.first_race_year, sel.last_race_year)}</p>
                <Link href={`/circuits/${sel.id}`} className="toggle-link">Open the circuit ›</Link>
              </div>
            ) : (
              <div className="empty">Tap a pin on the globe to see the circuit. {pins.length} {pins.length === 1 ? 'circuit is' : 'circuits are'} shown.</div>
            )}
            <div style={{ border: '1px solid var(--divider)', borderRadius: 14, padding: 16 }}>
              <span className="lbl" style={{ color: 'var(--link)' }}>Key</span>
              <p className="muted" style={{ marginTop: 6, fontSize: 14 }}>Red pins are on this season&apos;s calendar; grey pins are circuits no longer used. Use the List view to search, sort by country or number of races, or compare circuits side by side.</p>
            </div>
          </aside>
        </section>
      </div>

      <div hidden={mode !== 'list'}>
        <div className="between" style={{ marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
          <div className="field" style={{ minWidth: 260 }}>
            <label htmlFor="circuit-search">Search</label>
            <input id="circuit-search" className="text-input" type="search" placeholder="Name, city or country" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="circuit-sort">Sort by</label>
            <select id="circuit-sort" className="text-input" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
              {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
        </div>
        <p className="muted" style={{ marginBottom: 10 }}>{listRows.length === rows.length ? `${rows.length} circuits` : `${listRows.length} of ${rows.length} circuits`}</p>
        {listRows.length === 0 ? <p className="empty">No circuits match.</p> : null}

        <div className="only-wide">
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Circuit</th><th>Location</th><th className="r">Races</th><th>Years</th><th>Status</th><th><span className="sr-only">Favourite</span></th></tr></thead>
              <tbody>
                {listRows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Link className="nm" href={`/circuits/${r.id}`}>{r.name}</Link>
                      {r.official !== r.name ? <><br /><span className="muted" style={{ fontSize: 13 }}>{r.official}</span></> : null}
                    </td>
                    <td>{place(r)}</td>
                    <td className="r num">{r.total_races}</td>
                    <td className="num">{span(r.first_race_year, r.last_race_year)}</td>
                    <td>{r.on_calendar ? <span className="tag">On the calendar</span> : <span className="muted">Historic</span>}</td>
                    <td>{heart(r)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="only-phone">
          <div className="stack">
            {listRows.map((r) => (
              <div key={r.id} className="item">
                <div>
                  <b><Link href={`/circuits/${r.id}`}>{r.name}</Link></b>
                  <div className="acc">{place(r)}</div>
                  <div className="sub">{r.total_races} races · {span(r.first_race_year, r.last_race_year)}</div>
                </div>
                <span className="end">{heart(r)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
