'use client';

import Link from 'next/link';
import { useState } from 'react';
import TrackCard from '@/components/TrackCard';
import type { RacePageData } from '@/lib/seasonData';
import { fmtNum, formatDuration, longDate } from '@/lib/format';

export default function RaceView({ data }: { data: RacePageData }) {
  const [tab, setTab] = useState<'results' | 'qualifying'>('results');
  const d = data;
  const place = [d.circuit, d.locality, d.country].filter(Boolean);

  return (
    <div>
      <p className="crumb"><Link href="/seasons">Seasons</Link> › <Link href={`/seasons/${d.year}`}>{d.year}</Link> › {d.name}</p>

      <div style={{ margin: '6px 0 22px' }}>
        <h1 className="hero-name" style={{ fontSize: 'clamp(34px, 5vw, 52px)' }}>{d.year} {d.name}</h1>
        <p className="muted" style={{ marginTop: 6 }}>{[longDate(d.race_date), place.join(', ')].filter(Boolean).join(' · ')}</p>
        <div className="chips" style={{ marginTop: 12 }}>
          <span className="tag">Round {d.round} of {d.season_races}</span>
          {d.year === 1950 && d.round === 1 ? <span className="tag">First race of the world championship</span> : null}
        </div>
      </div>

      <section className="g3">
        <div className="panel">
          <span className="lbl">Winner</span>
          {d.winner ? (
            <>
              <p className="cond" style={{ fontSize: 30, fontWeight: 700, marginTop: 6 }}><Link href={`/drivers/${d.winner.driver_id}`}>{d.winner.name}</Link></p>
              <p className="sub">{d.winner.team}</p>
            </>
          ) : (
            <p className="sub" style={{ marginTop: 6 }}>{d.results.length === 0 ? 'Not run yet.' : 'No winner recorded.'}</p>
          )}
        </div>
        <div className="panel">
          <span className="lbl">Pole position</span>
          {d.pole ? (
            <>
              <p className="cond" style={{ fontSize: 30, fontWeight: 700, marginTop: 6 }}><Link href={`/drivers/${d.pole.driver_id}`}>{d.pole.name}</Link></p>
              <p className="sub">{d.pole.team}</p>
            </>
          ) : (
            <p className="sub" style={{ marginTop: 6 }}>Not recorded.</p>
          )}
        </div>
        <div className="grad">
          <span className="lbl" style={{ color: '#FFD6DE' }}>Circuit</span>
          <p className="cond" style={{ fontSize: 30, fontWeight: 700, marginTop: 6 }}>{d.circuit_id ? <Link href={`/circuits/${d.circuit_id}`}>{d.circuit ?? 'Unknown'}</Link> : d.circuit ?? 'Unknown'}</p>
          <p className="sub">{[d.locality, d.country].filter(Boolean).join(', ')}</p>
        </div>
      </section>

      <section className="split" style={{ gridTemplateColumns: d.layouts.length > 0 ? 'minmax(0, 1fr) 340px' : 'minmax(0, 1fr)', marginTop: 32 }}>
      <div>
      <div className="between" style={{ margin: '0 0 14px', flexWrap: 'wrap' }}>
        {d.quali.length > 0 ? (
          <div className="seg full" role="group" aria-label="Race views">
            <button className={tab === 'results' ? 'on' : ''} onClick={() => setTab('results')}>Results</button>
            <button className={tab === 'qualifying' ? 'on' : ''} onClick={() => setTab('qualifying')}>Qualifying</button>
          </div>
        ) : (
          <h2 style={{ fontSize: 26 }}>Results</h2>
        )}
      </div>

      <div hidden={tab !== 'results'}>
        {d.results.length === 0 ? (
          <p className="empty">This race has not been run yet.</p>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr><th>Pos</th><th>Driver</th><th>Team</th><th className="r">Grid</th><th className="r">Laps</th><th>Time or reason</th><th className="r">Points</th></tr>
              </thead>
              <tbody>
                {d.results.map((r, i) => {
                  const numeric = r.position_text !== null && /^[0-9]+$/.test(r.position_text);
                  const result = i === 0 && r.race_time_ms ? formatDuration(r.race_time_ms) : r.status && r.status !== 'Finished' ? r.status : '';
                  return (
                    <tr key={r.result_id} className={numeric && Number(r.position_text) <= 3 ? 'pod' : ''}>
                      <td className="pos" style={{ opacity: numeric ? 1 : 0.55 }}>{r.position_text ?? '–'}</td>
                      <td className="nm"><Link href={`/drivers/${r.driver_id}`}>{r.driver}</Link></td>
                      <td><Link href={`/teams/${r.team_id}`}>{r.team}</Link></td>
                      <td className="r num">{r.grid ? r.grid : r.grid === 0 ? 'Pit' : '–'}</td>
                      <td className="r num">{r.laps ?? '–'}</td>
                      <td>{result}{r.fastest_lap_rank === 1 ? <span className="tag" style={{ marginLeft: result ? 8 : 0 }}>Fastest lap</span> : null}</td>
                      <td className="r num">{r.points ? fmtNum(r.points) : '–'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div hidden={tab !== 'qualifying'}>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Pos</th><th>Driver</th><th>Team</th><th>Q1</th><th>Q2</th><th>Q3</th></tr></thead>
            <tbody>
              {d.quali.map((q) => (
                <tr key={q.qualifying_id}>
                  <td className="pos">{q.position ?? '–'}</td>
                  <td className="nm"><Link href={`/drivers/${q.driver_id}`}>{q.driver}</Link></td>
                  <td><Link href={`/teams/${q.team_id}`}>{q.team}</Link></td>
                  <td className="num">{q.q1_time ?? ''}</td>
                  <td className="num">{q.q2_time ?? ''}</td>
                  <td className="num">{q.q3_time ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      </div>
      {d.layouts.length > 0 ? (
        <aside className="col">
          <TrackCard layouts={d.layouts} initial={d.layout_index} year={d.year} />
          {d.circuit_id ? <Link className="link" href={`/circuits/${d.circuit_id}`}>All races and layouts at {d.circuit} ›</Link> : null}
        </aside>
      ) : null}
      </section>

      <div className="between" style={{ marginTop: 28, flexWrap: 'wrap' }}>
        {d.prev ? <Link className="btn" href={`/races/${d.prev.slug}`}>‹ {d.prev.name}</Link> : <span />}
        {d.next ? <Link className="btn" href={`/races/${d.next.slug}`}>{d.next.name} ›</Link> : <span />}
      </div>
    </div>
  );
}
