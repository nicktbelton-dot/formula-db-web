'use client';

import Link from '@/components/AppLink';
import { useEffect, useMemo, useState } from 'react';
import { useDbState } from '@/components/DbProvider';
import { fold } from '@/core/search';
import { groupTeams, TeamBase, TeamRow } from '@/core/teamGroups';
import { useFavourites } from '@/lib/favourites';

type SortKey = 'name' | 'wins' | 'starts' | 'poles' | 'titles' | 'first';
type View = 'table' | 'cards';

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Name A to Z' },
  { key: 'wins', label: 'Most wins' },
  { key: 'starts', label: 'Most starts' },
  { key: 'poles', label: 'Most poles' },
  { key: 'titles', label: "Most constructors' titles" },
  { key: 'first', label: 'Earliest first' },
];
const DECADES = [1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020];
const PAGE = 25;

const value = (t: TeamRow, key: SortKey): number => {
  switch (key) {
    case 'wins': return t.total_wins;
    case 'starts': return t.total_starts;
    case 'poles': return t.total_poles;
    case 'titles': return t.constructors_titles;
    case 'first': return t.first_season ?? 9999;
    default: return 0;
  }
};
const years = (t: TeamRow) =>
  t.first_season == null ? '' : t.first_season === t.last_season ? String(t.first_season) : `${t.first_season} to ${t.last_season}`;
const fmt = (n: number) => n.toLocaleString('en-GB');

function Heart({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button className="ib" style={{ width: 36, height: 36 }} onClick={onClick} aria-pressed={on} aria-label={label}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill={on ? '#C2253F' : 'none'} stroke={on ? '#C2253F' : 'currentColor'} strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 21s-7-4.5-9.3-9A5.4 5.4 0 0 1 12 6.2 5.4 5.4 0 0 1 21.3 12C19 16.5 12 21 12 21z" />
      </svg>
    </button>
  );
}

