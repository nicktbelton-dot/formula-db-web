// Track layouts (drawings from F1DB): which one was used in a season, and how to label it.
export type LayoutPath = { d: string; w: number };
export type Layout = {
  layout_id: string;
  first_year: number | null;
  last_year: number | null;
  years_text: string | null;
  length_km: number | null;
  turns: number | null;
  paths: LayoutPath[];
};

export const layoutLabel = (l: Layout): string =>
  l.first_year ? `${l.first_year}–${l.last_year === 9999 ? 'now' : l.last_year}` : l.layout_id;

// Was this layout in use in the given season? years_text looks like '1955–1956, 1960–1961' or '2000–now'.
export function usedIn(yearsText: string | null, year: number): boolean {
  if (!yearsText) return false;
  return yearsText.split(',').some((token) => {
    const m = token.trim().match(/^(\d{4})(?:\s*[–-]\s*(\d{4}|now))?$/);
    if (!m) return false;
    const start = parseInt(m[1], 10);
    const end = m[2] === 'now' ? 9999 : m[2] ? parseInt(m[2], 10) : start;
    return year >= start && year <= end;
  });
}

// The layout for a season: the one listed for that year, otherwise the latest one that began before it.
export function layoutFor(layouts: Layout[], year: number): number {
  const exact = layouts.findIndex((l) => usedIn(l.years_text, year));
  if (exact >= 0) return exact;
  let best = -1;
  layouts.forEach((l, i) => {
    if (l.first_year !== null && l.first_year <= year && (best < 0 || l.first_year >= (layouts[best].first_year ?? 0))) best = i;
  });
  return best >= 0 ? best : 0;
}
