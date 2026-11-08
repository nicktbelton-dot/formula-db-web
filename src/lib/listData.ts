import type { TeamBase } from '@/core/teamGroups';
import { getServerDb } from './serverDb';

// The Drivers and Teams lists, read at build time, so the lists are in the page itself (fast, and visible to search engines).
export type DriverListRow = {
  driver_id: string;
  name: string;
  family_name: string;
  nationality: string | null;
  first_season: number | null;
  last_season: number | null;
  career_wins: number;
  career_starts: number;
  career_poles: number;
  career_podiums: number;
  championships: number;
  is_current: number;
};

export async function loadDriverList(): Promise<DriverListRow[]> {
  const db = await getServerDb();
  return db.getAllAsync<DriverListRow>(
    `SELECT driver_id, given_name || ' ' || family_name AS name, family_name, nationality, first_season, last_season,
            career_wins, career_starts, career_poles, career_podiums, championships,
            CASE WHEN last_season = (SELECT MAX(season_year) FROM race) THEN 1 ELSE 0 END AS is_current
     FROM driver ORDER BY family_name, given_name`
  );
}

export async function loadTeamList(): Promise<TeamBase[]> {
  const db = await getServerDb();
  return db.getAllAsync<TeamBase>(
    `SELECT team_id, name, nationality, first_season, last_season, total_wins, total_starts, total_poles, constructors_titles, team_identity_id,
            CASE WHEN last_season = (SELECT MAX(season_year) FROM race) THEN 1 ELSE 0 END AS is_current,
            (SELECT display_name FROM team_identity ti WHERE ti.team_identity_id = team.team_identity_id) AS lineage,
            (SELECT COUNT(*) FROM team t2 WHERE t2.team_identity_id = team.team_identity_id) AS lineage_size
     FROM team ORDER BY name`
  );
}
