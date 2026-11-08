import TeamsList from '@/components/TeamsList';
import { loadTeamList } from '@/lib/listData';
import { pageMeta } from '@/lib/seo';

export const metadata = pageMeta({
  title: 'Formula One teams since 1950',
  description: 'Every Formula One team, with renamed and taken-over teams joined into one story. Wins, poles, titles and cars by season.',
  path: '/teams',
});

export default async function Teams() {
  return <TeamsList initial={await loadTeamList()} />;
}
