import type { Metadata } from 'next';
import AskView from '@/components/AskView';

// Questions are answered in the browser, and each answer is different, so this page is not for search engines.
export const metadata: Metadata = { title: 'Ask a question · Formula DB', robots: { index: false } };

export default function Ask() {
  return <AskView />;
}
