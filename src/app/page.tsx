'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useDbState } from '@/components/DbProvider';
import { useFavourites } from '@/lib/favourites';
import { RECORDS } from '@/core/records';
import { raceSlug } from '@/lib/slug';

type Counts = { drivers: number; teams: number; circuits: number; seasons: number };
type Champion = { year: number; id: string; name: string; team: string | null; left: number };
type RaceLine = { name: string; race_date: string; circuit: string | null; season_year: number };
type Person = { driver_id: string; name: string; wins: number };
type Fact = { label: string; title: string; right?: string };

const EXAMPLES = [
  'Which car won the 1988 championship?',
  'How many wins does Hamilton have?',
  'Which team has the most titles?',
  'Who won the 2009 championship?',
];

const longDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

export default function Home() {
  const { db, error } = useDbState();
  const { favs } = useFavourites();
  const [counts, setCounts] = useState<Counts | null>(null);
  const [champ, setChamp] = useState<Champion | null>(null);
  const [next, setNext] = useState<RaceLine | null>(null);
  const [latest, setLatest] = useState<RaceLine | null>(null);
  const [recent, setRecent] = useState<{ year: number; name: string }[]>([]);
  const [top, setTop] = useState<Person[]>([]);
  const [fact, setFact] = useState<Fact | null>(null);
  const [favDrivers, setFavDrivers] = useState<Person[]>([]);

  useEffect(() => {
    if (!db) return;
    (async () => {
      setCounts(
        await db.getFirstAsync<Counts>(
          `SELECT (SELECT COUNT(*) FROM driver) AS drivers, (SELECT COUNT(*) FROM team_identity) AS teams,
                  (SELECT COUNT(*) FROM circuit) AS circuits, (SELECT COUNT(*) FROM season) AS seasons`
        )
      );
      setChamp(
        await db.getFirstAsync<Champion>(
          `SELECT s.year AS year, d.driver_id AS id, d.given_name || ' ' || d.family_name AS name,
                  (SELECT t.name FROM driver_season ds JOIN team t ON t.team_id = ds.team_id
                    WHERE ds.driver_id = s.driver_champion_id AND ds.season_year = s.year
                    ORDER BY ds.races_entered DESC LIMIT 1) AS team,
                  (SELECT COUNT(*) FROM race r WHERE r.season_year = s.year AND r.winner_driver_id IS NULL) AS "left"
           FROM season s JOIN driver d ON d.driver_id = s.driver_champion_id
           ORDER BY s.year DESC LIMIT 1`
        )
      );
      setNext(
        await db.getFirstAsync<RaceLine>(
          `SELECT r.name AS name, r.race_date AS race_date, c.name AS circuit, r.season_year AS season_year
           FROM race r LEFT JOIN circuit c ON c.circuit_id = r.circuit_id
           WHERE r.winner_driver_id IS NULL AND r.race_date >= date('now', '-1 day')
           ORDER BY r.race_date LIMIT 1`
        )
      );
      setLatest(
        await db.getFirstAsync<RaceLine>(
          `SELECT r.name AS name, r.race_date AS race_date, c.name AS circuit, r.season_year AS season_year
           FROM race r LEFT JOIN circuit c ON c.circuit_id = r.circuit_id
           WHERE r.winner_driver_id IS NOT NULL ORDER BY r.race_date DESC LIMIT 1`
        )
      );
      setRecent(
        await db.getAllAsync<{ year: number; name: string }>(
          `SELECT s.year AS year, d.given_name || ' ' || d.family_name AS name
           FROM season s JOIN driver d ON d.driver_id = s.driver_champion_id ORDER BY s.year DESC LIMIT 5`
        )
      );
      setTop(
        await db.getAllAsync<Person>(
          `SELECT driver_id, given_name || ' ' || family_name AS name, career_wins AS wins FROM driver ORDER BY career_wins DESC LIMIT 3`
        )
      );
      // a different record each day
      const def = RECORDS[Math.floor(Date.now() / 86400000) % RECORDS.length];
      try {
        const rows = await def.load(db as never);
        if (rows[0]) setFact({ label: def.title, title: rows[0].title, right: rows[0].right });
      } catch {
        /* the card simply stays hidden */
      }
    })().catch((e) => console.error(e));
  }, [db]);

  // saved drivers
  useEffect(() => {
    if (!db) return;
    const ids = [...favs].filter((k) => k.startsWith('driver:')).map((k) => k.slice(7));
    if (ids.length === 0) {
      setFavDrivers([]);
      return;
    }
    db.getAllAsync<Person>(
      `SELECT driver_id, given_name || ' ' || family_name AS name, career_wins AS wins FROM driver WHERE driver_id IN (${ids.map(() => '?').join(',')})`,
      ids
    )
      .then(setFavDrivers)
      .catch((e) => console.error(e));
  }, [db, favs]);

  const dash = '…';
  return (
    <div>
      {error ? <p className="empty" style={{ marginTop: 24 }}>The data could not be loaded: {error}</p> : null}

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginTop: 32 }}>
        <div className="grad" style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 12, minHeight: 280, gridColumn: 'span 1' }}>
          <span className="lbl" style={{ color: '#FFD6DE' }}>{champ ? `${champ.year} World Champion` : 'World Champion'}</span>
          <h1 className="hero-name" style={{ fontSize: 'clamp(38px, 6vw, 64px)' }}>{champ ? <Link href={`/drivers/${champ.id}`}>{champ.name}</Link> : dash}</h1>
          <p className="sub" style={{ fontSize: 17, maxWidth: '46ch' }}>
            {champ ? `${champ.team ?? 'Champion'}. ${champ.left > 0 ? `The drivers' title was decided with ${champ.left} ${champ.left === 1 ? 'race' : 'races'} still to run.` : ''}` : ''}
          </p>
        </div>
        <div className="col">
          <div className="panel" style={{ flex: 1 }}>
            <span className="lbl">Next race</span>
            <h2 style={{ fontSize: 30, marginTop: 8 }}>{next ? next.name : 'No race scheduled'}</h2>
            <p className="sub" style={{ marginTop: 6 }}>{next ? `${longDate(next.race_date)}${next.circuit ? ` · ${next.circuit}` : ''}` : 'The season is over, or the calendar is not out yet.'}</p>
          </div>
          <div className="panel" style={{ flex: 1 }}>
            <span className="lbl">Latest result</span>
            <h2 style={{ fontSize: 30, marginTop: 8 }}>{latest ? <Link href={`/races/${raceSlug(latest.season_year, latest.name)}`}>{latest.name}</Link> : dash}</h2>
            <p className="sub" style={{ marginTop: 6 }}>{latest ? longDate(latest.race_date) : ''}</p>
            {latest ? <Link className="link" href={`/races/${raceSlug(latest.season_year, latest.name)}`} style={{ color: 'var(--accent)', display: 'inline-block', marginTop: 12 }}>Results and qualifying ›</Link> : null}
          </div>
        </div>
      </section>

      <section className="g4" style={{ marginTop: 20 }}>
        <Link href="/drivers" className="tile"><b className="num">{counts ? counts.drivers : dash}</b><span>Drivers, 1950 to today</span></Link>
        <div className="tile"><b className="num">{counts ? counts.teams : dash}</b><span>Teams, with lineages joined</span></div>
        <div className="tile"><b className="num">{counts ? counts.circuits : dash}</b><span>Circuits</span></div>
        <Link href="/seasons" className="tile"><b className="num">{counts ? counts.seasons : dash}</b><span>Seasons, 1950 to now</span></Link>
      </section>

      <section style={{ marginTop: 40, border: '1px solid var(--border)', borderRadius: 16, padding: 28, background: 'var(--tint)' }}>
        <h2 style={{ fontSize: 28 }}>Ask a question</h2>
        <p className="muted" style={{ marginTop: 4 }}>Answers come from the checked data, with the reading of your question shown beneath.</p>
        <div className="chips" style={{ marginTop: 16 }}>
          {EXAMPLES.map((q) => (
            <Link key={q} className="chip" href={`/ask?q=${encodeURIComponent(q)}`}>{q}</Link>
          ))}
        </div>
      </section>

      <section className="g2" style={{ gap: 28 }}>
        <div>
          <h2 className="h-sec">Did you know?</h2>
          <div className="grad">
            {fact ? (
              <>
                <span className="lbl" style={{ color: '#FFD6DE' }}>{fact.label}</span>
                <p className="cond" style={{ fontSize: 34, fontWeight: 700, marginTop: 6 }}>{fact.title}</p>
                {fact.right ? <p className="sub" style={{ fontSize: 16 }}>{fact.right}</p> : null}
              </>
            ) : (
              <p className="sub">Loading…</p>
            )}
          </div>
        </div>
        <div>
          <h2 className="h-sec">Most wins</h2>
          <div className="stack">
            {top.map((p) => (
              <Link key={p.driver_id} href={`/drivers/${p.driver_id}`} className="item"><b>{p.name}</b><span className="end num">{p.wins}</span></Link>
            ))}
          </div>
        </div>
      </section>

      <section className="g2" style={{ gap: 28 }}>
        <div>
          <h2 className="h-sec">Recent world champions</h2>
          <div className="stack">
            {recent.map((r) => (
              <Link key={r.year} href={`/seasons/${r.year}`} className="item"><span className="acc num" style={{ width: 44 }}>{r.year}</span><b>{r.name}</b><span className="go end">›</span></Link>
            ))}
          </div>
        </div>
        <div>
          <h2 className="h-sec">Favourites</h2>
          {favDrivers.length === 0 ? (
            <div className="empty">Tap the heart on a driver in the list to keep them here. Favourites are stored in this browser.</div>
          ) : (
            <div className="stack">
              {favDrivers.map((p) => (
                <Link key={p.driver_id} href={`/drivers/${p.driver_id}`} className="item"><b>{p.name}</b><span className="end sub num">{p.wins} wins</span></Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
