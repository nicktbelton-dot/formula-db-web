import type { StatKey } from '@/core/types';

// A statistic tile opens the list of records behind it, for example every race a driver has won.
export const statHref = (entity: 'driver' | 'team', id: string, stat: StatKey): string =>
  `/stats?entity=${entity}&id=${encodeURIComponent(id)}&stat=${stat}`;
