import DriversList from '@/components/DriversList';
import { loadDriverList } from '@/lib/listData';
import { pageMeta } from '@/lib/seo';

export const metadata = pageMeta({
  title: 'Formula One drivers since 1950',
  description: 'Every Formula One driver since 1950, with wins, poles, podiums and titles. Sort and filter by nationality, era and success.',
  path: '/drivers',
});

export default async function Drivers() {
  return <DriversList initial={await loadDriverList()} />;
}
