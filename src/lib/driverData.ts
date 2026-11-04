import { buildTimeline, SeasonRow, Timeline } from '@/core/timelineData';
import { getServerDb } from './serverDb';

// Everything a driver's page shows, gathered at build time (the same queries the phone app runs).
export type Profile = {
  driver_id: string;
  name: string;
  given_name: string;
  family_name: string;
  nationality: string | null;
  date_of_birth: string | null;
  bio: string | null;
  bio_source_url: string | null;
  bio_licence: string | null;
  career_starts: number;
  career_wins: number;
  career_poles: number;
  career_podiums: number;
  career_fastest_laps: number;
  career_points: number;
  championships: number;
  first_season: number | null;
  last_season: number | null;
};
export type Stint = { team_id: string; team: string; from_year: number; to_year: number; races: number; wins: number };
export type QualiSummary = { entries: number; poles: number | null; front_rows: number | null; best: number | null; avg: number | null };
export type QualiSeason = { season_year: number; races: number; poles: number; best: number; avg: number };
export type Battle = {
  year: number;
  mate_id: string;
  mate: string;
  team: string;
  shared: number;
  ahead: number;
  behind: number;
  pts: number;
  mate_pts: number;
  q_ahead: number;
  q_behind: number;
};
export type DriverPageData = {
  profile: Profile;
  stints: Stint[];
  timeline: Timeline;
  qSum: QualiSummary | null;
  qSeasons: QualiSeason[];
  battles: Battle[];
};

export async function allDriverIds(): Promise<string[]> {
  const db = await getServerDb();
  return (await db.getAllAsync<{ driver_id: string }>('SELECT driver_id FROM driver ORDER BY driver_id')).map((r) => r.driver_id);
}

const SAME_TEAM = `b.race_id = a.race_id AND b.team_id = a.team_id AND b.driver_id <> a.driver_id`;

