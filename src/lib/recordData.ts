import { Group, Open, RecordRow, recordByKey, RECORDS } from '@/core/records';
import { raceSlugById } from './seasonData';
import { getServerDb } from './serverDb';

// A record's top rows, worked out at build time from the database, with the address each row should open.
export type RecordLine = RecordRow & { href: string | null };
export type RecordPageData = {
  key: string;
  group: Group;
  title: string;
  blurb: string;
  note: string | null;
  rows: RecordLine[];
  latestYear: number | null;
  prev: { key: string; title: string } | null;
  next: { key: string; title: string } | null;
};

export const allRecordKeys = (): string[] => RECORDS.map((r) => r.key);

function hrefFor(open: Open | undefined, slugs: Map<number, string>): string | null {
  if (!open) return null;
  switch (open.kind) {
    case 'driver': return `/drivers/${open.id}`;
    case 'team': return `/teams/${open.id}`;
    case 'circuit': return `/circuits/${open.id}`;
    case 'season': return `/seasons/${open.year}`;
    case 'race': {
      const slug = slugs.get(open.id);
      return slug ? `/races/${slug}` : null;
    }
  }
}

export async function loadRecord(key: string): Promise<RecordPageData | null> {
  const def = recordByKey(key);
  if (!def) return null;
  const db = await getServerDb();
  const slugs = await raceSlugById();
  const rows = await def.load(db as never);
  // the most recent season with results, so entries set in it can be marked "This season"
  const latest = await db.getFirstAsync<{ y: number | null }>(
    `SELECT MAX(ra.season_year) AS y FROM race ra WHERE EXISTS (SELECT 1 FROM result r WHERE r.race_id = ra.race_id)`
  );
  const at = RECORDS.findIndex((r) => r.key === key);
  const nb = (i: number) => (RECORDS[i] ? { key: RECORDS[i].key, title: RECORDS[i].title } : null);
  return {
    key: def.key,
    group: def.group,
    title: def.title,
    blurb: def.blurb,
    note: def.note ?? null,
    rows: rows.map((r) => ({ ...r, href: hrefFor(r.open, slugs) })),
    latestYear: latest?.y ?? null,
    prev: nb(at - 1),
    next: nb(at + 1),
  };
}
