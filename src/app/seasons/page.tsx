import type { Metadata } from 'next';
import SeasonsList from '@/components/SeasonsList';
import { loadSeasonList } from '@/lib/seasonData';
import { pageMeta } from '@/lib/seo';

export const metadata: Metadata = pageMeta({
  title: 'Formula One seasons since 1950',
  description: 'Every Formula One season since 1950: the champions, the number of races, and results race by race.',
  path: '/seasons',
});

export default async function Seasons() {
  return <SeasonsList initial={await loadSeasonList()} />;
}
