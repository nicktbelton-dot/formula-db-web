import type { Db } from './sqljs';

// The comparison of two drivers: the phone app's queries, run in the browser on the downloaded database.
export type PickerDriver = { driver_id: string; name: string; first_season: number | null; last_season: number | null; career_wins: number };
export type Stats = {
  races: number;
  wins: number;
  podiums: number;
  poles: number;
  points: number;
  avgFinish: number | null;
  avgQuali: number | null;
  retirements: number;
  standing: number | null;
};
export type Head = { shared: number; classified: number; aAhead: number; bAhead: number };
export type QHead = { shared: number; aAhead: number; bAhead: number };
export type Series = { name: string; which: 'a' | 'b'; values: (number | null)[] };
export type CompareData = { a: Stats; b: Stats; finish: Head; quali: QHead; series: Series[]; xLabels: string[]; chartTitle: string; chartNote: string };

// The same "did this count as a start" rule used everywhere else on the site.
const STARTED =
  "s.status NOT IN ('Did not qualify','Did not prequalify','Did not start','Withdrew')" +
  " AND NOT (COALESCE(r.position_text, '') = 'W' AND COALESCE(r.laps, 0) = 0)";

export const loadDrivers = (db: Db) =>
  db.getAllAsync<PickerDriver>(
    `SELECT driver_id, given_name || ' ' || family_name AS name, first_season, last_season, career_wins
     FROM driver WHERE career_starts > 0 ORDER BY family_name, given_name`
  );

// Seasons in which both drivers raced, newest first
export async function loadSharedYears(db: Db, a: string, b: string): Promise<number[]> {
  const rows = await db.getAllAsync<{ season_year: number }>(
    `SELECT season_year FROM driver_season WHERE driver_id = ?
     INTERSECT
     SELECT season_year FROM driver_season WHERE driver_id = ?
     ORDER BY season_year DESC`,
    [a, b]
  );
  return rows.map((r) => r.season_year);
}

