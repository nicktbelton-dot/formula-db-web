'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { SeasonPageData } from '@/lib/seasonData';
import { fmtNum, shortDate } from '@/lib/format';

type Tab = 'races' | 'drivers' | 'teams';

export default function SeasonView({ data }: { data: SeasonPageData }) {
  const [tab, setTab] = useState<Tab>('races');
  const { year, champion, team_champion, leader, races, drivers, teams, prev, next } = data;
  const done = races.filter((r) => r.has_results).length;
  const tabs: { key: Tab; label: string }[] = [
    { key: 'races', label: 'Races' },
    { key: 'drivers', label: 'Drivers' },
    { key: 'teams', label: 'Teams' },
  ];

  return (
    <div>
      <p className="crumb"><Link href="/seasons">Seasons</Link> › {year}</p>
      <div className="between" style={{ margin: '6px 0 22px', flexWrap: 'wrap' }}>
        <div>
          <h1 className="hero-name" style={{ fontSize: 'clamp(38px, 6vw, 56px)' }}>{year} season</h1>
          <p className="muted" style={{ marginTop: 6 }}>
            {races.length} {races.length === 1 ? 'race' : 'races'}{done < races.length ? ` · ${done} run so far` : ''}
          </p>
        </div>
        <div className="row">
          {prev ? <Link className="btn" href={`/seasons/${prev}`}>‹ {prev}</Link> : null}
          {next ? <Link className="btn" href={`/seasons/${next}`}>{next} ›</Link> : null}
        </div>
      </div>

      <section className="g2">
        <div className="grad">
          <span className="lbl" style={{ color: '#FFD6DE' }}>{champion ? "Drivers' champion" : 'Championship in progress'}</span>
          {champion ? (
            <>
              <p className="cond" style={{ fontSize: 38, fontWeight: 700, marginTop: 6 }}><Link href={`/drivers/${champion.driver_id}`}>{champion.name}</Link></p>
              <p className="sub" style={{ fontSize: 16 }}>{[champion.team, champion.points !== null ? `${fmtNum(champion.points)} points` : null].filter(Boolean).join(' · ')}</p>
            </>
          ) : leader ? (
            <>
              <p className="cond" style={{ fontSize: 38, fontWeight: 700, marginTop: 6 }}><Link href={`/drivers/${leader.driver_id}`}>{leader.name}</Link></p>
              <p className="sub" style={{ fontSize: 16 }}>Leads with {fmtNum(leader.points)} points</p>
            </>
          ) : (
            <p className="sub" style={{ marginTop: 6 }}>No standings yet.</p>
          )}
        </div>
        <div className="grad">
          <span className="lbl" style={{ color: '#FFD6DE' }}>{team_champion ? "Constructors' champion" : 'Constructors'}</span>
          {team_champion ? (
            <>
              <p className="cond" style={{ fontSize: 38, fontWeight: 700, marginTop: 6 }}>{team_champion.name}</p>
              <p className="sub" style={{ fontSize: 16 }}>{team_champion.points !== null ? `${fmtNum(team_champion.points)} points` : ''}</p>
            </>
          ) : (
            <p className="sub" style={{ marginTop: 6 }}>{year < 1958 ? 'The constructors\u2019 championship began in 1958.' : 'Not decided yet.'}</p>
          )}
        </div>
      </section>

      <section className="split" style={{ gridTemplateColumns: 'minmax(0, 1fr) 340px', marginTop: 32 }}>
        <div>
          <div className="between" style={{ marginBottom: 14, flexWrap: 'wrap' }}>
            <div className="seg full" role="group" aria-label="Season views">
              {tabs.map((t) => (
                <button key={t.key} className={tab === t.key ? 'on' : ''} onClick={() => setTab(t.key)}>{t.label}</button>
              ))}
            </div>
          </div>

          <div hidden={tab !== 'races'}>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead><tr><th className="r">R</th><th>Grand Prix</th><th>Date</th><th>Winner</th><th>Team</th></tr></thead>
                <tbody>
                  {races.map((r) => (
                    <tr key={r.race_id}>
                      <td className="r num muted">{r.round}</td>
                      <td>{r.has_results ? <Link className="link" href={`/races/${r.slug}`}>{r.name}</Link> : <span className="nm">{r.name}</span>}</td>
                      <td className="num muted">{shortDate(r.race_date)}</td>
                      <td className="nm">{r.winner_id ? <Link href={`/drivers/${r.winner_id}`}>{r.winner}</Link> : '–'}</td>
                      <td>{r.winner_team_id ? <Link href={`/teams/${r.winner_team_id}`}>{r.winner_team}</Link> : r.winner_team ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div hidden={tab !== 'drivers'}>
            <p className="muted" style={{ marginBottom: 12, fontSize: 13 }}>
              Drivers&apos; championship. Points are the official totals, which can differ from the sum of race points in eras when only a driver&apos;s best results counted.
            </p>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead><tr><th className="r">Pos</th><th>Driver</th><th>Team</th><th className="r">Wins</th><th className="r">Points</th></tr></thead>
                <tbody>
                  {drivers.map((d) => (
                    <tr key={d.driver_id}>
                      <td className="r num muted">{d.pos ?? '–'}</td>
                      <td className="nm"><Link href={`/drivers/${d.driver_id}`}>{d.name}</Link></td>
                      <td>{d.teams}</td>
                      <td className="r num">{d.wins}</td>
                      <td className="r num nm">{fmtNum(d.points)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div hidden={tab !== 'teams'}>
            {teams.length === 0 ? (
              <p className="empty">There was no constructors&apos; championship in {year}.</p>
            ) : (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead><tr><th className="r">Pos</th><th>Team</th><th className="r">Wins</th><th className="r">Points</th></tr></thead>
                  <tbody>
                    {teams.map((t) => (
                      <tr key={t.team_id}>
                        <td className="r num muted">{t.pos ?? '–'}</td>
                        <td className="nm"><Link href={`/teams/${t.team_id}`}>{t.name}</Link></td>
                        <td className="r num">{t.wins}</td>
                        <td className="r num nm">{fmtNum(t.points)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <aside className="col">
          <div className="panel" style={{ padding: 18 }}>
            <span className="lbl">Drivers&apos; standings</span>
            <div className="stack" style={{ marginTop: 10, gap: 4 }}>
              {drivers.slice(0, 3).map((d) => (
                <div key={d.driver_id} className="item" style={{ background: 'transparent', padding: '8px 0' }}>
                  <span className="cond" style={{ fontSize: 22, fontWeight: 700, width: 28, color: 'var(--accent)' }}>{d.pos ?? '–'}</span>
                  <b><Link href={`/drivers/${d.driver_id}`}>{d.name}</Link></b>
                  <span className="end num">{fmtNum(d.points)}</span>
                </div>
              ))}
            </div>
            <button className="link" style={{ all: 'unset', cursor: 'pointer', color: 'var(--accent)', fontWeight: 600, marginTop: 8, display: 'inline-block' }} onClick={() => setTab('drivers')}>Full standings ›</button>
          </div>
          {teams.length > 0 ? (
            <div className="panel" style={{ padding: 18 }}>
              <span className="lbl">Constructors&apos; standings</span>
              <div className="stack" style={{ marginTop: 10, gap: 4 }}>
                {teams.slice(0, 3).map((t) => (
                  <div key={t.team_id} className="item" style={{ background: 'transparent', padding: '8px 0' }}>
                    <span className="cond" style={{ fontSize: 22, fontWeight: 700, width: 28, color: 'var(--accent)' }}>{t.pos ?? '–'}</span>
                    <b><Link href={`/teams/${t.team_id}`}>{t.name}</Link></b>
                    <span className="end num">{fmtNum(t.points)}</span>
                  </div>
                ))}
              </div>
              <button className="link" style={{ all: 'unset', cursor: 'pointer', color: 'var(--accent)', fontWeight: 600, marginTop: 8, display: 'inline-block' }} onClick={() => setTab('teams')}>Full standings ›</button>
            </div>
          ) : null}
        </aside>
      </section>
    </div>
  );
}