export async function loadDriver(id: string): Promise<DriverPageData | null> {
  const db = await getServerDb();
  const profile = await db.getFirstAsync<Profile>(
    `SELECT driver_id, given_name || ' ' || family_name AS name, given_name, family_name, nationality, date_of_birth,
            bio, bio_source_url, bio_licence, career_starts, career_wins, career_poles, career_podiums,
            career_fastest_laps, career_points, championships, first_season, last_season
     FROM driver WHERE driver_id = ?`,
    [id]
  );
  if (!profile) return null;

  const stints = await db.getAllAsync<Stint>(
    `SELECT ds.team_id AS team_id, t.name AS team, MIN(ds.season_year) AS from_year,
            MAX(ds.season_year) AS to_year, SUM(ds.races_entered) AS races, SUM(ds.wins) AS wins
     FROM driver_season ds JOIN team t ON t.team_id = ds.team_id
     WHERE ds.driver_id = ? GROUP BY ds.team_id ORDER BY from_year`,
    [id]
  );

  // career timeline
  const seasonRows = await db.getAllAsync<SeasonRow>(
    `SELECT ds.season_year AS year, ds.team_id AS team_id, t.name AS team, ds.races_entered AS races, ds.wins AS wins,
            ds.podiums AS podiums, COALESCE(ds.standing_points, ds.points) AS points, ds.final_position AS position
     FROM driver_season ds JOIN team t ON t.team_id = ds.team_id
     WHERE ds.driver_id = ? ORDER BY ds.season_year, ds.races_entered DESC`,
    [id]
  );
  const poleRows = await db.getAllAsync<{ year: number; n: number }>(
    `SELECT ra.season_year AS year, COUNT(*) AS n FROM race_pole p JOIN race ra ON ra.race_id = p.race_id
     WHERE p.driver_id = ? GROUP BY ra.season_year`,
    [id]
  );
  const titleRows = await db.getAllAsync<{ year: number }>(`SELECT year FROM season WHERE driver_champion_id = ?`, [id]);
  const timeline = buildTimeline(seasonRows, new Map(poleRows.map((r) => [r.year, r.n])), new Set(titleRows.map((r) => r.year)));

  // qualifying (results exist from 1994; poles use the official credit)
  const qSum = await db.getFirstAsync<QualiSummary>(
    `SELECT COUNT(*) AS entries,
            (SELECT COUNT(*) FROM race_pole rp WHERE rp.driver_id = ? AND rp.race_id IN (SELECT race_id FROM qualifying)) AS poles,
            SUM(position <= 2) AS front_rows, MIN(position) AS best, AVG(position) AS avg
     FROM qualifying WHERE driver_id = ? AND position IS NOT NULL`,
    [id, id]
  );
  const qSeasons = await db.getAllAsync<QualiSeason>(
    `SELECT ra.season_year AS season_year, COUNT(*) AS races,
            (SELECT COUNT(*) FROM race_pole rp JOIN race r2 ON r2.race_id = rp.race_id
              WHERE rp.driver_id = ? AND r2.season_year = ra.season_year AND rp.race_id IN (SELECT race_id FROM qualifying)) AS poles,
            MIN(q.position) AS best, AVG(q.position) AS avg
     FROM qualifying q JOIN race ra ON ra.race_id = q.race_id
     WHERE q.driver_id = ? AND q.position IS NOT NULL GROUP BY ra.season_year ORDER BY ra.season_year DESC`,
    [id, id]
  );

  // teammate battles: race finishes and points from the results, qualifying from 1994, the starting grid before that
  type RaceRow = Omit<Battle, 'q_ahead' | 'q_behind'>;
  type QualiRow = { year: number; mate_id: string; ahead: number; behind: number };
  const races = await db.getAllAsync<RaceRow>(
    `SELECT ra.season_year AS year, b.driver_id AS mate_id, bd.given_name || ' ' || bd.family_name AS mate,
            t.name AS team, COUNT(*) AS shared,
            SUM(CASE WHEN a.position_text GLOB '[0-9]*' AND b.position_text GLOB '[0-9]*' AND a.position < b.position THEN 1 ELSE 0 END) AS ahead,
            SUM(CASE WHEN a.position_text GLOB '[0-9]*' AND b.position_text GLOB '[0-9]*' AND a.position > b.position THEN 1 ELSE 0 END) AS behind,
            COALESCE(SUM(a.points), 0) AS pts, COALESCE(SUM(b.points), 0) AS mate_pts
     FROM result a JOIN result b ON ${SAME_TEAM}
     JOIN race ra ON ra.race_id = a.race_id
     JOIN driver bd ON bd.driver_id = b.driver_id
     JOIN team t ON t.team_id = a.team_id
     WHERE a.driver_id = ? GROUP BY ra.season_year, b.driver_id HAVING COUNT(*) >= 2
     ORDER BY ra.season_year DESC, shared DESC`,
    [id]
  );
  const quali = await db.getAllAsync<QualiRow>(
    `SELECT ra.season_year AS year, qb.driver_id AS mate_id,
            SUM(CASE WHEN qa.position < qb.position THEN 1 ELSE 0 END) AS ahead,
            SUM(CASE WHEN qa.position > qb.position THEN 1 ELSE 0 END) AS behind
     FROM qualifying qa
     JOIN qualifying qb ON qb.race_id = qa.race_id AND qb.team_id = qa.team_id AND qb.driver_id <> qa.driver_id
     JOIN race ra ON ra.race_id = qa.race_id
     WHERE qa.driver_id = ? AND qa.position IS NOT NULL AND qb.position IS NOT NULL
     GROUP BY ra.season_year, qb.driver_id`,
    [id]
  );
  const grid = await db.getAllAsync<QualiRow>(
    `SELECT ra.season_year AS year, b.driver_id AS mate_id,
            SUM(CASE WHEN a.grid > 0 AND b.grid > 0 AND a.grid < b.grid THEN 1 ELSE 0 END) AS ahead,
            SUM(CASE WHEN a.grid > 0 AND b.grid > 0 AND a.grid > b.grid THEN 1 ELSE 0 END) AS behind
     FROM result a JOIN result b ON ${SAME_TEAM}
     JOIN race ra ON ra.race_id = a.race_id
     WHERE a.driver_id = ? AND a.race_id NOT IN (SELECT race_id FROM qualifying)
     GROUP BY ra.season_year, b.driver_id`,
    [id]
  );
  const q = new Map<string, { ahead: number; behind: number }>();
  [...quali, ...grid].forEach((r) => {
    const k = `${r.year}|${r.mate_id}`;
    const cur = q.get(k) ?? { ahead: 0, behind: 0 };
    q.set(k, { ahead: cur.ahead + r.ahead, behind: cur.behind + r.behind });
  });
  const battles: Battle[] = races.map((r) => {
    const m = q.get(`${r.year}|${r.mate_id}`);
    return { ...r, q_ahead: m?.ahead ?? 0, q_behind: m?.behind ?? 0 };
  });

  return { profile, stints, timeline, qSum: qSum && qSum.entries > 0 ? qSum : null, qSeasons, battles };
}
