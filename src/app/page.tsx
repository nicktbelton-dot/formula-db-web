'use client';

import { urlId } from '@/lib/ids';
import Link from '@/components/AppLink';
import { useEffect, useState } from 'react';
import { useDbState } from '@/components/DbProvider';
import { useFavourites } from '@/lib/favourites';
import { commonName } from '@/core/circuitNames';
import { RECORDS } from '@/core/records';
import { raceSlug } from '@/lib/slug';
import RaceWeather from '@/components/RaceWeather';
import TitleRace from '@/components/TitleRace';
import { loadTitleInfo, TitleInfo } from '@/lib/titleRace';

type Counts = { drivers: number; teams: number; circuits: number; seasons: number };
type Champion = { year: number; id: string; name: string; team: string | null; left: number | null; wins: number; podiums: number; poles: number };
type RaceLine = { name: string; race_date: string; circuit: string | null; season_year: number; lat?: number | null; lon?: number | null };
type Person = { driver_id: string; name: string; wins: number };
type FavLine = { kind: 'Driver' | 'Team' | 'Circuit'; id: string; name: string; stat: string; href: string };
type Fact = { key: string; label: string; title: string; right?: string };

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
  const [title, setTitle] = useState<TitleInfo | null>(null);
  const [next, setNext] = useState<RaceLine | null>(null);
  const [latest, setLatest] = useState<RaceLine | null>(null);
  const [recent, setRecent] = useState<{ year: number; name: string }[]>([]);
  const [top, setTop] = useState<Person[]>([]);
  const [fact, setFact] = useState<Fact | null>(null);
  const [favLines, setFavLines] = useState<FavLine[]>([]);

  useEffect(() => {
    if (!db) return;
    (async () => {
      setCounts(
        await db.getFirstAsync<Counts>(
          `SELECT (SELECT COUNT(*) FROM driver) AS drivers, (SELECT COUNT(*) FROM team_identity) AS teams,
                  (SELECT COUNT(*) FROM circuit) AS circuits, (SELECT COUNT(*) FROM season) AS seasons`
        )
      );
      // the latest champion, and how many races were still to run when the title was first decided (remembered by the data
      // refresh; an older database without that figure simply shows no such line)
      const champSql = (left: string) =>
        `SELECT s.year AS year, d.driver_id AS id, d.given_name || ' ' || d.family_name AS name,
                (SELECT t.name FROM driver_season ds JOIN team t ON t.team_id = ds.team_id
                  WHERE ds.driver_id = s.driver_champion_id AND ds.season_year = s.year
                  ORDER BY ds.races_entered DESC LIMIT 1) AS team,
                ${left} AS "left",
                -- his season, not his whole career: summed across every team he drove for that year
                (SELECT COALESCE(SUM(ds.wins), 0) FROM driver_season ds WHERE ds.driver_id = s.driver_champion_id AND ds.season_year = s.year) AS wins,
                (SELECT COALESCE(SUM(ds.podiums), 0) FROM driver_season ds WHERE ds.driver_id = s.driver_champion_id AND ds.season_year = s.year) AS podiums,
                (SELECT COUNT(*) FROM race_pole p JOIN race ra ON ra.race_id = p.race_id
                  WHERE p.driver_id = s.driver_champion_id AND ra.season_year = s.year) AS poles
         FROM season s JOIN driver d ON d.driver_id = s.driver_champion_id
         ORDER BY s.year DESC LIMIT 1`;
      try {
        setChamp(await db.getFirstAsync<Champion>(champSql('s.driver_title_left')));
      } catch {
        setChamp(await db.getFirstAsync<Champion>(champSql('NULL')));
      }
      // the title races: who leads this season's drivers' and constructors' championships, or who has clinched them
      loadTitleInfo(db).then(setTitle).catch((e) => console.error(e));
      setNext(
        await db.getFirstAsync<RaceLine>(
          `SELECT r.name AS name, r.race_date AS race_date, c.name AS circuit, r.season_year AS season_year,
                  c.latitude AS lat, c.longitude AS lon
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
        if (rows[0]) setFact({ key: def.key, label: def.title, title: rows[0].title, right: rows[0].right });
      } catch {
        /* the card simply stays hidden */
      }
    })().catch((e) => console.error(e));
  }, [db]);

  // saved drivers, teams and circuits
  useEffect(() => {
    if (!db) return;
    const pick = (kind: string) => [...favs].filter((k) => k.startsWith(`${kind}:`)).map((k) => k.slice(kind.length + 1));
    const marks = (n: number) => Array.from({ length: n }, () => '?').join(',');
    const d = pick('driver');
    const t = pick('team');
    const c = pick('circuit');
    (async () => {
      const lines: FavLine[] = [];
      if (d.length) {
        const rows = await db.getAllAsync<{ id: string; name: string; wins: number }>(
          `SELECT driver_id AS id, given_name || ' ' || family_name AS name, career_wins AS wins FROM driver WHERE driver_id IN (${marks(d.length)}) ORDER BY family_name`, d);
        rows.forEach((r) => lines.push({ kind: 'Driver', id: r.id, name: r.name, stat: `${r.wins} wins`, href: `/drivers/${urlId(r.id)}` }));
      }
      if (t.length) {
        const rows = await db.getAllAsync<{ id: string; name: string; wins: number }>(
          `SELECT team_id AS id, name, total_wins AS wins FROM team WHERE team_id IN (${marks(t.length)}) ORDER BY name`, t);
        rows.forEach((r) => lines.push({ kind: 'Team', id: r.id, name: r.name, stat: `${r.wins} wins`, href: `/teams/${urlId(r.id)}` }));
      }
      if (c.length) {
        const rows = await db.getAllAsync<{ id: string; name: string; races: number }>(
          `SELECT circuit_id AS id, name, total_races AS races FROM circuit WHERE circuit_id IN (${marks(c.length)}) ORDER BY name`, c);
        rows.forEach((r) => lines.push({ kind: 'Circuit', id: r.id, name: commonName(r.id, r.name), stat: `${r.races} races`, href: `/circuits/${urlId(r.id)}` }));
      }
      setFavLines(lines);
    })().catch((e) => console.error(e));
  }, [db, favs]);

  const dash = '…';
  return (
    <div>
      {error ? <p className="empty" style={{ marginTop: 24 }}>The data could not be loaded: {error}</p> : null}

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginTop: 32 }}>
        <div className="grad" style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 12, minHeight: 280, gridColumn: 'span 1' }}>
          <span className="lbl" style={{ color: '#FFD6DE' }}>{champ ? (title && champ.year < title.year ? `Reigning World Champion \u00b7 ${champ.year}` : `${champ.year} World Champion`) : 'World Champion'}</span>
          <h1 className="hero-name" style={{ fontSize: 'clamp(38px, 6vw, 64px)' }}>{champ ? <Link href={`/drivers/${urlId(champ.id)}`}>{champ.name}</Link> : dash}</h1>
          <p className="sub" style={{ fontSize: 17, maxWidth: '46ch' }}>
            {champ ? `${champ.team ?? 'Champion'}. ${title && champ.year === title.year && champ.left && champ.left > 0 ? `Clinched the drivers' title with ${champ.left} ${champ.left === 1 ? 'race' : 'races'} still to run.` : ''}` : ''}
          </p>
          {champ ? (
            <div className="row champ-stats" style={{ marginTop: 'auto', paddingTop: 12, gap: 28 }}>
              {[['Wins', champ.wins], ['Podiums', champ.podiums], ['Poles', champ.poles]].map(([lab, n]) => (
                <div key={lab as string}>
                  <b className="num" style={{ display: 'block', fontSize: 30, fontWeight: 700, color: '#fff' }}>{n}</b>
                  <span style={{ fontSize: 12, color: '#F3DDE6' }}>{lab} in {champ.year}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <div className="col">
          <div className="panel" style={{ flex: 1 }}>
            <span className="lbl">Next race</span>
            <h2 style={{ fontSize: 30, marginTop: 8 }}>{next ? next.name : 'No race scheduled'}</h2>
            <p className="sub" style={{ marginTop: 6 }}>{next ? `${longDate(next.race_date)}${next.circuit ? ` · ${next.circuit}` : ''}` : 'The season is over, or the calendar is not out yet.'}</p>
            {next && next.lat != null && next.lon != null ? <RaceWeather lat={next.lat} lon={next.lon} raceDate={next.race_date} /> : null}
          </div>
          <div className="panel" style={{ flex: 1 }}>
            <span className="lbl">Latest result</span>
            <h2 style={{ fontSize: 30, marginTop: 8 }}>{latest ? <Link href={`/races/${raceSlug(latest.season_year, latest.name)}`}>{latest.name}</Link> : dash}</h2>
            <p className="sub" style={{ marginTop: 6 }}>{latest ? longDate(latest.race_date) : ''}</p>
            {latest ? <Link className="link" href={`/races/${raceSlug(latest.season_year, latest.name)}`} style={{ color: 'var(--accent)', display: 'inline-block', marginTop: 12 }}>Results and qualifying ›</Link> : null}
          </div>
        </div>
      </section>

      {title ? <TitleRace info={title} /> : null}

      <section className="g4" style={{ marginTop: 20 }}>
        <Link href="/drivers" className="tile"><b className="num">{counts ? counts.drivers : dash}</b><span>Drivers, 1950 to today</span></Link>
        <Link href="/teams" className="tile"><b className="num">{counts ? counts.teams : dash}</b><span>Teams, with lineages joined</span></Link>
        <Link href="/circuits" className="tile"><b className="num">{counts ? counts.circuits : dash}</b><span>Circuits, with track layouts</span></Link>
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

      <section className="g2" style={{ gap: 28, alignItems: 'start' }}>
        <div>
          <h2 className="h-sec">Did you know?</h2>
          <div className="grad">
            {fact ? (
              <>
                <span className="lbl" style={{ color: '#FFD6DE' }}>{fact.label}</span>
                <p className="cond" style={{ fontSize: 34, fontWeight: 700, marginTop: 6 }}>{fact.title}</p>
                {fact.right ? <p className="sub" style={{ fontSize: 16 }}>{fact.right}</p> : null}
                <Link href={`/records/${fact.key}`} style={{ color: '#fff', fontWeight: 600, display: 'inline-block', marginTop: 14 }}>Open the record ›</Link>
              </>
            ) : (
              <p className="sub">Loading…</p>
            )}
          </div>

          <h2 className="h-sec">Records and trivia</h2>
          <div className="stack">
            {RECORDS.slice(0, 4).map((r) => (
              <Link key={r.key} href={`/records/${r.key}`} className="item"><b>{r.title}</b><span className="go end">›</span></Link>
            ))}
            <Link className="link" href="/records" style={{ padding: '6px 2px' }}>All records and trivia ›</Link>
          </div>
        </div>

        <div>
          <h2 className="h-sec">Recent world champions</h2>
          <div className="stack">
            {recent.map((r) => (
              <Link key={r.year} href={`/seasons/${r.year}`} className="item"><span className="acc num" style={{ width: 44 }}>{r.year}</span><b>{r.name}</b><span className="go end">›</span></Link>
            ))}
          </div>

          <h2 className="h-sec">Most wins</h2>
          <div className="stack">
            {top.map((p) => (
              <Link key={p.driver_id} href={`/drivers/${urlId(p.driver_id)}`} className="item"><b>{p.name}</b><span className="end num">{p.wins}</span></Link>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="between" style={{ alignItems: 'flex-end' }}>
          <h2 className="h-sec">Favourites</h2>
          <Link className="link" href="/favourites" style={{ marginBottom: 16 }}>{favLines.length > 0 ? 'All favourites ›' : 'Favourites page ›'}</Link>
        </div>
        {favLines.length === 0 ? (
          <div className="empty">Nothing saved yet. Press Add to favourites on a driver, team or circuit page, or the heart at the end of a row in a list. Favourites are stored in this browser only.</div>
        ) : (
          <div className="g2" style={{ gap: 10 }}>
            {favLines.map((f) => (
              <Link key={`${f.kind}-${f.id}`} href={f.href} className="item">
                <span className="acc" style={{ width: 62 }}>{f.kind}</span>
                <b>{f.name}</b>
                <span className="end sub num">{f.stat}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
