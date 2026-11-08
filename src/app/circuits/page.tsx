import { pageMeta } from '@/lib/seo';
import type { Metadata } from 'next';
import CircuitsExplorer from '@/components/CircuitsExplorer';
import { loadCircuitList } from '@/lib/circuitData';

export const metadata: Metadata = pageMeta({
  title: 'Formula One circuits, on a globe',
  description: 'Every circuit that has hosted a Formula One race since 1950, on a globe you can turn, with a searchable list, track layouts and every winner.',
  path: '/circuits',
});

export default async function Circuits() {
  const rows = await loadCircuitList();
  return <CircuitsExplorer rows={rows} />;
}
