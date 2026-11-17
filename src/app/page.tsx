import { urlId } from '@/lib/ids';
import Link from '@/components/AppLink';
import { raceSlug } from '@/lib/slug';
import RaceWeather from '@/components/RaceWeather';
import TitleRace from '@/components/TitleRace';
import HomeFavourites from '@/components/HomeFavourites';
import { loadHomeData } from '@/lib/homeData';
import { RECORDS } from '@/core/records';

const EXAMPLES = [
  'Which car won the 1988 championship?',
  'How many wins does Hamilton have?',
  'Which team has the most titles?',
  'Who won the 2009 championship?',
];

const longDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

// Home is built ahead of time from the database (see lib/homeData.ts), so it paints real content immediately
// instead of waiting for the whole database to download in the visitor's browser. Only Favourites (which depends
// on this browser's saved list) and the race-weekend forecast (a live fetch) still run on the client.
export default async function Home() {
  const { counts, champ, title, next, latest, recent, top, fact } = await loadHomeData();
  const dash = '…';

  return (
    <div>
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginTop: 32 }}>
        <div className="grad" style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 12, minHeight: 280, gridColumn: 'span 1' }}>
          <span className="lbl" style={{ color: '#FFD6DE' }}>{champ ? (title && champ.year < title.year ? `Reigning World Champion · ${champ.year}` : `${champ.year} World Champion`) : 'World Champion'}</span>
          <h1 className="hero-name" style={{ fontSize: 'clamp(38px, 6vw, 64px)' }}>{champ ? <Link href={`/drivers/${urlId(champ.id)}`}>{champ.name}</Link> : dash}</h1>
          <p className="sub" style={{ fontSize: 17, maxWidth: '46ch' }}>
            {champ ? `${champ.team ?? 'Champion'}. ${title && champ.year === title.year && champ.left && champ.left > 0 ? `Clinched the drivers' title with ${champ.left} ${champ.left === 1 ? 'race' : 'races'} still to run.` : ''}` : ''}
          </p>
          {champ ? (
            <div className="row champ-stats" style={{ marginTop: 'auto', paddingTop: 12, gap: 28 }}>
              {[['Wins', champ.wins], ['Podiums', champ.podiums], ['Poles', champ.poles]].map(([lab, n]) => (
                <div key={lab as string}>
                  <b className="num" style={{ display: 'block', fontSize: 30, fontWeight: 700, color: '#fff' }}>{n}</b>
                  <span style={{ fontSize: 12, color: '#F3DDE6' }}>{lab} in {champ.year}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <div className="col">
          <div className="panel" style={{ flex: 1 }}>
            <span className="lbl">Next race</span>
            <h2 style={{ fontSize: 30, marginTop: 8 }}>{next ? next.name : 'No race scheduled'}</h2>
            <p className="sub" style={{ marginTop: 6 }}>{next ? `${longDate(next.race_date)}${next.circuit ? ` · ${next.circuit}` : ''}` : 'The season is over, or the calendar is not out yet.'}</p>
            {next && next.lat != null && next.lon != null ? <RaceWeather lat={next.lat} lon={next.lon} raceDate={next.race_date} /> : null}
          </div>
          <div className="panel" style={{ flex: 1 }}>
            <span className="lbl">Latest result</span>
            <h2 style={{ fontSize: 30, marginTop: 8 }}>{latest ? <Link href={`/races/${raceSlug(latest.season_year, latest.name)}`}>{latest.name}</Link> : dash}</h2>
            <p className="sub" style={{ marginTop: 6 }}>{latest ? longDate(latest.race_date) : ''}</p>
            {latest ? <Link className="link" href={`/races/${raceSlug(latest.season_year, latest.name)}`} style={{ color: 'var(--accent)', display: 'inline-block', marginTop: 12 }}>Results and qualifying ›</Link> : null}
          </div>
        </div>
      </section>

      {title ? <TitleRace info={title} /> : null}

      <section className="g4" style={{ marginTop: 20 }}>
        <Link href="/drivers" className="tile"><b className="num">{counts ? counts.drivers : dash}</b><span>Drivers, 1950 to today</span></Link>
        <Link href="/teams" className="tile"><b className="num">{counts ? counts.teams : dash}</b><span>Teams, with lineages joined</span></Link>
        <Link href="/circuits" className="tile"><b className="num">{counts ? counts.circuits : dash}</b><span>Circuits, with track layouts</span></Link>
        <Link href="/seasons" className="tile"><b className="num">{counts ? counts.seasons : dash}</b><span>Seasons, 1950 to now</span></Link>
      </section>

      <section style={{ marginTop: 40, border: '1px solid var(--border)', borderRadius: 16, padding: 28, background: 'var(--tint)' }}>
        <h2 style={{ fontSize: 28 }}>Ask a question</h2>
        <p className="muted" style={{ marginTop: 4 }}>Answers come from the checked data, with the reading of your question shown beneath.</p>
        <div className="chips" style={{ marginTop: 16 }}>
          {EXAMPLES.map((q) => (
            <Link key={q} className="chip" href={`/ask?q=${encodeURIComponent(q)}`}>{q}</Link>
          ))}
        </div>
      </section>

      <section className="g2" style={{ gap: 28, alignItems: 'start' }}>
        <div>
          <h2 className="h-sec">Did you know?</h2>
          <div className="grad">
            {fact ? (
              <>
                <span className="lbl" style={{ color: '#FFD6DE' }}>{fact.label}</span>
                <p className="cond" style={{ fontSize: 34, fontWeight: 700, marginTop: 6 }}>{fact.title}</p>
                {fact.right ? <p className="sub" style={{ fontSize: 16 }}>{fact.right}</p> : null}
                <Link href={`/records/${fact.key}`} style={{ color: '#fff', fontWeight: 600, display: 'inline-block', marginTop: 14 }}>Open the record ›</Link>
              </>
            ) : (
              <p className="sub">Not available right now.</p>
            )}
          </div>

          <h2 className="h-sec">Records and trivia</h2>
          <div className="stack">
            {RECORDS.slice(0, 4).map((r) => (
              <Link key={r.key} href={`/records/${r.key}`} className="item"><b>{r.title}</b><span className="go end">›</span></Link>
            ))}
            <Link className="link" href="/records" style={{ padding: '6px 2px' }}>All records and trivia ›</Link>
          </div>
        </div>

        <div>
          <h2 className="h-sec">Recent world champions</h2>
          <div className="stack">
            {recent.map((r) => (
              <Link key={r.year} href={`/seasons/${r.year}`} className="item"><span className="acc num" style={{ width: 44 }}>{r.year}</span><b>{r.name}</b><span className="go end">›</span></Link>
            ))}
          </div>

          <h2 className="h-sec">Most wins</h2>
          <div className="stack">
            {top.map((p) => (
              <Link key={p.driver_id} href={`/drivers/${urlId(p.driver_id)}`} className="item"><b>{p.name}</b><span className="end num">{p.wins}</span></Link>
            ))}
          </div>
        </div>
      </section>

      <HomeFavourites />
    </div>
  );
}
