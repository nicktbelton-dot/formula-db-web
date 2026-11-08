import type { MetadataRoute } from 'next';
import { LAUNCHED, SITE_URL } from '@/lib/siteConfig';

// Until LAUNCHED is true, everything is off limits; afterwards, everything is open except the personal and generated pages.
export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  if (!LAUNCHED) return { rules: [{ userAgent: '*', disallow: '/' }] };
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/ask', '/favourites', '/stats', '/search-index.json'] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
