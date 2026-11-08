import { urlId } from '@/lib/ids';
import { pageMeta } from '@/lib/seo';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import TeamView from '@/components/TeamView';
import { allTeamIds, loadTeam } from '@/lib/teamData';

// One page per team name, built ahead of time. A team with earlier names lists its whole lineage.
export const dynamicParams = false;

export async function generateStaticParams() {
  return (await allTeamIds()).map((id) => ({ id }));
}

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const data = await loadTeam(id);
  if (!data) return { title: 'Team not found · Formula DB' };
  const p = data.profile;
  const span = p.first_season ? ` (${p.first_season}${p.last_season && p.last_season !== p.first_season ? ` to ${p.last_season}` : ''})` : '';
  return pageMeta({ title: `${p.name}`, description: `${p.name}${p.nationality ? `, ${p.nationality}` : ''}: ${p.total_wins} wins, ${p.total_poles} poles and ${p.constructors_titles} constructors' titles in ${p.total_starts} starts${span}.${data.cars.length ? ' Every car, engine and tyre supplier by season.' : ''}`, path: `/teams/${urlId(p.team_id)}` });
}

export default async function TeamPage({ params }: Props) {
  const { id } = await params;
  const data = await loadTeam(id);
  if (!data) notFound();
  return <TeamView data={data} />;
}
