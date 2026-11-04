import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import RaceView from '@/components/RaceView';
import { allRaceSlugs, loadRace } from '@/lib/seasonData';

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await allRaceSlugs()).map((slug) => ({ slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadRace(slug);
  if (!data) return { title: 'Race not found · Formula DB' };
  const won = data.winner ? ` Won by ${data.winner.name}${data.winner.team ? ` (${data.winner.team})` : ''}.` : '';
  return {
    title: `${data.year} ${data.name} · Formula DB`,
    description: `Full results${data.quali.length ? ' and qualifying' : ''} for the ${data.year} ${data.name}${data.circuit ? ` at ${data.circuit}` : ''}.${won}`,
  };
}

export default async function RacePage({ params }: Props) {
  const { slug } = await params;
  const data = await loadRace(slug);
  if (!data) notFound();
  return <RaceView data={data} />;
}
