'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Timeline } from '@/core/timelineData';
import type { Battle, DriverPageData } from '@/lib/driverData';
import { useFavourites } from '@/lib/favourites';
import Tile from '@/components/Tile';

type ViewKey = 'career' | 'qualifying' | 'teammates';

const longDate = (iso: string | null) =>
  iso ? new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : '';
const fmt = (n: number) => (Number.isInteger(n) ? n.toLocaleString('en-GB') : n.toLocaleString('en-GB', { maximumFractionDigits: 1 }));
const short = (name: string) => (name.length > 14 ? `${name.slice(0, 13)}…` : name);

function Score({ a, b }: { a: number; b: number }) {
  return (
    <span className="score num">
      <b className={a > b ? 'win' : ''}>{fmt(a)}</b> – <b className={b > a ? 'win' : ''}>{fmt(b)}</b>
    </span>
  );
}

function CareerTimeline({ t }: { t: Timeline }) {
  const [sel, setSel] = useState<number | null>(null);
  const n = t.years.length;
  if (n === 0) return null;
  const w = 100 / n;
  const picked = sel === null ? null : t.years[sel];
  // first, middle and last season; a short career would repeat a year, so each year is listed once
  const labels = Array.from(new Set(n > 1 ? [t.years[0].year, t.years[Math.floor((n - 1) / 2)].year, t.years[n - 1].year] : [t.years[0].year]));

  return (
    <div>
      <div className="tl-plot">
        <div className="lane">
          <span className="t">Titles</span>
          <div className="bar" style={{ height: 22 }}>
            {t.years.map((y, i) =>
              y.champion ? (
                <span key={y.year} className="star" style={{ left: `${i * w + w / 2}%` }} aria-hidden="true">★</span>
              ) : null
            )}
          </div>
        </div>
        {t.lanes.map((l) => (
          <div className="lane" key={l.team_id}>
            <span className="t">{short(l.name)}</span>
            <div className="bar">
              {l.runs.map((r, k) => (
                <i key={k} style={{ left: `${r.from * w}%`, width: `${(r.to - r.from + 1) * w}%` }} />
              ))}
            </div>
          </div>
        ))}
        <div className="lane" style={{ height: 52, marginTop: 8 }}>
          <span className="t">Wins</span>
          <div className="tl-bars">
            {t.years.map((y) => (
              <span key={y.year} style={{ height: t.maxWins > 0 ? `${(y.wins / t.maxWins) * 100}%` : 0 }} />
            ))}
          </div>
        </div>
        <div className="lane" style={{ height: 52 }}>
          <span className="t">Poles</span>
          <div className="tl-bars">
            {t.years.map((y) => (
              <span key={y.year} style={{ height: t.maxPoles > 0 ? `${(y.poles / t.maxPoles) * 100}%` : 0 }} />
            ))}
          </div>
        </div>
        <div className="tl-hit" role="group" aria-label="Seasons">
          {t.years.map((y, i) => (
            <button key={y.year} className={sel === i ? 'on' : ''} onClick={() => setSel(sel === i ? null : i)} aria-pressed={sel === i} aria-label={`${y.year} season`} />
          ))}
        </div>
      </div>
      <div className="years">
        <div />
        <div>{labels.map((y) => <span key={y}>{y}</span>)}</div>
      </div>
      <p className="sub" style={{ marginTop: 12, minHeight: 22 }}>
        {picked
          ? `${picked.year}: ${picked.teams.length ? picked.teams.map((x) => x.team).join(', ') : 'did not race'} · ${picked.wins} ${picked.wins === 1 ? 'win' : 'wins'} · ${picked.podiums} ${picked.podiums === 1 ? 'podium' : 'podiums'} · ${picked.poles} ${picked.poles === 1 ? 'pole' : 'poles'} · ${fmt(picked.points)} points${picked.position ? ` · finished P${picked.position}` : ''}${picked.champion ? ' · World Champion' : ''}`
          : 'Tap a season for its details.'}
      </p>
    </div>
  );
}

