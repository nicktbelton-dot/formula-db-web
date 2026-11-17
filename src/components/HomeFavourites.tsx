'use client';

import { useEffect, useState } from 'react';
import { urlId } from '@/lib/ids';
import Link from '@/components/AppLink';
import { useDbState } from '@/components/DbProvider';
import { useFavourites } from '@/lib/favourites';
import { commonName } from '@/core/circuitNames';

// The Favourites section on Home: who you've saved. This has to run in the browser (favourites live in this
// browser's local storage, and only the visitor's own browser knows what they are), so it stays its own small
// client piece rather than being part of the server-rendered Home page.
type FavLine = { kind: 'Driver' | 'Team' | 'Circuit'; id: string; name: string; stat: string; href: string };

export default function HomeFavourites() {
  const { db } = useDbState();
  const { favs } = useFavourites();
  const [favLines, setFavLines] = useState<FavLine[]>([]);

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

  return (
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
  );
}
