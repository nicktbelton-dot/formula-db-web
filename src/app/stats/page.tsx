import type { Metadata } from 'next';
import StatListView from '@/components/StatListView';

// Opened from a statistic tile; the address carries the driver or team and which statistic. Not for search engines.
export const metadata: Metadata = { title: 'Records · Formula DB', robots: { index: false } };

export default function Stats() {
  return <StatListView />;
}
