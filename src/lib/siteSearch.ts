// The site's search: matches what is typed against names, years and places, words first, in any order.
export type Kind = 'd' | 't' | 'c' | 'a' | 's' | 'r' | 'k' | 'p';
export type Raw = [Kind, string, string, string, string, number];
export type Entry = { kind: Kind; href: string; title: string; sub: string; pop: number; nf: string; words: string[]; xf: string; xwords: string[] };
export type Hit = { entry: Entry; score: number };
export type Group = { kind: Kind; label: string; hits: Hit[] };

export const LABELS: Record<Kind, string> = { d: 'Drivers', t: 'Teams', c: 'Circuits', a: 'Cars', s: 'Seasons', r: 'Races', k: 'Records', p: 'Pages' };
const ORDER: Kind[] = ['d', 't', 'c', 'a', 's', 'k', 'p', 'r'];
const LIMITS: Record<Kind, number> = { d: 5, t: 4, c: 4, a: 4, s: 3, r: 5, k: 3, p: 3 };

// lower case, accents and punctuation removed: "Räikkönen" and "raikkonen" are the same
export const fold = (s: string): string =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export function buildIndex(raw: Raw[]): Entry[] {
  return raw.map(([kind, href, title, sub, extra, pop]) => {
    const nf = fold(title);
    const xf = fold(extra);
    return { kind, href, title, sub, pop, nf, words: nf.split(' '), xf, xwords: xf.split(' ') };
  });
}

function scoreEntry(e: Entry, q: string, tokens: string[]): number {
  if (e.nf === q) return 1000;
  let score = 0;
  for (const t of tokens) {
    if (e.words.some((w) => w.startsWith(t))) score += 100;
    else if (e.xwords.some((w) => w.startsWith(t))) score += 40;
    else if (e.nf.includes(t)) score += 20;
    else if (e.xf.includes(t)) score += 10;
    else return -1; // every word typed has to be found somewhere
  }
  if (e.nf.startsWith(q)) score += 300;
  else if (e.nf.includes(q)) score += 60;
  return score;
}

export function search(index: Entry[], query: string): Group[] {
  // "gp" is what people type for Grand Prix
  const q = fold(query).replace(/\bgp\b/g, 'grand prix');
  if (!q) return [];
  const tokens = q.split(' ');
  const byKind = new Map<Kind, Hit[]>();
  for (const entry of index) {
    const score = scoreEntry(entry, q, tokens);
    if (score < 0) continue;
    const list = byKind.get(entry.kind) ?? [];
    list.push({ entry, score });
    byKind.set(entry.kind, list);
  }
  const groups: Group[] = [];
  for (const kind of ORDER) {
    const hits = byKind.get(kind);
    if (!hits) continue;
    hits.sort((a, b) => b.score - a.score || b.entry.pop - a.entry.pop || a.entry.title.localeCompare(b.entry.title));
    groups.push({ kind, label: LABELS[kind], hits: hits.slice(0, LIMITS[kind]) });
  }
  // the group holding the best match comes first
  groups.sort((a, b) => b.hits[0].score - a.hits[0].score || ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind));
  return groups;
}

// Does this read as a question for the Ask page rather than a name to look up?
const QUESTION_START = /^(who|whom|whose|what|when|where|which|why|how|did|does|do|is|are|was|were|has|have|had|can|could|will|list|show|name|compare|tell)\b/;
export function looksLikeQuestion(query: string): boolean {
  const q = query.trim().toLowerCase();
  const words = q.replace(/\?/g, ' ').split(/\s+/).filter(Boolean).length;
  if (words < 2) return false; // a single word is a name to look up, even "compare"
  return q.includes('?') || QUESTION_START.test(q) || words >= 6;
}
