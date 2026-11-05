'use client';

import { useEffect, useState } from 'react';
import Link from '@/components/AppLink';
import { useDbState } from '@/components/DbProvider';
import { commonName } from '@/core/circuitNames';
import { useFavourites } from '@/lib/favourites';

type D = { driver_id: string; name: string; nationality: string | null; first_season: number | null; last_season: number | null; career_wins: number };
type T = { team_id: string; name: string; first_season: number | null; last_season: number | null; total_wins: number };
type C = { circuit_id: string; name: string; locality: string | null; country: string | null; total_races: number };

const years = (a: number | null, b: number | null) => (a === null ? '' : a === b ? String(a) : `${a} to ${b}`);
const marks = (n: number) => Array.from({ length: n }, () => '?').join(',');

// Saved drivers, teams and circuits. They are kept in this browser only.
export default function FavouritesView() {
  const { db } = useDbState();
  const { favs, toggle } = useFavourites();
  const [drivers, setDrivers] = useState<D[]>([]);
  const [teams, setTeams] = useState<T[]>([]);
  const [circuits, setCircuits] = useState<C[]>([]);
  const pick = (kind: string) => [...favs].filter((k) => k.startsWith(`${kind}:`)).map((k) => k.slice(kind.length + 1));

  useEffect(() => {
    if (!db) return;
    const d = pick('driver');
    const t = pick('team');
    const c = pick('circuit');
    (async () => {
      setDrivers(d.length ? await db.getAllAsync<D>(`SELECT driver_id, given_name || ' ' || family_name AS name, nationality, first_season, last_season, career_wins FROM driver WHERE driver_id IN (${marks(d.length)}) ORDER BY family_name`, d) : []);
      setTeams(t.length ? await db.getAllAsync<T>(`SELECT team_id, name, first_season, last_season, total_wins FROM team WHERE team_id IN (${marks(t.length)}) ORDER BY name`, t) : []);
      setCircuits(c.length ? await db.getAllAsync<C>(`SELECT circuit_id, name, locality, country, total_races FROM circuit WHERE circuit_id IN (${marks(c.length)}) ORDER BY name`, c) : []);
    })().catch((e) => console.error(e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, favs]);

  const heart = (key: string, name: string) => (
    <button className="ib" style={{ width: 36, height: 36 }} onClick={() => toggle(key)} aria-label={`Remove ${name} from favourites`}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="#C2253F" stroke="#C2253F" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 21s-7-4.5-9.3-9A5.4 5.4 0 0 1 12 6.2 5.4 5.4 0 0 1 21.3 12C19 16.5 12 21 12 21z" />
      </svg>
    </button>
  );
  const total = favs.size;

  return (
    <div style={{ maxWidth: 820 }}>
      <p className="crumb">Favourites</p>
      <h1 style={{ fontSize: 'clamp(34px, 5vw, 46px)', fontWeight: 800 }}>Favourites</h1>
      <p className="muted" style={{ marginTop: 4 }}>Saved in this browser only. They are not sent anywhere, and clearing your browser data removes them.</p>

      {total === 0 ? <p className="empty" style={{ marginTop: 22 }}>Nothing saved yet. Use the heart on a driver, team or circuit to keep it here.</p> : null}

      {drivers.length > 0 ? (
        <section>
          <h2 className="h-sec">Drivers</h2>
          <div className="stack">
            {drivers.map((d) => (
              <div key={d.driver_id} className="item">
                <div><b><Link href={`/drivers/${d.driver_id}`}>{d.name}</Link></b><div className="acc">{[d.nationality, years(d.first_season, d.last_season)].filter(Boolean).join(' · ')}</div></div>
                <span className="end num">{d.career_wins} wins</span>{heart(`driver:${d.driver_id}`, d.name)}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {teams.length > 0 ? (
        <section>
          <h2 className="h-sec">Teams</h2>
          <div className="stack">
            {teams.map((t) => (
              <div key={t.team_id} className="item">
                <div><b><Link href={`/teams/${t.team_id}`}>{t.name}</Link></b><div className="acc">{years(t.first_season, t.last_season)}</div></div>
                <span className="end num">{t.total_wins} wins</span>{heart(`team:${t.team_id}`, t.name)}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {circuits.length > 0 ? (
        <section>
          <h2 className="h-sec">Circuits</h2>
          <div className="stack">
            {circuits.map((c) => (
              <div key={c.circuit_id} className="item">
                <div><b><Link href={`/circuits/${c.circuit_id}`}>{commonName(c.circuit_id, c.name)}</Link></b><div className="acc">{[c.locality, c.country].filter(Boolean).join(', ')}</div></div>
                <span className="end num">{c.total_races} races</span>{heart(`circuit:${c.circuit_id}`, c.name)}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