export default function Teams() {
  const { db, error } = useDbState();
  const { favs, toggle } = useFavourites();
  const [all, setAll] = useState<TeamBase[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [view, setView] = useState<View | null>(null);
  const [sort, setSort] = useState<SortKey>('wins');
  const [q, setQ] = useState('');
  const [separate, setSeparate] = useState(false);
  const [champions, setChampions] = useState(false);
  const [winners, setWinners] = useState(false);
  const [current, setCurrent] = useState(false);
  const [onlyFavs, setOnlyFavs] = useState(false);
  const [nats, setNats] = useState<Set<string>>(new Set());
  const [eras, setEras] = useState<Set<number>>(new Set());
  const [allNats, setAllNats] = useState(false);
  const [page, setPage] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem('fdb:teamsView');
    } catch {
      saved = null;
    }
    setView(saved === 'table' || saved === 'cards' ? saved : window.matchMedia('(max-width: 719px)').matches ? 'cards' : 'table');
  }, []);
  const pick = (v: View) => {
    setView(v);
    try {
      localStorage.setItem('fdb:teamsView', v);
    } catch {
      /* not remembered */
    }
  };

  useEffect(() => {
    if (!db) return;
    db.getAllAsync<TeamBase>(
      `SELECT team_id, name, nationality, first_season, last_season, total_wins, total_starts, total_poles, constructors_titles, team_identity_id,
              CASE WHEN last_season = (SELECT MAX(season_year) FROM race) THEN 1 ELSE 0 END AS is_current,
              (SELECT display_name FROM team_identity ti WHERE ti.team_identity_id = team.team_identity_id) AS lineage,
              (SELECT COUNT(*) FROM team t2 WHERE t2.team_identity_id = team.team_identity_id) AS lineage_size
       FROM team ORDER BY name`
    )
      .then((rows) => {
        setAll(rows);
        setLoaded(true);
      })
      .catch((e) => console.error(e));
  }, [db]);

  const grouped = useMemo(() => groupTeams(all, separate), [all, separate]);

  const natCounts = useMemo(() => {
    const m = new Map<string, number>();
    grouped.forEach((t) => m.set(t.nationality ?? 'Unknown', (m.get(t.nationality ?? 'Unknown') ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([n]) => n);
  }, [grouped]);

  const rows = useMemo(() => {
    const needle = fold(q);
    const list = grouped.filter((t) => {
      if (needle && !t.names.some((n) => fold(n).includes(needle)) && !fold(t.name).includes(needle)) return false;
      if (champions && t.constructors_titles < 1) return false;
      if (winners && t.total_wins < 1) return false;
      if (current && !t.is_current) return false;
      if (onlyFavs && !t.ids.some((id) => favs.has(`team:${id}`))) return false;
      if (nats.size && !nats.has(t.nationality ?? 'Unknown')) return false;
      if (eras.size) {
        const first = t.first_season ?? 0;
        const last = t.last_season ?? 0;
        if (![...eras].some((e) => first <= e + 9 && last >= e)) return false;
      }
      return true;
    });
    list.sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      const diff = sort === 'first' ? value(a, sort) - value(b, sort) : value(b, sort) - value(a, sort);
      return diff || a.name.localeCompare(b.name);
    });
    return list;
  }, [grouped, q, champions, winners, current, onlyFavs, favs, nats, eras, sort]);

  useEffect(() => setPage(0), [q, separate, champions, winners, current, onlyFavs, nats, eras, sort]);

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
    setQ(''); setSeparate(false); setChampions(false); setWinners(false); setCurrent(false); setOnlyFavs(false); setNats(new Set()); setEras(new Set()); setSort('wins');
  };
  const isFav = (t: TeamRow) => t.ids.some((id) => favs.has(`team:${id}`));
  const heart = (t: TeamRow) => (
    <Heart on={isFav(t)} label={`${isFav(t) ? 'Remove' : 'Add'} ${t.name} ${isFav(t) ? 'from' : 'to'} favourites`} onClick={() => toggle(`team:${t.team_id}`)} />
  );
  const th = (label: string, key: SortKey, right = true) => (
    <th className={`${right ? 'r' : ''} ${sort === key ? 'on' : ''}`} aria-sort={sort === key ? 'descending' : 'none'}>
      <button onClick={() => setSort(key)}>{label}{sort === key ? ' ▾' : ''}</button>
    </th>
  );
  const earlier = (t: TeamRow) => (t.members > 1 ? `Includes ${t.members - 1} earlier ${t.members === 2 ? 'name' : 'names'}` : '');

  return (
    <div>
      <p className="crumb">Teams</p>
      <div className="between" style={{ margin: '4px 0 22px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 'clamp(34px, 5vw, 46px)', fontWeight: 800 }}>Teams</h1>
          <p className="muted" style={{ marginTop: 4 }}>
            {loaded ? `${rows.length === grouped.length ? grouped.length : `${rows.length} of ${grouped.length}`} ${separate ? 'team names' : 'teams'}, 1950 to today. Sorted by ${sortLabel.toLowerCase()}.` : 'Loading the teams…'}
          </p>
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
            <span className="muted" style={{ fontSize: 13 }}>Sort: {sortLabel}{filterCount ? ` · ${filterCount} filter${filterCount === 1 ? '' : 's'}` : ''}</span>
            <span className="link">Sort and filter {filtersOpen ? '▴' : '▾'}</span>
          </button>
          <aside className={`filterbox${filtersOpen ? ' open' : ''}`} aria-label="Sort and filter">
            <div className="between"><h2 style={{ fontSize: 20 }}>Sort and filter</h2><button style={{ all: 'unset', cursor: 'pointer', fontSize: 13, color: 'var(--link)', fontWeight: 600 }} onClick={reset}>Reset</button></div>
            <div className="field"><label htmlFor="team-search">Search</label><input id="team-search" className="text-input" type="search" placeholder="Name" value={q} onChange={(e) => setQ(e.target.value)} /></div>
            <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className="legend" style={{ padding: '0 0 6px' }}>Sort by</legend>
              {SORTS.map((s) => (
                <label key={s.key} className="check"><input type="radio" name="sort" checked={sort === s.key} onChange={() => setSort(s.key)} /> {s.label}</label>
              ))}
            </fieldset>
            <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className="legend" style={{ padding: '0 0 6px' }}>Show only</legend>
              <label className="check"><input type="checkbox" checked={champions} onChange={(e) => setChampions(e.target.checked)} /> Constructors&apos; champions</label>
              <label className="check"><input type="checkbox" checked={winners} onChange={(e) => setWinners(e.target.checked)} /> Race winners</label>
              <label className="check"><input type="checkbox" checked={current} onChange={(e) => setCurrent(e.target.checked)} /> Racing this season</label>
              <label className="check"><input type="checkbox" checked={onlyFavs} onChange={(e) => setOnlyFavs(e.target.checked)} /> Favourites only</label>
            </fieldset>
            <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className="legend" style={{ padding: '0 0 6px' }}>Names</legend>
              <label className="check"><input type="checkbox" checked={separate} onChange={(e) => setSeparate(e.target.checked)} /> List every name separately</label>
              <p className="muted" style={{ fontSize: 12 }}>By default a team that was renamed or taken over is one row.</p>
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
          {loaded && rows.length === 0 ? <p className="empty">No teams match these filters. <button className="link-btn" onClick={reset}>Clear filters</button></p> : null}

          {view === 'table' && rows.length > 0 ? (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th className="r">#</th>
                    {th('Team', 'name', false)}
                    {th('Seasons', 'first', false)}
                    {th('Starts', 'starts')}
                    {th('Wins', 'wins')}
                    {th('Poles', 'poles')}
                    {th('Titles', 'titles')}
                    <th><span className="sr-only">Favourite</span></th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((t, i) => (
                    <tr key={t.team_id}>
                      <td className="r num muted">{page * PAGE + i + 1}</td>
                      <td>
                        <Link className="nm" href={`/teams/${t.team_id}`}>{t.name}</Link><br />
                        <span className="muted" style={{ fontSize: 13 }}>{[t.nationality, earlier(t)].filter(Boolean).join(' · ')}</span>
                      </td>
                      <td className="num">{years(t)}</td>
                      <td className="r num">{fmt(t.total_starts)}</td>
                      <td className="r num nm">{fmt(t.total_wins)}</td>
                      <td className="r num">{fmt(t.total_poles)}</td>
                      <td className="r num">{t.constructors_titles}</td>
                      <td>{heart(t)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {view === 'cards' && rows.length > 0 ? (
            <div className="stack">
              {pageRows.map((t) => (
                <div key={t.team_id} className="item">
                  <div>
                    <b><Link href={`/teams/${t.team_id}`}>{t.name}</Link></b>
                    <div className="acc">{[t.nationality, years(t)].filter(Boolean).join(' · ')}</div>
                    {earlier(t) ? <div className="sub">{earlier(t)}</div> : null}
                  </div>
                  <span className="end num">
                    {sort === 'name' || sort === 'first' ? `${fmt(t.total_wins)} wins` : `${fmt(value(t, sort))} ${SORTS.find((s) => s.key === sort)?.label.replace('Most ', '').replace("constructors' ", '').toLowerCase()}`}
                  </span>
                  {heart(t)}
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
