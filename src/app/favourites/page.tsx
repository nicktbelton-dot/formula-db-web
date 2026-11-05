import type { Metadata } from 'next';
import FavouritesView from '@/components/FavouritesView';

// Favourites live in each visitor's own browser, so this page is not for search engines.
export const metadata: Metadata = { title: 'Favourites · Formula DB', robots: { index: false } };

export default function Favourites() {
  return <FavouritesView />;
}
