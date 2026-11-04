import { getServerDb } from './serverDb';
import type { Layout } from './layouts';

// A circuit's track layouts, read at build time. Databases built before layouts existed simply have none.
export async function loadLayouts(circuitId: string | null): Promise<Layout[]> {
  if (!circuitId) return [];
  try {
    const db = await getServerDb();
    const rows = await db.getAllAsync<Omit<Layout, 'paths'> & { paths: string }>(
      `SELECT layout_id, first_year, last_year, years_text, length_km, turns, paths
       FROM circuit_layout WHERE circuit_id = ? ORDER BY COALESCE(first_year, 0), layout_id`,
      [circuitId]
    );
    return rows.map((r) => ({ ...r, paths: JSON.parse(r.paths) as Layout['paths'] }));
  } catch {
    return [];
  }
}
