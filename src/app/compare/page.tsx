import { pageMeta } from '@/lib/seo';
import type { Metadata } from 'next';
import CompareView from '@/components/CompareView';

export const metadata: Metadata = pageMeta({
  title: 'Compare Formula One drivers',
  description: 'Compare any two Formula One drivers: wins, podiums, poles, points, average finish and qualifying, head to head, over a career or a single season.',
  path: '/compare',
});

export default function Compare() {
  return <CompareView />;
}
