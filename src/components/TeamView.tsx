'use client';

import Link from '@/components/AppLink';
import { useEffect, useRef, useState } from 'react';
import { REGULATION_NOTE, regulationLines } from '@/core/eraSpecs';
import type { Car, TeamPageData } from '@/lib/teamData';
import { fmtNum } from '@/lib/format';
import { useFavourites } from '@/lib/favourites';
import Tile from '@/components/Tile';
import type { StatKey } from '@/core/types';
import { statHref } from '@/lib/statLinks';

type Tab = 'overview' | 'cars' | 'drivers';
const PAGE = 5; // car cards added each time
const AHEAD = 700; // a card loads its photo when it is within this many pixels of the screen

// A smaller copy of the picture (Wikimedia makes these on request): lighter to download
const smaller = (url: string): string => url.replace(/\/\d+px-/, '/500px-');

const engineLine = (c: Car): string => {
  let extra: Record<string, string> = {};
  try {
    extra = c.engine_info ? JSON.parse(c.engine_info) : {};
  } catch {
    extra = {};
  }
  const cap = extra.capacity ? `${extra.capacity} L` : null;
  const spec = [cap, extra.configuration, extra.aspiration].filter(Boolean).join(' ');
  const name = [c.engine_maker && c.engine_name?.startsWith(c.engine_maker) ? '' : c.engine_maker, c.engine_name].filter(Boolean).join(' ');
  return [name, spec ? `(${spec})` : ''].filter(Boolean).join(' ') || 'Not recorded';
};

const span = (a: number | null, b: number | null) => (a === null ? '' : a === b ? String(a) : `${a} to ${b}`);

// true once the element is within AHEAD pixels of the screen, so photos load as you scroll toward them
function useNear() {
  const ref = useRef<HTMLElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    if (typeof IntersectionObserver === 'undefined') {
      setNear(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          obs.disconnect();
        }
      },
      { rootMargin: `0px 0px ${AHEAD}px 0px` }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [near]);
  return { ref, near };
}

