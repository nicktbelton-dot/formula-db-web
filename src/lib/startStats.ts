// Where the winners at a circuit started from, worked out from the results. Plain TypeScript, the same in the website and
// the phone app: the queries differ (each side reads its own database), the sums do not.

export type Winner = { race_id: number; year: number; grid: number; driver_id: string; driver: string };
export type Bin = { label: string; n: number };
export type StartStats = {
  counted: number; // wins with a recorded starting slot
  bins: Bin[];
  poleRaces: number; // races with an official pole sitter and a winner
  poleWon: number; // of those, the ones the pole sitter won
  furthest: { race_id: number; year: number; grid: number; driver_id: string; driver: string } | null;
};

const BINS: [string, (g: number) => boolean][] = [
  ['Pole', (g) => g === 1],
  ['2nd', (g) => g === 2],
  ['3rd', (g) => g === 3],
  ['4th to 6th', (g) => g >= 4 && g <= 6],
  ['7th to 10th', (g) => g >= 7 && g <= 10],
  ['11th or lower', (g) => g >= 11],
];

// null when there are too few races for the picture to mean much
export function computeStarts(winners: Winner[], poleRaces: number, poleWon: number): StartStats | null {
  const known = winners.filter((w) => w.grid > 0); // a grid of 0 is a pit-lane start, left out
  if (known.length < 3) return null;
  const bins = BINS.map(([label, test]) => ({ label, n: known.filter((w) => test(w.grid)).length }));
  const far = [...known].sort((a, b) => b.grid - a.grid || b.year - a.year)[0];
  return {
    counted: known.length,
    bins,
    poleRaces,
    poleWon,
    furthest: far.grid >= 3 ? { race_id: far.race_id, year: far.year, grid: far.grid, driver_id: far.driver_id, driver: far.driver } : null,
  };
}

export const WINNER_SQL = `SELECT ra.race_id AS race_id, ra.season_year AS year, r.grid AS grid, d.driver_id AS driver_id,
        d.given_name || ' ' || d.family_name AS driver
 FROM result r JOIN race ra ON ra.race_id = r.race_id JOIN driver d ON d.driver_id = r.driver_id
 WHERE ra.circuit_id = ? AND r.position_text = '1' AND r.grid > 0`;

export const POLE_SQL = `SELECT COUNT(*) AS races, COALESCE(SUM(p.driver_id = ra.winner_driver_id), 0) AS won
 FROM race ra JOIN race_pole p ON p.race_id = ra.race_id
 WHERE ra.circuit_id = ? AND ra.winner_driver_id IS NOT NULL`;

export const ordinalGrid = (g: number): string => {
  if (g === 1) return 'pole';
  const s = ['th', 'st', 'nd', 'rd'];
  const v = g % 100;
  return `${g}${s[(v - 20) % 10] || s[v] || s[0]}`;
};
