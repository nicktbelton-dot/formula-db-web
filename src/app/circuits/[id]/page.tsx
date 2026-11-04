import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CircuitView from '@/components/CircuitView';
import { allCircuitIds, loadCircuit } from '@/lib/circuitData';

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await allCircuitIds()).map((id) => ({ id }));
}

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const data = await loadCircuit(id);
  if (!data) return { title: 'Circuit not found · Formula DB' };
  const p = data.profile;
  const place = [p.locality, p.country].filter(Boolean).join(', ');
  return {
    title: `${p.name} · Formula DB`,
    description: `${p.official}${place ? `, ${place}` : ''}: ${p.total_races} Formula One races${p.first_race_year ? ` from ${p.first_race_year}${p.last_race_year && p.last_race_year !== p.first_race_year ? ` to ${p.last_race_year}` : ''}` : ''}. Every winner and pole sitter${data.layouts.length ? ' and the track layouts' : ''}.`,
  };
}

export default async function CircuitPage({ params }: Props) {
  const { id } = await params;
  const data = await loadCircuit(id);
  if (!data) notFound();
  return <CircuitView data={data} />;
}
