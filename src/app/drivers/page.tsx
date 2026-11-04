'use client';

import { useEffect, useMemo, useState } from 'react';
import { useDbState } from '@/components/DbProvider';
import { useFavourites } from '@/lib/favourites';
import { fold } from '@/core/search';

type Driver = {
  driver_id: string;
  name: string;
  family_name: string;
  nationality: string | null;
  first_season: number | null;
  last_season: number | null;
  career_wins: number;
  career_starts: number;
  career_poles: number;
  career_podiums: number;
  championships: number;
  is_current: number;
};
type SortKey = 'name' | 'wins' | 'starts' | 'poles' | 'podiums' | 'titles' | 'first';
type View = 'table' | 'cards';

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Surname A to Z' },
  { key: 'wins', label: 'Most wins' },
  { key: 'starts', label: 'Most starts' },
  { key: 'poles', label: 'Most poles' },
  { key: 'podiums', label: 'Most podiums' },
  { key: 'titles', label: 'Most titles' },
  { key: 'first', label: 'Earliest first' },
];
const DECADES = [1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020];
const PAGE = 25;

const value = (d: Driver, key: SortKey): number => {
  switch (key) {
    case 'wins': return d.career_wins;
    case 'starts': return d.career_starts;
    case 'poles': return d.career_poles;
    case 'podiums': return d.career_podiums;
    case 'titles': return d.championships;
    case 'first': return d.first_season ?? 9999;
    default: return 0;
  }
};

const years = (d: Driver) =>
  d.first_season == null ? '' : d.first_season === d.last_season ? String(d.first_season) : `${d.first_season} to ${d.last_season}`;

function Heart({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button className="ib" style={{ width: 36, height: 36 }} onClick={onClick} aria-pressed={on} aria-label={label}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill={on ? '#C2253F' : 'none'} stroke={on ? '#C2253F' : 'currentColor'} strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 21s-7-4.5-9.3-9A5.4 5.4 0 0 1 12 6.2 5.4 5.4 0 0 1 21.3 12C19 16.5 12 21 12 21z" />
      </svg>
    </button>
  );
}

