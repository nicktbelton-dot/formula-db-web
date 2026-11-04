import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import SeasonView from '@/components/SeasonView';
import { allSeasonYears, loadSeason } from '@/lib/seasonData';

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await allSeasonYears()).map((y) => ({ year: String(y) }));
}

type Props = { params: Promise<{ year: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { year } = await params;
  const data = await loadSeason(Number(year));
  if (!data) return { title: 'Season not found · Formula DB' };
  const champ = data.champion ? ` ${data.champion.name} won the drivers' title${data.team_champion ? `, ${data.team_champion.name} the constructors'` : ''}.` : '';
  return {
    title: `${data.year} Formula One season · Formula DB`,
    description: `Results, winners and standings for all ${data.races.length} races of the ${data.year} Formula One season.${champ}`,
  };
}

export default async function SeasonPage({ params }: Props) {
  const { year } = await params;
  const data = await loadSeason(Number(year));
  if (!data) notFound();
  return <SeasonView data={data} />;
}
