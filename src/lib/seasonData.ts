import { loadLayouts } from './layoutData';
import { Layout, layoutFor } from './layouts';
import { getServerDb } from './serverDb';
import { raceSlug } from './slug';

// Season and race pages: everything is gathered at build time from the database.

export type SeasonListRow = { year: number; champ_id: string | null; champion: string | null; team_champion: string | null; races: number };

export type RaceLine = {
  slug: string;
  race_id: number;
  round: number;
  name: string;
  race_date: string | null;
  circuit: string | null;
  has_results: boolean;
  winner_id: string | null;
  winner: string | null;
  winner_team: string | null;
  winner_team_id: string | null;
};
export type DriverStanding = { driver_id: string; name: string; pos: number | null; points: number; wins: number; teams: string };
export type TeamStanding = { team_id: string; name: string; pos: number | null; points: number; wins: number };
export type SeasonPageData = {
  year: number;
  champion: { driver_id: string; name: string; team: string | null; points: number | null } | null;
  team_champion: { name: string; points: number | null } | null;
  leader: { driver_id: string; name: string; points: number } | null;
  races: RaceLine[];
  drivers: DriverStanding[];
  teams: TeamStanding[];
  prev: number | null;
  next: number | null;
};

// race_id <-> slug, made once per build. A name used twice in one season gets the round added.
type SlugMaps = { byId: Map<number, string>; bySlug: Map<string, number> };
let slugMaps: Promise<SlugMaps> | null = null;
function getSlugMaps(): Promise<SlugMaps> {
  if (!slugMaps) {
    slugMaps = (async () => {
      const db = await getServerDb();
      const rows = await db.getAllAsync<{ race_id: number; season_year: number; round: number; name: string }>(
        'SELECT race_id, season_year, round, name FROM race ORDER BY season_year, round'
      );
      const count = new Map<string, number>();
      rows.forEach((r) => {
        const s = raceSlug(r.season_year, r.name);
        count.set(s, (count.get(s) ?? 0) + 1);
      });
      const byId = new Map<number, string>();
      const bySlug = new Map<string, number>();
      rows.forEach((r) => {
        let s = raceSlug(r.season_year, r.name);
        if ((count.get(s) ?? 0) > 1) s = `${s}-round-${r.round}`;
        byId.set(r.race_id, s);
        bySlug.set(s, r.race_id);
      });
      return { byId, bySlug };
    })();
  }
  return slugMaps;
}

export async function raceSlugById(): Promise<Map<number, string>> {
  return (await getSlugMaps()).byId;
}

export async function allSeasonYears(): Promise<number[]> {
  const db = await getServerDb();
  return (await db.getAllAsync<{ year: number }>('SELECT year FROM season ORDER BY year')).map((r) => r.year);
}

export async function allRaceSlugs(): Promise<string[]> {
  return [...(await getSlugMaps()).bySlug.keys()];
}

export async function loadSeasonList(): Promise<SeasonListRow[]> {
  const db = await getServerDb();
  return db.getAllAsync<SeasonListRow>(
    `SELECT s.year AS year, d.driver_id AS champ_id, d.given_name || ' ' || d.family_name AS champion, t.name AS team_champion,
            (SELECT COUNT(*) FROM race r WHERE r.season_year = s.year) AS races
     FROM season s
     LEFT JOIN driver d ON d.driver_id = s.driver_champion_id
     LEFT JOIN team t ON t.team_id = s.team_champion_id
     ORDER BY s.year DESC`
  );
}