function Teammates({ battles }: { battles: Battle[] }) {
  if (battles.length === 0) return <p className="empty">No teammate comparisons for this driver.</p>;
  const total = battles.reduce(
    (t, b) => ({ qa: t.qa + b.q_ahead, qb: t.qb + b.q_behind, ra: t.ra + b.ahead, rb: t.rb + b.behind }),
    { qa: 0, qb: 0, ra: 0, rb: 0 }
  );
  const years = Array.from(new Set(battles.map((b) => b.year)));
  return (
    <div className="col" style={{ gap: 18 }}>
      <div className="panel">
        <h2 style={{ fontSize: 22, color: '#fff' }}>Against all teammates</h2>
        <div className="g3" style={{ marginTop: 14 }}>
          <div><span className="lbl">Qualifying</span><p style={{ fontSize: 26, fontWeight: 700 }}><Score a={total.qa} b={total.qb} /></p></div>
          <div><span className="lbl">Race finishes</span><p style={{ fontSize: 26, fontWeight: 700 }}><Score a={total.ra} b={total.rb} /></p></div>
          <div><span className="lbl">Seasons</span><p style={{ fontSize: 26, fontWeight: 700 }}>{years.length}</p></div>
        </div>
        <p className="sub" style={{ marginTop: 12, fontSize: 12 }}>The driver&apos;s own score comes first. Race finishes count races where both finished. Qualifying uses the starting grid before 1994.</p>
      </div>
      {years.map((year) => (
        <div key={year}>
          <h3 style={{ fontSize: 22, margin: '0 0 8px' }}>{year}</h3>
          <div className="stack">
            {battles.filter((b) => b.year === year).map((b) => (
              <div key={`${year}-${b.mate_id}`} className="panel" style={{ padding: 16 }}>
                <b>vs {b.mate}</b>
                <span className="sub"> · {b.team} · {b.shared} races</span>
                <div className="g3" style={{ marginTop: 10 }}>
                  <div><span className="lbl">Qualifying</span><p style={{ fontSize: 20, fontWeight: 700 }}><Score a={b.q_ahead} b={b.q_behind} /></p></div>
                  <div><span className="lbl">Race finishes</span><p style={{ fontSize: 20, fontWeight: 700 }}><Score a={b.ahead} b={b.behind} /></p></div>
                  <div><span className="lbl">Points</span><p style={{ fontSize: 20, fontWeight: 700 }}><Score a={b.pts} b={b.mate_pts} /></p></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DriverView({ data }: { data: DriverPageData }) {
  const { profile: p, stints, timeline, qSum, qSeasons, battles } = data;
  const { favs, toggle } = useFavourites();
  const [view, setView] = useState<ViewKey>('career');
  const [more, setMore] = useState(false);
  const fav = favs.has(`driver:${p.driver_id}`);

  const views: { key: ViewKey; label: string }[] = [
    { key: 'career', label: 'Career' },
    ...(qSum ? [{ key: 'qualifying' as const, label: 'Qualifying' }] : []),
    ...(battles.length > 0 ? [{ key: 'teammates' as const, label: 'Teammates' }] : []),
  ];
  const tiles: [string, string][] = [
    ['Starts', fmt(p.career_starts)],
    ['Wins', fmt(p.career_wins)],
    ['Poles', fmt(p.career_poles)],
    ['Podiums', fmt(p.career_podiums)],
    ['Fastest laps', fmt(p.career_fastest_laps ?? 0)],
    ['Titles', fmt(p.championships)],
    ['Points', fmt(p.career_points ?? 0)],
  ];
  const years = p.first_season ? (p.first_season === p.last_season ? String(p.first_season) : `${p.first_season} to ${p.last_season}`) : '';
  const initials = `${p.given_name?.[0] ?? ''}${p.family_name?.[0] ?? ''}`;
  const bio = p.bio?.trim();

  return (
    <div>
      <p className="crumb"><Link href="/drivers">Drivers</Link> › {p.name}</p>
      <section className="split" style={{ marginTop: 12 }}>
        <aside className="col" style={{ gap: 20 }}>
          <div className="avatar" role="img" aria-label="Portrait placeholder">{initials}</div>
          <div>
            <h1 className="hero-name">{p.name}</h1>
            <p className="muted" style={{ marginTop: 8 }}>
              {[p.nationality, p.date_of_birth ? `born ${longDate(p.date_of_birth)}` : null].filter(Boolean).join(' · ')}
            </p>
            <div className="chips" style={{ marginTop: 12 }}>
              {p.championships > 0 ? <span className="tag">{p.championships} × World Champion</span> : null}
              {years ? <span className="tag">{years}</span> : null}
            </div>
          </div>
          <div className="row">
            <button className="btn" aria-pressed={fav} onClick={() => toggle(`driver:${p.driver_id}`)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill={fav ? '#C2253F' : 'none'} stroke={fav ? '#C2253F' : 'currentColor'} strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 21s-7-4.5-9.3-9A5.4 5.4 0 0 1 12 6.2 5.4 5.4 0 0 1 21.3 12C19 16.5 12 21 12 21z" />
              </svg>
              {fav ? 'Favourite' : 'Add to favourites'}
            </button>
          </div>
          {bio ? (
            <div>
              <p className={`bio${more ? '' : ' clamp'}`}>{bio}</p>
              {bio.length > 320 ? (
                <button className="link" style={{ all: 'unset', cursor: 'pointer', color: 'var(--link)', fontWeight: 600, marginTop: 8, display: 'inline-block' }} onClick={() => setMore(!more)}>
                  {more ? 'Show less' : 'Read more'}
                </button>
              ) : null}
              <p className="src">
                Source: {p.bio_source_url ? <a className="link" href={p.bio_source_url} rel="noopener">Wikipedia</a> : 'Wikipedia'} ({p.bio_licence ?? 'CC BY-SA 4.0'})
              </p>
            </div>
          ) : null}
          {stints.length > 0 ? (
            <div className="panel" style={{ padding: '16px 18px' }}>
              <span className="lbl">Teams</span>
              <div className="stack" style={{ marginTop: 10, gap: 8 }}>
                {[...stints].reverse().map((s) => (
                  <div key={s.team_id} className="between">
                    <b><Link href={`/teams/${s.team_id}`}>{s.team}</Link></b>
                    <span className="sub num">{s.from_year === s.to_year ? s.from_year : `${s.from_year} to ${s.to_year}`}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </aside>

        <div className="col" style={{ gap: 20 }}>
          <div className="g7">
            {tiles.map(([label, value]) => (
              <Tile key={label} label={label} value={value} />
            ))}
          </div>

          {views.length > 1 ? (
            <div className="seg full" role="group" aria-label="Driver views" style={{ alignSelf: 'flex-start' }}>
              {views.map((v) => (
                <button key={v.key} className={view === v.key ? 'on' : ''} onClick={() => setView(v.key)}>{v.label}</button>
              ))}
            </div>
          ) : null}

          {view === 'career' ? (
            <div className="panel" style={{ padding: 24 }}>
              <div className="between"><h2 style={{ fontSize: 26, color: '#fff' }}>Career timeline</h2></div>
              <div style={{ marginTop: 22 }}><CareerTimeline t={timeline} /></div>
            </div>
          ) : null}

          {view === 'qualifying' && qSum ? (
            <div className="col" style={{ gap: 16 }}>
              <div>
                <h2 style={{ fontSize: 26 }}>Qualifying</h2>
                <p className="muted" style={{ marginTop: 4 }}>Qualifying results are available from 1994.</p>
              </div>
              <div className="g4">
                <Tile label="Poles" value={qSum.poles ?? 0} />
                <Tile label="Front rows" value={qSum.front_rows ?? 0} />
                <Tile label="Best" value={qSum.best !== null ? `P${qSum.best}` : '–'} />
                <Tile label="Average" value={qSum.avg !== null ? `P${qSum.avg.toFixed(1)}` : '–'} />
              </div>
              <div className="stack">
                {qSeasons.map((q) => (
                  <div key={q.season_year} className="item">
                    <span className="acc num" style={{ width: 44 }}>{q.season_year}</span>
                    <span>
                      {q.poles > 0 ? `${q.poles} ${q.poles === 1 ? 'pole' : 'poles'} · ` : ''}best P{q.best} · average P{q.avg.toFixed(1)} · {q.races} {q.races === 1 ? 'race' : 'races'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {view === 'teammates' ? <Teammates battles={battles} /> : null}
        </div>
      </section>
    </div>
  );
}
