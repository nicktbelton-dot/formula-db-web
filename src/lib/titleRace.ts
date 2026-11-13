import type { Db } from './sqljs';

// The two championships on Home: who is leading this season's title race (drivers and constructors), or who has clinched it, and
// who is the reigning champion in between. Everything comes from the standings and the champion records in the database.
export type Standing = { id: string; name: string; pts: number };
export type Reigning = { year: number; id: string; name: string; left: number | null };
export type Side = {
  champion: { id: string; name: string } | null; // already decided this season
  left: number | null; // races still to run when it was first decided
  top: Standing[]; // the first two in the standings after the latest round
  reigning: Reigning | null; // last season's champion
};
export type TitleInfo = {
  year: number;
  done: number; // rounds run so far this season
  total: number; // rounds in the calendar
  first: { name: string; date: string } | null; // the season's first race
  drivers: Side;
  teams: Side;
};

export const raceWord = (n: number): string => `${n} ${n === 1 ? 'race' : 'races'}`;
const fmt = (n: number): string => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const pointWord = (n: number): string => `${fmt(n)} ${n === 1 ? 'point' : 'points'}`;

// "Norris leads Verstappen by 18 points." / "level on 150 points."
export function leadLine(top: Standing[]): string | null {
  if (top.length === 0) return null;
  if (top.length === 1) return `${top[0].name} leads on ${pointWord(top[0].pts)}.`;
  const [a, b] = top;
  const gap = Math.round((a.pts - b.pts) * 10) / 10;
  return gap === 0 ? `${a.name} and ${b.name} are level on ${pointWord(a.pts)}.` : `${a.name} leads ${b.name} by ${pointWord(gap)}.`;
}

export function clinchedLine(year: number, kind: 'drivers' | 'constructors', left: number | null): string {
  const base = `Clinched the ${year} ${kind}' title`;
  return left && left > 0 ? `${base} with ${raceWord(left)} still to run.` : `${base}.`;
}

const NAME = `d.given_name || ' ' || d.family_name`;

export async function loadTitleInfo(db: Db): Promise<TitleInfo | null> {
  const cur = await db.getFirstAsync<{ y: number | null }>('SELECT MAX(year) AS y FROM season');
  if (!cur || !cur.y) return null;
  const year = cur.y;

  const prog = await db.getFirstAsync<{ total: number; done: number }>(
    `SELECT COUNT(*) AS total,
            COALESCE(SUM(CASE WHEN EXISTS (SELECT 1 FROM result x WHERE x.race_id = r.race_id) THEN 1 ELSE 0 END), 0) AS done
     FROM race r WHERE r.season_year = ?`,
    [year]
  );
  const first = await db.getFirstAsync<{ name: string; date: string }>(`SELECT name, race_date AS date FROM race WHERE season_year = ? ORDER BY round LIMIT 1`, [year]);

  // champions already decided this season (a database from before the refresh remembered "races left" has no such columns)
  type Decided = { dc: string | null; tc: string | null; dl: number | null; tl: number | null };
  let decided: Decided | null;
  try {
    decided = await db.getFirstAsync<Decided>(`SELECT driver_champion_id AS dc, team_champion_id AS tc, driver_title_left AS dl, team_title_left AS tl FROM season WHERE year = ?`, [year]);
  } catch {
    decided = await db.getFirstAsync<Decided>(`SELECT driver_champion_id AS dc, team_champion_id AS tc, NULL AS dl, NULL AS tl FROM season WHERE year = ?`, [year]);
  }
  const champDriver = decided?.dc
    ? await db.getFirstAsync<{ id: string; name: string }>(`SELECT d.driver_id AS id, ${NAME} AS name FROM driver d WHERE d.driver_id = ?`, [decided.dc])
    : null;
  const champTeam = decided?.tc ? await db.getFirstAsync<{ id: string; name: string }>(`SELECT team_id AS id, name FROM team WHERE team_id = ?`, [decided.tc]) : null;

  const done = prog?.done ?? 0;
  const driverTop =
    done > 0
      ? await db.getAllAsync<Standing>(
          `SELECT d.driver_id AS id, ${NAME} AS name, MAX(ds.standing_points) AS pts, MIN(ds.final_position) AS pos
           FROM driver_season ds JOIN driver d ON d.driver_id = ds.driver_id
           WHERE ds.season_year = ? AND ds.final_position IN (1, 2) GROUP BY ds.driver_id ORDER BY pos`,
          [year]
        )
      : [];
  const teamTop =
    done > 0 && year >= 1958
      ? await db.getAllAsync<Standing>(
          `SELECT t.team_id AS id, t.name AS name, ts.points AS pts
           FROM team_season ts JOIN team t ON t.team_id = ts.team_id
           WHERE ts.season_year = ? AND ts.final_position IN (1, 2) ORDER BY ts.final_position`,
          [year]
        )
      : [];

  // last season's champions, for the time between one title and the next
  async function reigning(sql: string): Promise<Reigning | null> {
    try {
      return await db.getFirstAsync<Reigning>(sql, [year]);
    } catch {
      return null;
    }
  }
  const rd = await reigning(
    `SELECT s.year AS year, d.driver_id AS id, ${NAME} AS name, s.driver_title_left AS "left"
     FROM season s JOIN driver d ON d.driver_id = s.driver_champion_id WHERE s.year < ? ORDER BY s.year DESC LIMIT 1`
  ) ?? (await reigning(
    `SELECT s.year AS year, d.driver_id AS id, ${NAME} AS name, NULL AS "left"
     FROM season s JOIN driver d ON d.driver_id = s.driver_champion_id WHERE s.year < ? ORDER BY s.year DESC LIMIT 1`
  ));
  const rt = await reigning(
    `SELECT s.year AS year, t.team_id AS id, t.name AS name, s.team_title_left AS "left"
     FROM season s JOIN team t ON t.team_id = s.team_champion_id WHERE s.year < ? ORDER BY s.year DESC LIMIT 1`
  ) ?? (await reigning(
    `SELECT s.year AS year, t.team_id AS id, t.name AS name, NULL AS "left"
     FROM season s JOIN team t ON t.team_id = s.team_champion_id WHERE s.year < ? ORDER BY s.year DESC LIMIT 1`
  ));

  return {
    year,
    done,
    total: prog?.total ?? 0,
    first: first ?? null,
    drivers: { champion: champDriver, left: decided?.dl ?? null, top: driverTop, reigning: rd },
    teams: { champion: champTeam, left: decided?.tl ?? null, top: teamTop, reigning: rt },
  };
}
