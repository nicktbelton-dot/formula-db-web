import { getServerDb } from './serverDb';
import { loadTitleInfo, TitleInfo } from './titleRace';
import { RECORDS } from '@/core/records';

// Everything the Home page shows, worked out once at build time from the database (instead of in each visitor's
// browser after the whole database downloads). This is what used to run in page.tsx's first useEffect.

export type Counts = { drivers: number; teams: number; circuits: number; seasons: number };
export type Champion = { year: number; id: string; name: string; team: string | null; left: number | null; wins: number; podiums: number; poles: number };
export type RaceLine = { name: string; race_date: string; circuit: string | null; season_year: number; lat?: number | null; lon?: number | null };
export type Person = { driver_id: string; name: string; wins: number };
export type Fact = { key: string; label: string; title: string; right?: string };

export type HomeData = {
  counts: Counts | null;
  champ: Champion | null;
  title: TitleInfo | null;
  next: RaceLine | null;
  latest: RaceLine | null;
  recent: { year: number; name: string }[];
  top: Person[];
  fact: Fact | null;
};

export async function loadHomeData(): Promise<HomeData> {
  const db = await getServerDb();

  const counts = await db.getFirstAsync<Counts>(
    `SELECT (SELECT COUNT(*) FROM driver) AS drivers, (SELECT COUNT(*) FROM team_identity) AS teams,
            (SELECT COUNT(*) FROM circuit) AS circuits, (SELECT COUNT(*) FROM season) AS seasons`
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
  let champ: Champion | null;
  try {
    champ = await db.getFirstAsync<Champion>(champSql('s.driver_title_left'));
  } catch {
    champ = await db.getFirstAsync<Champion>(champSql('NULL'));
  }

  // the title races: who leads this season's drivers' and constructors' championships, or who has clinched them
  const title = await loadTitleInfo(db).catch((e) => {
    console.error(e);
    return null;
  });

  const next = await db.getFirstAsync<RaceLine>(
    `SELECT r.name AS name, r.race_date AS race_date, c.name AS circuit, r.season_year AS season_year,
            c.latitude AS lat, c.longitude AS lon
     FROM race r LEFT JOIN circuit c ON c.circuit_id = r.circuit_id
     WHERE r.winner_driver_id IS NULL AND r.race_date >= date('now', '-1 day')
     ORDER BY r.race_date LIMIT 1`
  );
  const latest = await db.getFirstAsync<RaceLine>(
    `SELECT r.name AS name, r.race_date AS race_date, c.name AS circuit, r.season_year AS season_year
     FROM race r LEFT JOIN circuit c ON c.circuit_id = r.circuit_id
     WHERE r.winner_driver_id IS NOT NULL ORDER BY r.race_date DESC LIMIT 1`
  );
  const recent = await db.getAllAsync<{ year: number; name: string }>(
    `SELECT s.year AS year, d.given_name || ' ' || d.family_name AS name
     FROM season s JOIN driver d ON d.driver_id = s.driver_champion_id ORDER BY s.year DESC LIMIT 5`
  );
  const top = await db.getAllAsync<Person>(
    `SELECT driver_id, given_name || ' ' || family_name AS name, career_wins AS wins FROM driver ORDER BY career_wins DESC LIMIT 3`
  );

  // a different record each build (it used to change every day in the visitor's browser; now it changes whenever the
  // site is rebuilt and redeployed, which is the trade for not shipping the whole database before anything paints)
  let fact: Fact | null = null;
  const def = RECORDS[Math.floor(Date.now() / 86400000) % RECORDS.length];
  try {
    const rows = await def.load(db as never);
    if (rows[0]) fact = { key: def.key, label: def.title, title: rows[0].title, right: rows[0].right };
  } catch {
    /* the card simply stays hidden */
  }

  return { counts: counts ?? null, champ: champ ?? null, title: title ?? null, next: next ?? null, latest: latest ?? null, recent, top, fact };
}