async function loadStats(db: Db, id: string, year: number | null): Promise<Stats> {
  const main = await db.getFirstAsync<{ races: number; wins: number; podiums: number; points: number; avg_finish: number | null; retirements: number }>(
    `SELECT COUNT(*) AS races,
            COALESCE(SUM(r.position_text = '1'), 0) AS wins,
            COALESCE(SUM(r.position_text IN ('1','2','3')), 0) AS podiums,
            COALESCE(SUM(r.points), 0) AS points,
            AVG(CASE WHEN r.position_text GLOB '[0-9]*' THEN r.position END) AS avg_finish,
            COALESCE(SUM(NOT (r.position_text GLOB '[0-9]*')), 0) AS retirements
     FROM result r
     JOIN race ra ON ra.race_id = r.race_id
     JOIN status s ON s.status_id = r.status_id
     WHERE r.driver_id = ? AND (? IS NULL OR ra.season_year = ?) AND ${STARTED}`,
    [id, year, year]
  );
  // pole positions come from race_pole (qualifying P1 or grid 1, with the pole overrides applied)
  const pole = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM race_pole p JOIN race ra ON ra.race_id = p.race_id
     WHERE p.driver_id = ? AND (? IS NULL OR ra.season_year = ?)`,
    [id, year, year]
  );
  const q = await db.getFirstAsync<{ avg: number | null }>(
    `SELECT AVG(q.position) AS avg FROM qualifying q JOIN race ra ON ra.race_id = q.race_id
     WHERE q.driver_id = ? AND q.position IS NOT NULL AND (? IS NULL OR ra.season_year = ?)`,
    [id, year, year]
  );
  let standing: number | null = null;
  if (year !== null) {
    const st = await db.getFirstAsync<{ p: number | null }>(
      `SELECT MIN(final_position) AS p FROM driver_season WHERE driver_id = ? AND season_year = ?`,
      [id, year]
    );
    standing = st?.p ?? null;
  }
  return {
    races: main?.races ?? 0,
    wins: main?.wins ?? 0,
    podiums: main?.podiums ?? 0,
    poles: pole?.n ?? 0,
    points: main?.points ?? 0,
    avgFinish: main?.avg_finish ?? null,
    avgQuali: q?.avg ?? null,
    retirements: main?.retirements ?? 0,
    standing,
  };
}

async function loadFinishHead(db: Db, a: string, b: string, year: number | null): Promise<Head> {
  const r = await db.getFirstAsync<{ shared: number; classified: number; a_ahead: number; b_ahead: number }>(
    `SELECT COUNT(*) AS shared,
            COALESCE(SUM(a.position_text GLOB '[0-9]*' AND b.position_text GLOB '[0-9]*'), 0) AS classified,
            COALESCE(SUM(a.position_text GLOB '[0-9]*' AND b.position_text GLOB '[0-9]*' AND a.position < b.position), 0) AS a_ahead,
            COALESCE(SUM(a.position_text GLOB '[0-9]*' AND b.position_text GLOB '[0-9]*' AND a.position > b.position), 0) AS b_ahead
     FROM result a
     JOIN result b ON b.race_id = a.race_id AND b.driver_id = ?
     JOIN race ra ON ra.race_id = a.race_id
     WHERE a.driver_id = ? AND (? IS NULL OR ra.season_year = ?)`,
    [b, a, year, year]
  );
  return { shared: r?.shared ?? 0, classified: r?.classified ?? 0, aAhead: r?.a_ahead ?? 0, bAhead: r?.b_ahead ?? 0 };
}

async function loadQualiHead(db: Db, a: string, b: string, year: number | null): Promise<QHead> {
  const r = await db.getFirstAsync<{ shared: number; a_ahead: number; b_ahead: number }>(
    `SELECT COUNT(*) AS shared,
            COALESCE(SUM(a.position < b.position), 0) AS a_ahead,
            COALESCE(SUM(a.position > b.position), 0) AS b_ahead
     FROM qualifying a
     JOIN qualifying b ON b.race_id = a.race_id AND b.driver_id = ?
     JOIN race ra ON ra.race_id = a.race_id
     WHERE a.driver_id = ? AND a.position IS NOT NULL AND b.position IS NOT NULL
       AND (? IS NULL OR ra.season_year = ?)`,
    [b, a, year, year]
  );
  return { shared: r?.shared ?? 0, aAhead: r?.a_ahead ?? 0, bAhead: r?.b_ahead ?? 0 };
}

// cumulative points after each round of one season
async function loadSeasonCurve(db: Db, id: string, year: number): Promise<number[]> {
  const rows = await db.getAllAsync<{ pts: number }>(
    `SELECT COALESCE(SUM(r.points), 0) AS pts
     FROM race ra LEFT JOIN result r ON r.race_id = ra.race_id AND r.driver_id = ?
     WHERE ra.season_year = ?
     GROUP BY ra.race_id ORDER BY ra.round`,
    [id, year]
  );
  let total = 0;
  return rows.map((row) => (total += row.pts));
}

// points per season across a whole career
async function loadCareerCurve(db: Db, id: string): Promise<Map<number, number>> {
  const rows = await db.getAllAsync<{ season_year: number; pts: number }>(
    `SELECT season_year, COALESCE(SUM(points), 0) AS pts FROM driver_season WHERE driver_id = ? GROUP BY season_year`,
    [id]
  );
  return new Map(rows.map((r) => [r.season_year, r.pts]));
}

export async function loadCompare(db: Db, a: PickerDriver, b: PickerDriver, year: number | null): Promise<CompareData> {
  const [sa, sb, finish, quali] = await Promise.all([
    loadStats(db, a.driver_id, year),
    loadStats(db, b.driver_id, year),
    loadFinishHead(db, a.driver_id, b.driver_id, year),
    loadQualiHead(db, a.driver_id, b.driver_id, year),
  ]);
  let series: Series[];
  let xLabels: string[];
  let chartTitle: string;
  let chartNote: string;
  if (year !== null) {
    const [ca, cb] = await Promise.all([loadSeasonCurve(db, a.driver_id, year), loadSeasonCurve(db, b.driver_id, year)]);
    series = [{ name: a.name, which: 'a', values: ca }, { name: b.name, which: 'b', values: cb }];
    xLabels = ca.map((_, i) => String(i + 1));
    chartTitle = `Points through ${year}`;
    chartNote = 'Cumulative points after each round.';
  } else {
    const [ma, mb] = await Promise.all([loadCareerCurve(db, a.driver_id), loadCareerCurve(db, b.driver_id)]);
    const years = [...ma.keys(), ...mb.keys()];
    const lo = Math.min(...years);
    const hi = Math.max(...years);
    const span: number[] = [];
    for (let y = lo; y <= hi; y++) span.push(y);
    series = [
      { name: a.name, which: 'a', values: span.map((y) => ma.get(y) ?? null) },
      { name: b.name, which: 'b', values: span.map((y) => mb.get(y) ?? null) },
    ];
    xLabels = span.map(String);
    chartTitle = 'Points by season';
    chartNote = "Each season's points reflect the scoring system of its era, so compare across eras with care.";
  }
  return { a: sa, b: sb, finish, quali, series, xLabels, chartTitle, chartNote };
}