function CarCard({ car }: { car: Car }) {
  const { ref, near } = useNear();
  const [tapped, setTapped] = useState(false);
  const [original, setOriginal] = useState(false); // the small copy did not exist: use the original
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [open, setOpen] = useState(false);
  const title = car.full_name ?? car.model ?? 'Unnamed car';
  const regs = regulationLines(car.year);
  const wanted = near || tapped;

  return (
    <article className="panel" style={{ padding: 22 }} ref={ref}>
      <span className="lbl">{car.year}</span>
      <h2 style={{ fontSize: 32, color: '#fff', margin: '2px 0 14px' }}>{title}</h2>

      <div className="car-photo">
        <span className="car-name">{car.model ?? title}</span>
        {car.img && !wanted ? <button className="car-tap" onClick={() => setTapped(true)}>Loading as you scroll… tap to load now</button> : null}
        {car.img && wanted && !failed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={attempt}
            src={original ? car.img : smaller(car.img)}
            alt={`${title}, ${car.year}`}
            loading="lazy"
            onError={() => {
              if (!original && smaller(car.img as string) !== car.img) setOriginal(true);
              else setFailed(true);
            }}
          />
        ) : null}
      </div>
      {car.img && failed ? (
        <button className="car-credit" onClick={() => { setFailed(false); setOriginal(false); setAttempt(attempt + 1); }}>
          The photo could not be loaded. Tap to try again.
        </button>
      ) : car.img ? (
        <p className="car-credit">
          Photo: {car.img_author ?? 'Unknown'} · {car.img_licence ?? 'open licence'} ·{' '}
          {car.img_page ? <a href={car.img_page} rel="noopener">Wikimedia Commons</a> : 'Wikimedia Commons'}
        </p>
      ) : null}

      <div className="g2" style={{ marginTop: 14, gap: 18 }}>
        <div><span className="lbl" style={{ color: 'var(--oncardmuted)' }}>Engine</span><p>{engineLine(car)}</p></div>
        {car.tyre_maker ? <div><span className="lbl" style={{ color: 'var(--oncardmuted)' }}>Tyres</span><p>{car.tyre_maker}</p></div> : null}
      </div>

      {car.races ? (
        <div className="g6" style={{ marginTop: 16 }}>
          <Tile label="Races" value={car.races} />
          <Tile label="Wins" value={car.wins ?? 0} />
          <Tile label="Poles" value={car.poles} />
          <Tile label="Podiums" value={car.podiums} />
          <Tile label="Points" value={fmtNum(car.points)} />
          <Tile label="Position" value={car.pos ? `P${car.pos}` : '–'} />
        </div>
      ) : null}

      {regs.length > 0 ? (
        <div>
          <button className="toggle-link" onClick={() => setOpen(!open)} aria-expanded={open}>
            {open ? 'Hide regulations and power' : 'Regulations and power ›'}
          </button>
          {open ? (
            <div style={{ marginTop: 8, borderTop: '1px solid rgba(255,255,255,.14)', paddingTop: 12 }}>
              <div className="g3">
                {regs.map((r) => (
                  <div key={r.label}>
                    <span className="lbl" style={{ color: 'var(--oncardmuted)' }}>{r.label}</span>
                    <p style={{ fontSize: 14 }}>{r.value}</p>
                  </div>
                ))}
              </div>
              <p className="sub" style={{ marginTop: 12, fontSize: 12 }}>{REGULATION_NOTE}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function Cars({ cars }: { cars: Car[] }) {
  const [visible, setVisible] = useState(PAGE);
  const shown = cars.slice(0, visible);
  const left = cars.length - shown.length;
  return (
    <div className="col" style={{ gap: 18 }}>
      {shown.map((c) => <CarCard key={c.car_id} car={c} />)}
      {left > 0 ? (
        <button className="btn" style={{ alignSelf: 'flex-start' }} onClick={() => setVisible(visible + PAGE)}>
          Show {Math.min(PAGE, left)} more ({left} seasons left)
        </button>
      ) : null}
      <p className="muted" style={{ fontSize: 12, maxWidth: '80ch' }}>
        Car models, engines and tyre suppliers: F1DB (CC BY 4.0). Photos: Wikipedia and Wikimedia Commons contributors, credited under each picture.
      </p>
    </div>
  );
}

export default function TeamView({ data }: { data: TeamPageData }) {
  const { profile: p, members, drivers, cars } = data;
  const { favs, toggle } = useFavourites();
  const [tab, setTab] = useState<Tab>('overview');
  const [more, setMore] = useState(false);
  const fav = favs.has(`team:${p.team_id}`);
  const lineage = members.length > 1;
  const bio = p.bio?.trim();
  const years = span(p.first_season, p.last_season);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    ...(cars.length > 0 ? [{ key: 'cars' as const, label: 'Cars' }] : []),
    { key: 'drivers', label: `Drivers (${drivers.length})` },
  ];
  // each tile opens the list of records behind it, when there is at least one
  const tiles: { label: string; n: number; stat: StatKey }[] = [
    { label: 'Starts', n: p.total_starts, stat: 'starts' },
    { label: 'Wins', n: p.total_wins, stat: 'wins' },
    { label: 'Poles', n: p.total_poles, stat: 'poles' },
    { label: 'Podiums', n: p.total_podiums, stat: 'podiums' },
    { label: 'Team titles', n: p.constructors_titles, stat: 'constructors_titles' },
    { label: 'Driver titles', n: p.drivers_titles, stat: 'drivers_titles' },
    { label: 'Points', n: p.total_points, stat: 'points' },
  ];
  const driverRows = (list: typeof drivers) => (
    <div className="tbl-wrap">
      <table className="tbl">
        <thead><tr><th>Driver</th><th>Seasons</th><th className="r">Races</th><th className="r">Wins</th></tr></thead>
        <tbody>
          {list.map((d) => (
            <tr key={d.driver_id}>
              <td className="nm"><Link href={`/drivers/${d.driver_id}`}>{d.name}</Link></td>
              <td className="num">{span(d.from_year, d.to_year)}</td>
              <td className="r num">{d.races}</td>
              <td className="r num nm">{d.wins}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div>
      <p className="crumb"><Link href="/teams">Teams</Link> › {p.name}</p>

      <section className="between" style={{ alignItems: 'flex-end', flexWrap: 'wrap', margin: '6px 0 22px', gap: 20 }}>
        <div>
          <h1 className="hero-name">{p.name}</h1>
          <p className="muted" style={{ marginTop: 6 }}>
            {[p.nationality, years, lineage ? `${members.length} names in this lineage` : null].filter(Boolean).join(' · ')}
          </p>
          <div className="chips" style={{ marginTop: 12 }}>
            {p.constructors_titles > 0 ? <span className="tag">{p.constructors_titles} constructors&apos; {p.constructors_titles === 1 ? 'title' : 'titles'}</span> : null}
            {p.drivers_titles > 0 ? <span className="tag">{p.drivers_titles} drivers&apos; {p.drivers_titles === 1 ? 'title' : 'titles'}</span> : null}
          </div>
        </div>
        <div className="row">
          <button className={`btn${fav ? ' fav-on' : ''}`} aria-pressed={fav} onClick={() => toggle(`team:${p.team_id}`)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill={fav ? '#FFFFFF' : 'none'} stroke={fav ? '#FFFFFF' : 'currentColor'} strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 21s-7-4.5-9.3-9A5.4 5.4 0 0 1 12 6.2 5.4 5.4 0 0 1 21.3 12C19 16.5 12 21 12 21z" />
            </svg>
            {fav ? 'Saved to favourites' : 'Add to favourites'}
          </button>
        </div>
      </section>

      <section className="g7">
        {tiles.map((t) => <Tile key={t.label} label={t.label} value={fmtNum(t.n)} href={t.n > 0 ? statHref('team', p.team_id, t.stat) : undefined} />)}
      </section>

      <div className="between" style={{ margin: '28px 0 16px', flexWrap: 'wrap' }}>
        <div className="seg full" role="group" aria-label="Team views">
          {tabs.map((t) => (
            <button key={t.key} className={tab === t.key ? 'on' : ''} onClick={() => setTab(t.key)}>{t.label}</button>
          ))}
        </div>
        {tab === 'cars' ? <span className="muted" style={{ fontSize: 13 }}>One card per season, newest first. Photos load as you scroll.</span> : null}
      </div>

      <section className="split" style={{ gridTemplateColumns: lineage ? 'minmax(0, 1fr) 320px' : 'minmax(0, 1fr)' }}>
        <div className="col" style={{ gap: 20 }}>
          <div hidden={tab !== 'overview'}>
            {bio ? (
              <div>
                <h2 style={{ fontSize: 26, marginBottom: 8 }}>About</h2>
                <p className={`bio${more ? '' : ' clamp'}`}>{bio}</p>
                {bio.length > 320 ? (
                  <button className="toggle-link plain" onClick={() => setMore(!more)}>{more ? 'Show less' : 'Read more'}</button>
                ) : null}
                <p className="src">
                  Source: {p.bio_source_url ? <a className="link" href={p.bio_source_url} rel="noopener">Wikipedia</a> : 'Wikipedia'} ({p.bio_licence ?? 'CC BY-SA 4.0'})
                </p>
              </div>
            ) : (
              <p className="muted">No description available.</p>
            )}
            {drivers.length > 0 ? (
              <div style={{ marginTop: 28 }}>
                <h2 style={{ fontSize: 26, marginBottom: 12 }}>Most successful drivers</h2>
                {driverRows(drivers.slice(0, 8))}
                {drivers.length > 8 ? <button className="toggle-link plain" onClick={() => setTab('drivers')}>Show all {drivers.length} drivers ›</button> : null}
              </div>
            ) : null}
          </div>

          {cars.length > 0 ? <div hidden={tab !== 'cars'}><Cars cars={cars} /></div> : null}

          <div hidden={tab !== 'drivers'}>
            {drivers.length === 0 ? <p className="empty">No race history.</p> : driverRows(drivers)}
            <p className="muted" style={{ marginTop: 10, fontSize: 13 }}>Most wins first.</p>
          </div>
        </div>

        {lineage ? (
          <aside>
            <div className="panel" style={{ padding: 18 }}>
              <span className="lbl">{members[0].lineage} lineage</span>
              <p className="sub" style={{ marginTop: 6, fontSize: 13 }}>
                Combined: {fmtNum(members.reduce((n, m) => n + m.total_wins, 0))} wins · {members.reduce((n, m) => n + m.constructors_titles, 0)} constructors&apos; titles · {members.reduce((n, m) => n + m.drivers_titles, 0)} drivers&apos; titles
              </p>
              <div className="stack" style={{ marginTop: 10, gap: 4 }}>
                {members.map((m) =>
                  m.team_id === p.team_id ? (
                    <div key={m.team_id} className="item" style={{ background: 'rgba(255,255,255,.08)', padding: '10px 12px' }}>
                      <b style={{ fontSize: 15 }}>{m.name}</b><span className="end sub num">{span(m.first_season, m.last_season)}</span>
                    </div>
                  ) : (
                    <Link key={m.team_id} href={`/teams/${m.team_id}`} className="item" style={{ background: 'transparent', padding: '10px 12px' }}>
                      <b style={{ fontSize: 15 }}>{m.name}</b><span className="end sub num">{span(m.first_season, m.last_season)}</span>
                    </Link>
                  )
                )}
              </div>
            </div>
          </aside>
        ) : null}
      </section>
    </div>
  );
}
