import Link from '@/components/AppLink';
import { ordinalGrid, StartStats } from '@/lib/startStats';

// Where the winners at a circuit started from: how often pole won, how often the second row, the furthest back anyone won.
export default function StartPanel({ starts, furthestSlug, circuitName }: { starts: StartStats; furthestSlug: string | null; circuitName: string }) {
  const max = Math.max(...starts.bins.map((b) => b.n), 1);
  const pct = (n: number) => Math.round((n / starts.counted) * 100);
  const ask = `/ask?q=${encodeURIComponent(`When did someone last win from outside the top ten at ${circuitName}?`)}`;
  return (
    <section className="cmp-card" style={{ padding: 22 }}>
      <h2 style={{ fontSize: 24 }}>Where winners started here</h2>
      {starts.poleRaces > 0 ? (
        <p className="muted" style={{ marginTop: 6 }}>
          The pole sitter won <b style={{ color: 'var(--text)' }}>{starts.poleWon} of {starts.poleRaces}</b> races ({Math.round((starts.poleWon / starts.poleRaces) * 100)}%).
        </p>
      ) : null}
      <div className="start-bars" role="list" aria-label="Winners by starting position">
        {starts.bins.map((b) => (
          <div key={b.label} className="start-row" role="listitem">
            <span className="start-label">{b.label}</span>
            <span className="start-bar" aria-hidden="true"><i style={{ width: `${Math.max((b.n / max) * 100, b.n > 0 ? 2 : 0)}%` }} /></span>
            <span className="start-n num">{b.n}<span className="muted"> · {pct(b.n)}%</span></span>
          </div>
        ))}
      </div>
      {starts.furthest ? (
        <p style={{ marginTop: 12 }}>
          Furthest back a winner started: <b>{ordinalGrid(starts.furthest.grid)}</b>, {starts.furthest.driver} in{' '}
          {furthestSlug ? <Link className="link" href={`/races/${furthestSlug}`}>{starts.furthest.year}</Link> : starts.furthest.year}.
        </p>
      ) : null}
      <p className="muted" style={{ marginTop: 10, fontSize: 12 }}>
        From {starts.counted} wins with a recorded starting slot. Grid positions include penalties; pit-lane starts are not counted.{' '}
        <Link className="link" href={ask}>Ask a precedent question about {circuitName} ›</Link>
      </p>
    </section>
  );
}
