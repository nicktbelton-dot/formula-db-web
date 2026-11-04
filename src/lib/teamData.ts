import { getServerDb } from './serverDb';

// A team's page: profile, lineage, drivers and cars, gathered at build time (the same queries the phone app runs).
export type TeamProfile = {
  team_id: string;
  name: string;
  nationality: string | null;
  bio: string | null;
  bio_source_url: string | null;
  bio_licence: string | null;
  total_starts: number;
  total_wins: number;
  total_podiums: number;
  total_poles: number;
  total_points: number;
  constructors_titles: number;
  drivers_titles: number;
  first_season: number | null;
  last_season: number | null;
};
export type Member = {
  team_id: string;
  name: string;
  first_season: number | null;
  last_season: number | null;
  total_starts: number;
  total_wins: number;
  total_poles: number;
  constructors_titles: number;
  drivers_titles: number;
  lineage: string;
};
export type TeamDriver = { driver_id: string; name: string; from_year: number; to_year: number; races: number; wins: number };
export type Car = {
  car_id: number;
  year: number;
  chassis_id: string | null;
  model: string | null;
  full_name: string | null;
  engine_name: string | null;
  engine_maker: string | null;
  engine_info: string | null;
  tyre_maker: string | null;
  img: string | null;
  img_page: string | null;
  img_author: string | null;
  img_licence: string | null;
  races: number | null;
  wins: number | null;
  points: number | null;
  pos: number | null;
  poles: number;
  podiums: number;
};
export type TeamPageData = { profile: TeamProfile; members: Member[]; drivers: TeamDriver[]; cars: Car[] };

export async function allTeamIds(): Promise<string[]> {
  const db = await getServerDb();
  return (await db.getAllAsync<{ team_id: string }>('SELECT team_id FROM team ORDER BY team_id')).map((r) => r.team_id);
}

export async function loadTeam(id: string): Promise<TeamPageData | null> {
  const db = await getServerDb();
  const profile = await db.getFirstAsync<TeamProfile>(
    `SELECT team_id, name, nationality, bio, bio_source_url, bio_licence, total_starts, total_wins, total_podiums, total_poles,
            total_points, constructors_titles, drivers_titles, first_season, last_season
     FROM team WHERE team_id = ?`,
    [id]
  );
  if (!profile) return null;

  const members = await db.getAllAsync<Member>(
    `SELECT t.team_id AS team_id, t.name AS name, t.first_season AS first_season, t.last_season AS last_season,
            t.total_starts AS total_starts, t.total_wins AS total_wins, t.total_poles AS total_poles,
            t.constructors_titles AS constructors_titles, t.drivers_titles AS drivers_titles, ti.display_name AS lineage
     FROM team t JOIN team_identity ti ON ti.team_identity_id = t.team_identity_id
     WHERE t.team_identity_id = (SELECT team_identity_id FROM team WHERE team_id = ?)
     ORDER BY t.first_season, t.name`,
    [id]
  );

  const drivers = await db.getAllAsync<TeamDriver>(
    `SELECT d.driver_id AS driver_id, d.given_name || ' ' || d.family_name AS name, MIN(ds.season_year) AS from_year,
            MAX(ds.season_year) AS to_year, SUM(ds.races_entered) AS races, SUM(ds.wins) AS wins
     FROM driver_season ds JOIN driver d ON d.driver_id = ds.driver_id
     WHERE ds.team_id = ? GROUP BY ds.driver_id ORDER BY wins DESC, races DESC`,
    [id]
  );

  // cars exist only in databases built with the cars data
  let cars: Car[] = [];
  try {
    cars = await db.getAllAsync<Car>(
      `SELECT c.car_id AS car_id, c.season_year AS year, c.chassis_id AS chassis_id, c.model AS model, c.full_name AS full_name,
              c.engine_name AS engine_name, c.engine_maker AS engine_maker, c.engine_info AS engine_info, c.tyre_maker AS tyre_maker,
              ci.url AS img, ci.page_url AS img_page, ci.author AS img_author, ci.licence AS img_licence,
              ts.races_entered AS races, ts.wins AS wins, ts.points AS points, ts.final_position AS pos,
              (SELECT COUNT(*) FROM race_pole p JOIN race ra ON ra.race_id = p.race_id
                 WHERE p.team_id = c.team_id AND ra.season_year = c.season_year) AS poles,
              (SELECT COUNT(*) FROM result r JOIN race ra ON ra.race_id = r.race_id
                 WHERE r.team_id = c.team_id AND ra.season_year = c.season_year AND r.position_text IN ('1','2','3')) AS podiums
       FROM car c LEFT JOIN car_image ci ON ci.chassis_id = c.chassis_id
       LEFT JOIN team_season ts ON ts.team_id = c.team_id AND ts.season_year = c.season_year
       WHERE c.team_id = ? ORDER BY c.season_year DESC, c.car_id`,
      [id]
    );
  } catch {
    cars = [];
  }
  return { profile, members, drivers, cars };
}
