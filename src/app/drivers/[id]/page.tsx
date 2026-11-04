import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import DriverView from '@/components/DriverView';
import { allDriverIds, loadDriver } from '@/lib/driverData';

// One page per driver, built ahead of time from the database so it opens instantly and can be found by search.
export const dynamicParams = false;

export async function generateStaticParams() {
  return (await allDriverIds()).map((id) => ({ id }));
}

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const data = await loadDriver(id);
  if (!data) return { title: 'Driver not found · Formula DB' };
  const p = data.profile;
  const span = p.first_season ? ` (${p.first_season}${p.last_season && p.last_season !== p.first_season ? ` to ${p.last_season}` : ''})` : '';
  return {
    title: `${p.name} · Formula DB`,
    description: `${p.name}${p.nationality ? `, ${p.nationality}` : ''}: ${p.career_wins} wins, ${p.career_poles} poles and ${p.championships} world titles in ${p.career_starts} starts${span}.`,
  };
}

export default async function DriverPage({ params }: Props) {
  const { id } = await params;
  const data = await loadDriver(id);
  if (!data) notFound();
  return <DriverView data={data} />;
}
