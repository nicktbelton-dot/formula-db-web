import type { Metadata } from 'next';
import { SITE_NAME } from './siteConfig';

// Title, description, canonical address and the preview card (Open Graph and Twitter) for a page, in one call.
export function pageMeta({ title, description, path }: { title: string; description: string; path: string }): Metadata {
  const full = title.includes(SITE_NAME) ? title : `${title} · ${SITE_NAME}`;
  return {
    title: full,
    description,
    alternates: { canonical: path },
    openGraph: { title: full, description, url: path, siteName: SITE_NAME, type: 'website', locale: 'en_GB' },
    twitter: { card: 'summary_large_image', title: full, description },
  };
}
