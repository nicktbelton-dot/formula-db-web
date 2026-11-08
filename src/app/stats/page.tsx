import { pageMeta } from '@/lib/seo';
import type { Metadata } from 'next';
import StatListView from '@/components/StatListView';

// Opened from a statistic tile; the address carries the driver or team and which statistic. Not for search engines.
export const metadata: Metadata = { ...pageMeta({ title: 'Records', description: 'The records behind a statistic.', path: '/stats' }), robots: { index: false, follow: false } };

export default function Stats() {
  return <StatListView />;
}
