import type { MetadataRoute } from 'next';
import { allCircuitIds } from '@/lib/circuitData';
import { allDriverIds } from '@/lib/driverData';
import { allRecordKeys } from '@/lib/recordData';
import { allRaceSlugs, allSeasonYears } from '@/lib/seasonData';
import { SITE_URL } from '@/lib/siteConfig';
import { allTeamIds } from '@/lib/teamData';

// Every page worth finding, listed for search engines. Built with the site, from the database.
export const dynamic = 'force-static';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const at = (path: string, priority: number, changeFrequency: 'daily' | 'weekly' | 'monthly' | 'yearly') => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  });
  const out: MetadataRoute.Sitemap = [
    at('/', 1, 'daily'),
    at('/drivers', 0.9, 'weekly'),
    at('/teams', 0.9, 'weekly'),
    at('/circuits', 0.9, 'monthly'),
    at('/seasons', 0.9, 'weekly'),
    at('/compare', 0.6, 'monthly'),
    at('/records', 0.8, 'weekly'),
    at('/about', 0.3, 'yearly'),
    at('/credits', 0.3, 'yearly'),
    at('/privacy', 0.3, 'yearly'),
    at('/contact', 0.3, 'yearly'),
  ];
  (await allDriverIds()).forEach((id) => out.push(at(`/drivers/${id}`, 0.7, 'weekly')));
  (await allTeamIds()).forEach((id) => out.push(at(`/teams/${id}`, 0.7, 'weekly')));
  (await allCircuitIds()).forEach((id) => out.push(at(`/circuits/${id}`, 0.7, 'monthly')));
  (await allSeasonYears()).forEach((y) => out.push(at(`/seasons/${y}`, 0.7, 'weekly')));
  (await allRaceSlugs()).forEach((s) => out.push(at(`/races/${s}`, 0.6, 'monthly')));
  allRecordKeys().forEach((k) => out.push(at(`/records/${k}`, 0.6, 'weekly')));
  return out;
}
