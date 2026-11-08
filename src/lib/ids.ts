// Addresses are lower case, so each driver, team and circuit has exactly one clean address.
export const urlId = (id: string): string => id.toLowerCase();

// The ids for a section's pages, lower-cased. Two ids that differ only by capital letters would collide, so that stops the build.
export function uniqueLowerIds(ids: string[], kind: string): string[] {
  const seen = new Map<string, string>();
  for (const id of ids) {
    const key = id.toLowerCase();
    const other = seen.get(key);
    if (other !== undefined && other !== id) throw new Error(`Two ${kind} ids differ only by capital letters: "${other}" and "${id}"`);
    seen.set(key, id);
  }
  return [...seen.keys()];
}
