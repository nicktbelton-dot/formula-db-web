import { pageMeta } from '@/lib/seo';
import type { Metadata } from 'next';
import AskView from '@/components/AskView';

// Questions are answered in the browser, and each answer is different, so this page is not for search engines.
export const metadata: Metadata = { ...pageMeta({ title: 'Ask a question', description: 'Ask plain-English questions about Formula One history and get answers from the data.', path: '/ask' }), robots: { index: false, follow: false } };

export default function Ask() {
  return <AskView />;
}