export default function Drivers() {
  const { db, error } = useDbState();
  const { favs, toggle } = useFavourites();
  const [all, setAll] = useState<Driver[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [view, setView] = useState<View | null>(null);
  const [sort, setSort] = useState<SortKey>('wins');
  const [q, setQ] = useState('');
  const [champions, setChampions] = useState(false);
  const [winners, setWinners] = useState(false);
  const [current, setCurrent] = useState(false);
  const [onlyFavs, setOnlyFavs] = useState(false);
  const [nats, setNats] = useState<Set<string>>(new Set());
  const [eras, setEras] = useState<Set<number>>(new Set());
  const [allNats, setAllNats] = useState(false);
  const [page, setPage] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // table on wide screens, cards on phones, unless a choice was saved
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem('fdb:driversView');
    } catch {
      saved = null;
    }
    setView(saved === 'table' || saved === 'cards' ? saved : window.matchMedia('(max-width: 719px)').matches ? 'cards' : 'table');
  }, []);
  const pick = (v: View) => {
    setView(v);
    try {
      localStorage.setItem('fdb:driversView', v);
    } catch {
      /* not remembered */
    }
  };

  useEffect(() => {
    if (!db) return;
    db.getAllAsync<Driver>(
      `SELECT driver_id, given_name || ' ' || family_name AS name, family_name, nationality, first_season, last_season,
              career_wins, career_starts, career_poles, career_podiums, championships,
              CASE WHEN last_season = (SELECT MAX(season_year) FROM race) THEN 1 ELSE 0 END AS is_current
       FROM driver ORDER BY family_name, given_name`
    )
      .then((rows) => {
        setAll(rows);
        setLoaded(true);
      })
      .catch((e) => console.error(e));
  }, [db]);

  const natCounts = useMemo(() => {
    const m = new Map<string, number>();
    all.forEach((d) => m.set(d.nationality ?? 'Unknown', (m.get(d.nationality ?? 'Unknown') ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([n]) => n);
  }, [all]);

  const rows = useMemo(() => {
    const needle = fold(q);
    const list = all.filter((d) => {
      if (needle && !fold(d.name).includes(needle)) return false;
      if (champions && d.championships < 1) return false;
      if (winners && d.career_wins < 1) return false;
      if (current && !d.is_current) return false;
      if (onlyFavs && !favs.has(`driver:${d.driver_id}`)) return false;
      if (nats.size && !nats.has(d.nationality ?? 'Unknown')) return false;
      if (eras.size) {
        const first = d.first_season ?? 0;
        const last = d.last_season ?? 0;
        if (![...eras].some((e) => first <= e + 9 && last >= e)) return false;
      }
      return true;
    });
    list.sort((a, b) => {
      if (sort === 'name') return a.family_name.localeCompare(b.family_name) || a.name.localeCompare(b.name);
      const diff = sort === 'first' ? value(a, sort) - value(b, sort) : value(b, sort) - value(a, sort);
      return diff || a.family_name.localeCompare(b.family_name);
    });
    return list;
  }, [all, q, champions, winners, current, onlyFavs, favs, nats, eras, sort]);

  useEffect(() => setPage(0), [q, champions, winners, current, onlyFavs, nats, eras, sort]);

  const pageRows = rows.slice(page * PAGE, page * PAGE + PAGE);
  const from = rows.length === 0 ? 0 : page * PAGE + 1;
  const to = Math.min(rows.length, page * PAGE + PAGE);
  const sortLabel = SORTS.find((s) => s.key === sort)?.label ?? '';
  const filterCount = [champions, winners, current, onlyFavs].filter(Boolean).length + nats.size + eras.size;
  const flip = <T,>(set: Set<T>, item: T) => {
    const next = new Set(set);
    if (next.has(item)) next.delete(item);
    else next.add(item);
    return next;
  };
  const reset = () => {
    setQ(''); setChampions(false); setWinners(false); setCurrent(false); setOnlyFavs(false); setNats(new Set()); setEras(new Set()); setSort('wins');
  };
  const heart = (d: Driver) => (
    <Heart on={favs.has(`driver:${d.driver_id}`)} label={`${favs.has(`driver:${d.driver_id}`) ? 'Remove' : 'Add'} ${d.name} ${favs.has(`driver:${d.driver_id}`) ? 'from' : 'to'} favourites`} onClick={() => toggle(`driver:${d.driver_id}`)} />
  );
  const th = (label: string, key: SortKey, right = true) => (
    <th className={`${right ? 'r' : ''} ${sort === key ? 'on' : ''}`} aria-sort={sort === key ? 'descending' : 'none'}>
      <button onClick={() => setSort(key)}>{label}{sort === key ? ' â–¾' : ''}</button>
    </th>
  );

  return (
    <div>
      <p className="crumb">Drivers</p>
      <div className="between" style={{ margin: '4px 0 22px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 'clamp(34px, 5vw, 46px)', fontWeight: 800 }}>Drivers</h1>
          <p className="muted" style={{ marginTop: 4 }}>{loaded ? `${all.length} drivers, 1950 to today. Sorted by ${sortLabel.toLowerCase()}.` : 'Loading the driversâ€¦'}</p>
        </div>
        <div className="seg" role="group" aria-label="View">
          <button className={view === 'table' ? 'on' : ''} onClick={() => pick('table')}>Table</button>
          <button className={view === 'cards' ? 'on' : ''} onClick={() => pick('cards')}>Cards</button>
        </div>
      </div>
      {error ? <p className="empty">The data could not be loaded: {error}</p> : null}

      <section className="side">
        <div>
          <button className="filter-toggle" onClick={() => setFiltersOpen(!filtersOpen)} aria-expanded={filtersOpen}>
            <span className="muted" style={{ fontSize: 13 }}>Sort: {sortLabel}{filterCount ? ` Â· ${filterCount} filter${filterCount === 1 ? '' : 's'}` : ''}</span>
            <span className="link">Sort and filter {filtersOpen ? 'â–´' : 'â–¾'}</span>
          </button>
          <aside className={`filterbox${filtersOpen ? ' open' : ''}`} aria-label="Sort and filter">
            <div className="between"><h2 style={{ fontSize: 20 }}>Sort and filter</h2><button className="link" style={{ all: 'unset', cursor: 'pointer', fontSize: 13, color: 'var(--link)', fontWeight: 600 }} onClick={reset}>Reset</button></div>
            <div className="field"><label htmlFor="driver-search">Search</label><input id="driver-search" className="text-input" type="search" placeholder="Name" value={q} onChange={(e) => setQ(e.target.value)} /></div>
            <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className="legend" style={{ padding: '0 0 6px' }}>Sort by</legend>
              {SORTS.map((s) => (
                <label key={s.key} className="check"><input type="radio" name="sort" checked={sort === s.key} onChange={() => setSort(s.key)} /> {s.label}</label>
              ))}
            </fieldset>
            <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className="legend" style={{ padding: '0 0 6px' }}>Show only</legend>
              <label className="check"><input type="checkbox" checked={champions} onChange={(e) => setChampions(e.target.checked)} /> World champions</label>
              <label className="check"><input type="checkbox" checked={winners} onChange={(e) => setWinners(e.target.checked)} /> Race winners</label>
              <label className="check"><input type="checkbox" checked={current} onChange={(e) => setCurrent(e.target.checked)} /> Racing this season</label>
              <label className="check"><input type="checkbox" checked={onlyFavs} onChange={(e) => setOnlyFavs(e.target.checked)} /> Favourites only</label>
            </fieldset>
            <div>
              <span className="legend">Nationality</span>
              <div className="chips" style={{ marginTop: 8 }}>
                {(allNats ? natCounts : natCounts.slice(0, 8)).map((n) => (
                  <button key={n} className={`chip${nats.has(n) ? ' on' : ''}`} aria-pressed={nats.has(n)} onClick={() => setNats(flip(nats, n))}>{n}</button>
                ))}
                {natCounts.length > 8 ? <button className="chip" onClick={() => setAllNats(!allNats)}>{allNats ? 'Fewer' : `+ ${natCounts.length - 8} more`}</button> : null}
              </div>
            </div>
            <div>
              <span className="legend">Era</span>
              <div className="chips" style={{ marginTop: 8 }}>
                {DECADES.map((e) => (
                  <button key={e} className={`chip${eras.has(e) ? ' on' : ''}`} aria-pressed={eras.has(e)} onClick={() => setEras(flip(eras, e))}>{e}s</button>
                ))}
              </div>
            </div>
          </aside>
        </div>

        <div>
          {loaded && rows.length === 0 ? <p className="empty">No drivers match these filters.</p> : null}

          {view === 'table' && rows.length > 0 ? (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th className="r">#</th>
                    {th('Driver', 'name', false)}
                    {th('Seasons', 'first', false)}
                    {th('Starts', 'starts')}
                    {th('Wins', 'wins')}
                    {th('Poles', 'poles')}
                    {th('Podiums', 'podiums')}
                    {th('Titles', 'titles')}
                    <th><span className="sr-only">Favourite</span></th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((d, i) => (
                    <tr key={d.driver_id}>
                      <td className="r num muted">{page * PAGE + i + 1}</td>
                      <td><span className="nm">{d.name}</span><br /><span className="muted" style={{ fontSize: 13 }}>{d.nationality}</span></td>
                      <td className="num">{years(d)}</td>
                      <td className="r num">{d.career_starts}</td>
                      <td className="r num nm">{d.career_wins}</td>
                      <td className="r num">{d.career_poles}</td>
                      <td className="r num">{d.career_podiums}</td>
                      <td className="r num">{d.championships}</td>
                      <td>{heart(d)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {view === 'cards' && rows.length > 0 ? (
            <div className="stack">
              {pageRows.map((d) => (
                <div key={d.driver_id} className="item">
                  <div>
                    <b>{d.name}</b>
                    <div className="acc">{[d.nationality, years(d)].filter(Boolean).join(' Â· ')}</div>
                  </div>
                  <span className="end num">{sort === 'name' || sort === 'first' ? `${d.career_wins} wins` : `${value(d, sort)} ${SORTS.find((s) => s.key === sort)?.label.replace('Most ', '').toLowerCase()}`}</span>
                  {heart(d)}
                </div>
              ))}
            </div>
          ) : null}

          {rows.length > 0 ? (
            <div className="between" style={{ marginTop: 16, flexWrap: 'wrap' }}>
              <span className="muted">Showing {from} to {to} of {rows.length}</span>
              <div className="row">
                <button className="btn" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
                <button className="btn pri" disabled={to >= rows.length} onClick={() => setPage(page + 1)}>Next</button>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
