import type { AskOpen } from '@/core/askEngine';
import { slugify } from './slug';

// The page an answer row or button opens. A race is found by its title, "2009 Italian Grand Prix".
export function hrefForOpen(o: AskOpen | undefined): string | null {
  if (!o) return null;
  switch (o.kind) {
    case 'driver': return `/drivers/${o.id}`;
    case 'team': return `/teams/${o.id}`;
    case 'circuit': return `/circuits/${o.id}`;
    case 'season': return `/seasons/${o.year}`;
    case 'race': return `/races/${slugify(o.name)}`;
    case 'record': return `/records/${o.key}`;
  }
}
