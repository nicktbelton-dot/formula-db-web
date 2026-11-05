import type { Metadata } from 'next';
import CompareView from '@/components/CompareView';

export const metadata: Metadata = {
  title: 'Compare Formula One drivers · Formula DB',
  description: 'Compare any two Formula One drivers: wins, podiums, poles, points, average finish and qualifying, head to head, over a career or a single season.',
};

export default function Compare() {
  return <CompareView />;
}
