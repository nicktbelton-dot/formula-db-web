import { urlId } from '@/lib/ids';
import { commonName, EXTRA_SEARCH } from '@/core/circuitNames';
import { GROUPS, RECORDS } from '@/core/records';
import { raceSlugById } from '@/lib/seasonData';
import { getServerDb } from '@/lib/serverDb';

// One small file listing everything a visitor might search for, built with the site: drivers, teams, circuits, seasons,
// races, records and the main pages. The search box loads it the first time it is used.
export const dynamic = 'force-static';

// [type, address, title, second line, extra words to match, popularity]
type Row = [string, string, string, string, string, number];

const years = (a: number | null, b: number | null) => (a === null ? '' : a === b ? String(a) : `${a}–${b}`);

export async function GET() {
  const db = await getServerDb();
  const out: Row[] = [];

  const drivers = await db.getAllAsync<{ id: string; name: string; nat: string | null; a: number | null; b: number | null; wins: number; starts: number }>(
    `SELECT driver_id AS id, given_name || ' ' || family_name AS name, nationality AS nat, first_season AS a, last_season AS b,
            career_wins AS wins, career_starts AS starts FROM driver`
  );
  drivers.forEach((d) => out.push(['d', `/drivers/${urlId(d.id)}`, d.name, [d.nat, years(d.a, d.b), d.wins ? `${d.wins} wins` : ''].filter(Boolean).join(' · '), d.nat ?? '', d.wins * 1000 + d.starts]));

  const teams = await db.getAllAsync<{ id: string; name: string; nat: string | null; a: number | null; b: number | null; wins: number; starts: number; lineage: string | null }>(
    `SELECT t.team_id AS id, t.name AS name, t.nationality AS nat, t.first_season AS a, t.last_season AS b, t.total_wins AS wins,
            t.total_starts AS starts, ti.display_name AS lineage
     FROM team t LEFT JOIN team_identity ti ON ti.team_identity_id = t.team_identity_id`
  );
  teams.forEach((t) => out.push(['t', `/teams/${urlId(t.id)}`, t.name, [t.nat, years(t.a, t.b), t.wins ? `${t.wins} wins` : ''].filter(Boolean).join(' · '), `${t.lineage ?? ''} ${t.nat ?? ''}`, t.wins * 1000 + t.starts]));

  const circuits = await db.getAllAsync<{ id: string; name: string; locality: string | null; country: string | null; races: number }>(
    `SELECT circuit_id AS id, name, locality, country, total_races AS races FROM circuit`
  );
  circuits.forEach((c) => {
    const short = commonName(c.id, c.name);
    out.push(['c', `/circuits/${urlId(c.id)}`, short, [c.locality, c.country].filter(Boolean).join(', '), `${c.name} ${c.locality ?? ''} ${c.country ?? ''} ${EXTRA_SEARCH[c.id] ?? ''}`, c.races]);
  });

  const seasons = await db.getAllAsync<{ year: number; champ: string | null; team: string | null }>(
    `SELECT s.year AS year, d.given_name || ' ' || d.family_name AS champ, t.name AS team
     FROM season s LEFT JOIN driver d ON d.driver_id = s.driver_champion_id LEFT JOIN team t ON t.team_id = s.team_champion_id`
  );
  seasons.forEach((s) => out.push(['s', `/seasons/${s.year}`, `${s.year} season`, s.champ ? `Champion: ${s.champ}` : 'In progress', `${s.champ ?? ''} ${s.team ?? ''} championship`, 0]));

  const slugs = await raceSlugById();
  const races = await db.getAllAsync<{ id: number; year: number; name: string; circuit: string | null; locality: string | null; winner: string | null }>(
    `SELECT ra.race_id AS id, ra.season_year AS year, ra.name AS name, ci.name AS circuit, ci.locality AS locality,
            d.given_name || ' ' || d.family_name AS winner
     FROM race ra LEFT JOIN circuit ci ON ci.circuit_id = ra.circuit_id LEFT JOIN driver d ON d.driver_id = ra.winner_driver_id`
  );
  races.forEach((r) => {
    const slug = slugs.get(r.id);
    if (slug) out.push(['r', `/races/${slug}`, `${r.year} ${r.name}`, r.winner ? `Won by ${r.winner}` : 'Not run yet', `${r.circuit ?? ''} ${r.locality ?? ''} ${r.winner ?? ''}`, 0]);
  });

  RECORDS.forEach((r) => out.push(['k', `/records/${r.key}`, r.title, r.blurb, GROUPS.includes(r.group) ? r.group : '', 0]));

  const pages: [string, string, string][] = [
    ['/drivers', 'Drivers', 'Every driver since 1950'],
    ['/teams', 'Teams', 'Every team, with lineages joined'],
    ['/circuits', 'Circuits', 'The globe and the list'],
    ['/seasons', 'Seasons', 'Every season since 1950'],
    ['/compare', 'Compare drivers', 'Two drivers side by side'],
    ['/records', 'Records and trivia', 'Top tens of every record'],
    ['/ask', 'Ask a question', 'Plain-English questions about the data'],
    ['/favourites', 'My favourites', 'Your saved drivers, teams and circuits'],
    ['/about', 'About Formula DB', 'What this is and how the numbers are checked'],
    ['/credits', 'Credits and sources', 'Where the data and photos come from'],
    ['/privacy', 'Privacy', 'What stays in your browser'],
    ['/contact', 'Contact us', 'Report a mistake or send a question'],
  ];
  pages.forEach(([h, n, s]) => out.push(['p', h, n, s, '', 0]));

  return Response.json(out);
}
