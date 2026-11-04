import { commonName } from '@/core/circuitNames';
import { loadLayouts } from './layoutData';
import type { Layout } from './layouts';
import { raceSlugById } from './seasonData';
import { getServerDb } from './serverDb';

export type CircuitRow = {
  id: string;
  name: string; // the everyday name, for example "Monza"
  official: string;
  locality: string | null;
  country: string | null;
  lat: number | null;
  lon: number | null;
  total_races: number;
  first_race_year: number | null;
  last_race_year: number | null;
  on_calendar: number;
};

export async function allCircuitIds(): Promise<string[]> {
  const db = await getServerDb();
  return (await db.getAllAsync<{ circuit_id: string }>('SELECT circuit_id FROM circuit ORDER BY circuit_id')).map((r) => r.circuit_id);
}

export async function loadCircuitList(): Promise<CircuitRow[]> {
  const db = await getServerDb();
  const rows = await db.getAllAsync<Omit<CircuitRow, 'name' | 'official'> & { official: string }>(
    `SELECT circuit_id AS id, name AS official, locality, country, latitude AS lat, longitude AS lon,
            total_races, first_race_year, last_race_year, COALESCE(on_calendar, 0) AS on_calendar
     FROM circuit ORDER BY name`
  );
  return rows.map((r) => ({ ...r, name: commonName(r.id, r.official) }));
}

export type CircuitProfile = CircuitRow & { bio: string | null; bio_source_url: string | null; bio_licence: string | null };
export type CircuitRace = {
  race_id: number;
  slug: string;
  season_year: number;
  race_name: string;
  race_date: string | null;
  has_results: boolean;
  winner_id: string | null;
  winner_name: string | null;
  winner_team: string | null;
  winner_team_id: string | null;
  pole_id: string | null;
  pole_name: string | null;
};
export type CircuitPageData = {
  profile: CircuitProfile;
  layouts: Layout[];
  races: CircuitRace[];
  top: { name: string; id: string; n: number } | null;
};

export async function loadCircuit(id: string): Promise<CircuitPageData | null> {
  const db = await getServerDb();
  const row = await db.getFirstAsync<Omit<CircuitProfile, 'name'> & { official: string }>(
    `SELECT circuit_id AS id, name AS official, locality, country, latitude AS lat, longitude AS lon,
            total_races, first_race_year, last_race_year, COALESCE(on_calendar, 0) AS on_calendar,
            bio, bio_source_url, bio_licence
     FROM circuit WHERE circuit_id = ?`,
    [id]
  );
  if (!row) return null;
  const profile: CircuitProfile = { ...row, name: commonName(row.id, row.official) };
  const slugs = await raceSlugById();

  // pole positions come from race_pole (qualifying P1 or grid 1, with the pole overrides applied)
  const raceRows = await db.getAllAsync<Omit<CircuitRace, 'slug' | 'has_results'> & { n_results: number }>(
    `SELECT ra.race_id AS race_id, ra.season_year AS season_year, ra.name AS race_name, ra.race_date AS race_date,
            (SELECT COUNT(*) FROM result rr WHERE rr.race_id = ra.race_id) AS n_results,
            ra.winner_driver_id AS winner_id, wd.given_name || ' ' || wd.family_name AS winner_name,
            wt.name AS winner_team, wt.team_id AS winner_team_id,
            p.driver_id AS pole_id, pd.given_name || ' ' || pd.family_name AS pole_name
     FROM race ra
     LEFT JOIN driver wd ON wd.driver_id = ra.winner_driver_id
     LEFT JOIN team wt ON wt.team_id = ra.winner_team_id
     LEFT JOIN race_pole p ON p.race_id = ra.race_id
     LEFT JOIN driver pd ON pd.driver_id = p.driver_id
     WHERE ra.circuit_id = ?
     ORDER BY ra.season_year DESC, ra.round DESC`,
    [id]
  );
  const races: CircuitRace[] = raceRows.map(({ n_results, ...r }) => ({ ...r, slug: slugs.get(r.race_id) ?? '', has_results: n_results > 0 }));

  const top = await db.getFirstAsync<{ id: string; name: string; n: number }>(
    `SELECT d.driver_id AS id, d.given_name || ' ' || d.family_name AS name, COUNT(*) AS n
     FROM race ra JOIN driver d ON d.driver_id = ra.winner_driver_id
     WHERE ra.circuit_id = ? GROUP BY ra.winner_driver_id ORDER BY n DESC LIMIT 1`,
    [id]
  );

  return { profile, layouts: await loadLayouts(id), races, top };
}
