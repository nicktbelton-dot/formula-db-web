import { pageMeta } from '@/lib/seo';
import type { Metadata } from 'next';
import FavouritesView from '@/components/FavouritesView';

// Favourites live in each visitor's own browser, so this page is not for search engines.
export const metadata: Metadata = { ...pageMeta({ title: 'Favourites', description: 'Your saved drivers, teams and circuits.', path: '/favourites' }), robots: { index: false, follow: false } };

export default function Favourites() {
  return <FavouritesView />;
}