export async function loadSeason(year: number): Promise<SeasonPageData | null> {
  const db = await getServerDb();
  const season = await db.getFirstAsync<{ year: number; driver_champion_id: string | null; team_champion_id: string | null }>(
    'SELECT year, driver_champion_id, team_champion_id FROM season WHERE year = ?',
    [year]
  );
  if (!season) return null;
  const { byId } = await getSlugMaps();

  const raceRows = await db.getAllAsync<Omit<RaceLine, 'slug' | 'has_results'> & { n_results: number }>(
    `SELECT ra.race_id AS race_id, ra.round AS round, ra.name AS name, ra.race_date AS race_date, ci.name AS circuit,
            (SELECT COUNT(*) FROM result rr WHERE rr.race_id = ra.race_id) AS n_results,
            wd.driver_id AS winner_id, wd.given_name || ' ' || wd.family_name AS winner, wt.name AS winner_team, wt.team_id AS winner_team_id
     FROM race ra
     LEFT JOIN circuit ci ON ci.circuit_id = ra.circuit_id
     LEFT JOIN driver wd ON wd.driver_id = ra.winner_driver_id
     LEFT JOIN team wt ON wt.team_id = ra.winner_team_id
     WHERE ra.season_year = ? ORDER BY ra.round`,
    [year]
  );
  const races: RaceLine[] = raceRows.map(({ n_results, ...r }) => ({ ...r, slug: byId.get(r.race_id) ?? '', has_results: n_results > 0 }));

  const drivers = await db.getAllAsync<DriverStanding>(
    `SELECT d.driver_id AS driver_id, d.given_name || ' ' || d.family_name AS name, MIN(ds.final_position) AS pos,
            COALESCE(MAX(ds.standing_points), SUM(ds.points)) AS points, SUM(ds.wins) AS wins,
            GROUP_CONCAT(t.name, ' / ') AS teams
     FROM driver_season ds JOIN driver d ON d.driver_id = ds.driver_id JOIN team t ON t.team_id = ds.team_id
     WHERE ds.season_year = ?
     GROUP BY ds.driver_id
     ORDER BY CASE WHEN MIN(ds.final_position) IS NULL THEN 1 ELSE 0 END, MIN(ds.final_position), COALESCE(MAX(ds.standing_points), SUM(ds.points)) DESC`,
    [year]
  );
  const teams = await db.getAllAsync<TeamStanding>(
    `SELECT t.team_id AS team_id, t.name AS name, ts.final_position AS pos, ts.points AS points, ts.wins AS wins
     FROM team_season ts JOIN team t ON t.team_id = ts.team_id WHERE ts.season_year = ?
     ORDER BY CASE WHEN ts.final_position IS NULL THEN 1 ELSE 0 END, ts.final_position, ts.points DESC`,
    [year]
  );

  let champion: SeasonPageData['champion'] = null;
  if (season.driver_champion_id) {
    const c = drivers.find((d) => d.driver_id === season.driver_champion_id);
    const info = await db.getFirstAsync<{ name: string; team: string | null }>(
      `SELECT d.given_name || ' ' || d.family_name AS name,
              (SELECT t.name FROM driver_season ds JOIN team t ON t.team_id = ds.team_id
                WHERE ds.driver_id = d.driver_id AND ds.season_year = ? ORDER BY ds.races_entered DESC LIMIT 1) AS team
       FROM driver d WHERE d.driver_id = ?`,
      [year, season.driver_champion_id]
    );
    if (info) champion = { driver_id: season.driver_champion_id, name: info.name, team: info.team, points: c?.points ?? null };
  }
  let teamChampion: SeasonPageData['team_champion'] = null;
  if (season.team_champion_id) {
    const t = teams.find((x) => x.team_id === season.team_champion_id);
    if (t) teamChampion = { name: t.name, points: t.points };
  }
  const lead = drivers[0];
  const years = await allSeasonYears();
  const at = years.indexOf(year);

  return {
    year,
    champion,
    team_champion: teamChampion,
    leader: !champion && lead ? { driver_id: lead.driver_id, name: lead.name, points: lead.points } : null,
    races,
    drivers,
    teams,
    prev: at > 0 ? years[at - 1] : null,
    next: at >= 0 && at < years.length - 1 ? years[at + 1] : null,
  };
}

// ----- one race -----
export type ResultRow = {
  result_id: number;
  position_text: string | null;
  grid: number | null;
  laps: number | null;
  points: number | null;
  race_time_ms: number | null;
  fastest_lap_rank: number | null;
  driver_id: string;
  driver: string;
  team: string;
  team_id: string;
  status: string | null;
};
export type QualiRow = { qualifying_id: number; position: number | null; driver_id: string; driver: string; team: string; team_id: string; q1_time: string | null; q2_time: string | null; q3_time: string | null };
export type RacePageData = {
  slug: string;
  year: number;
  round: number;
  name: string;
  race_date: string | null;
  circuit: string | null;
  circuit_id: string | null;
  layouts: Layout[]; // the track drawings for this circuit
  layout_index: number; // the one used that season
  locality: string | null;
  country: string | null;
  season_races: number;
  winner: { driver_id: string; name: string; team: string | null } | null;
  pole: { driver_id: string; name: string; team: string | null } | null;
  results: ResultRow[];
  quali: QualiRow[];
  prev: { slug: string; name: string } | null;
  next: { slug: string; name: string } | null;
};

