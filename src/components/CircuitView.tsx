'use client';

import Link from 'next/link';
import { useState } from 'react';
import Tile from '@/components/Tile';
import TrackCard from '@/components/TrackCard';
import type { CircuitPageData } from '@/lib/circuitData';
import { shortDate } from '@/lib/format';
import { useFavourites } from '@/lib/favourites';
import { layoutFor, layoutLabel } from '@/lib/layouts';

const INITIAL = 15;
const span = (a: number | null, b: number | null) => (a === null ? '' : a === b ? String(a) : `${a} to ${b}`);

export default function CircuitView({ data }: { data: CircuitPageData }) {
  const { profile: p, layouts, races, top } = data;
  const { favs, toggle } = useFavourites();
  const [all, setAll] = useState(false);
  const [more, setMore] = useState(false);
  const fav = favs.has(`circuit:${p.id}`);
  const place = [p.locality, p.country].filter(Boolean).join(', ');
  const bio = p.bio?.trim();
  const shown = all ? races : races.slice(0, INITIAL);
  const newest = layouts.length > 0 ? layouts[layouts.length - 1] : null;

  return (
    <div>
      <p className="crumb"><Link href="/circuits">Circuits</Link> › {p.name}</p>

      <section className="between" style={{ alignItems: 'flex-end', flexWrap: 'wrap', margin: '6px 0 22px', gap: 20 }}>
        <div>
          <h1 className="hero-name">{p.name}</h1>
          <p className="muted" style={{ marginTop: 6 }}>
            {[p.official !== p.name ? p.official : null, place || 'Unknown location'].filter(Boolean).join(' · ')}
          </p>
        </div>
        <button className="btn" aria-pressed={fav} onClick={() => toggle(`circuit:${p.id}`)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill={fav ? '#C2253F' : 'none'} stroke={fav ? '#C2253F' : 'currentColor'} strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 21s-7-4.5-9.3-9A5.4 5.4 0 0 1 12 6.2 5.4 5.4 0 0 1 21.3 12C19 16.5 12 21 12 21z" />
          </svg>
          {fav ? 'Favourite' : 'Add to favourites'}
        </button>
      </section>

      <section className="g4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
        <Tile label="Races" value={p.total_races} />
        <Tile label="First race" value={p.first_race_year ?? '–'} />
        <Tile label="Last race" value={p.last_race_year ?? '–'} />
        {layouts.length > 0 ? <Tile label={layouts.length === 1 ? 'Track layout' : 'Track layouts'} value={layouts.length} /> : null}
        {newest?.length_km ? <Tile label="Current length" value={`${newest.length_km.toFixed(3)} km`} /> : null}
      </section>

      <section className="split" style={{ gridTemplateColumns: layouts.length > 0 || bio ? 'minmax(0, 1fr) 340px' : 'minmax(0, 1fr)', marginTop: 28 }}>
        <div className="col" style={{ gap: 20 }}>
          {layouts.length > 0 ? <TrackCard layouts={layouts} initial={layouts.length - 1} /> : null}

          <div>
            <h2 style={{ fontSize: 26, marginBottom: 12 }}>Winners and pole sitters</h2>
            {top ? <p className="muted" style={{ marginBottom: 12 }}>Most wins here: <Link className="link" href={`/drivers/${top.id}`}>{top.name}</Link> ({top.n})</p> : null}
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr><th>Year</th><th>Race</th><th>Winner</th><th>Team</th><th>Pole position</th>{layouts.length > 1 ? <th className="r">Layout</th> : null}</tr>
                </thead>
                <tbody>
                  {shown.map((r) => (
                    <tr key={r.race_id}>
                      <td className="num nm">{r.season_year}</td>
                      <td>{r.has_results ? <Link className="link" href={`/races/${r.slug}`}>{r.race_name}</Link> : <span>{r.race_name}</span>}{!r.has_results && r.race_date ? <span className="muted"> · {shortDate(r.race_date)}</span> : null}</td>
                      <td className="nm">{r.winner_id ? <Link href={`/drivers/${r.winner_id}`}>{r.winner_name}</Link> : '–'}</td>
                      <td>{r.winner_team_id ? <Link href={`/teams/${r.winner_team_id}`}>{r.winner_team}</Link> : ''}</td>
                      <td>{r.pole_id ? <Link href={`/drivers/${r.pole_id}`}>{r.pole_name}</Link> : '–'}</td>
                      {layouts.length > 1 ? <td className="r num muted">{layoutLabel(layouts[layoutFor(layouts, r.season_year)])}</td> : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {races.length > INITIAL ? (
              <button className="btn" style={{ marginTop: 14 }} onClick={() => setAll(!all)}>{all ? 'Show fewer' : `Show all ${races.length} races`}</button>
            ) : null}
          </div>
        </div>

        {layouts.length > 0 || bio ? (
          <aside className="col">
            {bio ? (
              <div style={{ border: '1px solid var(--divider)', borderRadius: 14, padding: 18 }}>
                <span className="lbl" style={{ color: 'var(--link)' }}>About</span>
                <p className={`bio${more ? '' : ' clamp'}`} style={{ marginTop: 8 }}>{bio}</p>
                {bio.length > 320 ? <button className="toggle-link plain" onClick={() => setMore(!more)}>{more ? 'Show less' : 'Read more'}</button> : null}
                <p className="src">
                  Source: {p.bio_source_url ? <a className="link" href={p.bio_source_url} rel="noopener">Wikipedia</a> : 'Wikipedia'} ({p.bio_licence ?? 'CC BY-SA 4.0'})
                </p>
              </div>
            ) : null}
            {p.lat !== null && p.lon !== null ? (
              <div style={{ border: '1px solid var(--divider)', borderRadius: 14, padding: 18 }}>
                <span className="lbl" style={{ color: 'var(--link)' }}>Location</span>
                <p className="muted" style={{ marginTop: 6, fontSize: 14 }}>{place}</p>
                <p className="muted num" style={{ fontSize: 13 }}>{Math.abs(p.lat).toFixed(4)}° {p.lat >= 0 ? 'N' : 'S'}, {Math.abs(p.lon).toFixed(4)}° {p.lon >= 0 ? 'E' : 'W'}</p>
              </div>
            ) : null}
          </aside>
        ) : null}
      </section>
    </div>
  );
}