export async function loadRace(slug: string): Promise<RacePageData | null> {
  const { bySlug, byId } = await getSlugMaps();
  const raceId = bySlug.get(slug);
  if (raceId === undefined) return null;
  const db = await getServerDb();
  const head = await db.getFirstAsync<{
    season_year: number; round: number; name: string; race_date: string | null; circuit: string | null; circuit_id: string | null; locality: string | null; country: string | null;
    winner_id: string | null; winner: string | null; winner_team: string | null;
  }>(
    `SELECT ra.season_year AS season_year, ra.round AS round, ra.name AS name, ra.race_date AS race_date,
            ra.circuit_id AS circuit_id, ci.name AS circuit, ci.locality AS locality, ci.country AS country,
            wd.driver_id AS winner_id, wd.given_name || ' ' || wd.family_name AS winner, wt.name AS winner_team
     FROM race ra
     LEFT JOIN circuit ci ON ci.circuit_id = ra.circuit_id
     LEFT JOIN driver wd ON wd.driver_id = ra.winner_driver_id
     LEFT JOIN team wt ON wt.team_id = ra.winner_team_id
     WHERE ra.race_id = ?`,
    [raceId]
  );
  if (!head) return null;
  const pole = await db.getFirstAsync<{ driver_id: string; name: string; team: string | null }>(
    `SELECT d.driver_id AS driver_id, d.given_name || ' ' || d.family_name AS name, t.name AS team
     FROM race_pole p JOIN driver d ON d.driver_id = p.driver_id LEFT JOIN team t ON t.team_id = p.team_id
     WHERE p.race_id = ?`,
    [raceId]
  );
  const results = await db.getAllAsync<ResultRow>(
    `SELECT r.result_id AS result_id, r.position_text AS position_text, r.grid AS grid, r.laps AS laps, r.points AS points,
            r.race_time_ms AS race_time_ms, r.fastest_lap_rank AS fastest_lap_rank,
            d.driver_id AS driver_id, d.given_name || ' ' || d.family_name AS driver, t.name AS team, t.team_id AS team_id, s.status AS status
     FROM result r JOIN driver d ON d.driver_id = r.driver_id JOIN team t ON t.team_id = r.team_id
     LEFT JOIN status s ON s.status_id = r.status_id
     WHERE r.race_id = ?
     ORDER BY CASE WHEN r.position IS NULL THEN 1 ELSE 0 END, r.position, r.result_id`,
    [raceId]
  );
  const quali = await db.getAllAsync<QualiRow>(
    `SELECT q.qualifying_id AS qualifying_id, q.position AS position, d.driver_id AS driver_id,
            d.given_name || ' ' || d.family_name AS driver, t.name AS team, t.team_id AS team_id, q.q1_time AS q1_time, q.q2_time AS q2_time, q.q3_time AS q3_time
     FROM qualifying q JOIN driver d ON d.driver_id = q.driver_id JOIN team t ON t.team_id = q.team_id
     WHERE q.race_id = ?
     ORDER BY CASE WHEN q.position IS NULL THEN 1 ELSE 0 END, q.position, q.qualifying_id`,
    [raceId]
  );
  const around = await db.getAllAsync<{ race_id: number; round: number; name: string }>(
    'SELECT race_id, round, name FROM race WHERE season_year = ? ORDER BY round',
    [head.season_year]
  );
  const layouts = await loadLayouts(head.circuit_id);
  const at = around.findIndex((r) => r.race_id === raceId);
  const link = (r: { race_id: number; name: string } | undefined) => (r ? { slug: byId.get(r.race_id) ?? '', name: r.name } : null);

  return {
    slug,
    year: head.season_year,
    round: head.round,
    name: head.name,
    race_date: head.race_date,
    circuit: head.circuit,
    circuit_id: head.circuit_id,
    layouts,
    layout_index: layouts.length > 0 ? layoutFor(layouts, head.season_year) : 0,
    locality: head.locality,
    country: head.country,
    season_races: around.length,
    winner: head.winner_id && head.winner ? { driver_id: head.winner_id, name: head.winner, team: head.winner_team } : null,
    pole: pole ?? null,
    results,
    quali,
    prev: at > 0 ? link(around[at - 1]) : null,
    next: at >= 0 && at < around.length - 1 ? link(around[at + 1]) : null,
  };
}
