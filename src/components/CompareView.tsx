'use client';

import { useEffect, useState } from 'react';
import Link from '@/components/AppLink';
import { useDbState } from '@/components/DbProvider';
import DriverPicker from '@/components/DriverPicker';
import LineChart from '@/components/LineChart';
import { CompareData, loadCompare, loadDrivers, loadSharedYears, PickerDriver } from '@/lib/compareData';

const fmtNum = (n: number) => (Number.isInteger(n) ? n.toLocaleString('en-GB') : n.toLocaleString('en-GB', { maximumFractionDigits: 1 }));
const fmtPos = (n: number | null) => (n === null ? '–' : `P${n.toFixed(1)}`);
const fmtRank = (n: number | null) => (n === null ? '–' : `P${n}`);
// for these rows a lower number is better
const better = (a: number | null, b: number | null): 'a' | 'b' | null => (a === null || b === null || a === b ? null : a < b ? 'a' : 'b');

function Bar({ label, va, vb }: { label: string; va: number; vb: number }) {
  const max = Math.max(va, vb, 0);
  const pct = (v: number) => (max > 0 ? Math.max((v / max) * 100, v > 0 ? 2 : 0) : 0);
  return (
    <div className="vs">
      <div className="a"><span className={`val num${va > vb ? ' best' : ''}`}>{fmtNum(va)}</span><div className="bar"><i style={{ width: `${pct(va)}%` }} /></div></div>
      <div className="lab">{label}</div>
      <div className="b"><span className={`val num${vb > va ? ' best' : ''}`}>{fmtNum(vb)}</span><div className="bar"><i style={{ width: `${pct(vb)}%` }} /></div></div>
    </div>
  );
}

export default function CompareView() {
  const { db, error } = useDbState();
  const [drivers, setDrivers] = useState<PickerDriver[]>([]);
  const [a, setA] = useState<PickerDriver | null>(null);
  const [b, setB] = useState<PickerDriver | null>(null);
  const [years, setYears] = useState<number[]>([]);
  const [year, setYear] = useState<number | null>(null);
  const [wantedYear, setWantedYear] = useState<number | null | undefined>(undefined);
  const [data, setData] = useState<CompareData | null>(null);
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);

  // the drivers, then any choice carried in the address (?a=hamilton&b=verstappen&year=2021)
  useEffect(() => {
    if (!db) return;
    loadDrivers(db).then((rows) => {
      setDrivers(rows);
      const q = new URLSearchParams(window.location.search);
      const find = (id: string | null) => rows.find((r) => r.driver_id === id) ?? null;
      setA(find(q.get('a')));
      setB(find(q.get('b')));
      const y = q.get('year');
      setWantedYear(y === 'career' ? null : y && /^\d{4}$/.test(y) ? Number(y) : undefined);
      setStarted(true);
    }).catch((e) => console.error(e));
  }, [db]);

  // seasons in which both raced; the most recent unless the address asked for another
  useEffect(() => {
    if (!db || !a || !b) {
      setYears([]);
      setYear(null);
      setData(null);
      return;
    }
    loadSharedYears(db, a.driver_id, b.driver_id).then((ys) => {
      setYears(ys);
      setYear(wantedYear === null ? null : wantedYear !== undefined && ys.includes(wantedYear) ? wantedYear : ys.length ? ys[0] : null);
      setWantedYear(undefined);
    }).catch((e) => console.error(e));
  }, [db, a, b]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!db || !a || !b) return;
    let cancelled = false;
    setLoading(true);
    loadCompare(db, a, b, year).then((d) => {
      if (!cancelled) {
        setData(d);
        setLoading(false);
      }
    }).catch((e) => {
      console.error(e);
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [db, a, b, year]);

  // keep the address in step so a comparison can be shared
  useEffect(() => {
    if (!started) return;
    const q = new URLSearchParams();
    if (a) q.set('a', a.driver_id);
    if (b) q.set('b', b.driver_id);
    if (a && b) q.set('year', year === null ? 'career' : String(year));
    const s = q.toString();
    window.history.replaceState(null, '', s ? `?${s}` : window.location.pathname);
  }, [a, b, year, started]);

  const pairs: [string, string, string, 'a' | 'b' | null][] = data
    ? [
        ...(year !== null ? ([['Championship', fmtRank(data.a.standing), fmtRank(data.b.standing), better(data.a.standing, data.b.standing)]] as [string, string, string, 'a' | 'b' | null][]) : []),
        ['Average finish', fmtPos(data.a.avgFinish), fmtPos(data.b.avgFinish), better(data.a.avgFinish, data.b.avgFinish)],
        ['Average qualifying', fmtPos(data.a.avgQuali), fmtPos(data.b.avgQuali), better(data.a.avgQuali, data.b.avgQuali)],
        ['Retirements', String(data.a.retirements), String(data.b.retirements), better(data.a.retirements, data.b.retirements)],
      ]
    : [];

  return (
    <div>
      <p className="crumb">Compare</p>
      <h1 style={{ fontSize: 'clamp(34px, 5vw, 46px)', fontWeight: 800, margin: '4px 0 6px' }}>Compare drivers</h1>
      <p className="muted">Pick two drivers to compare their career, or a single season they both raced.</p>
      {error ? <p className="empty" style={{ marginTop: 16 }}>The data could not be loaded: {error}</p> : null}

      <section className="g2" style={{ marginTop: 22, gap: 18 }}>
        <DriverPicker id="driver-a" label="Driver A" which="a" drivers={drivers} value={a} onSelect={setA} />
        <DriverPicker id="driver-b" label="Driver B" which="b" drivers={drivers} value={b} onSelect={setB} />
      </section>

      {!db && !error ? <p className="muted" style={{ marginTop: 20 }}>Opening the database…</p> : null}
      {db && (!a || !b) ? <p className="empty" style={{ marginTop: 22 }}>Choose two drivers to see their stats side by side, season by season or over a whole career.</p> : null}

      {a && b ? (
        <>
          <div style={{ marginTop: 22 }}>
            <span className="legend">Period</span>
            <div className="chips period" style={{ marginTop: 8 }} role="group" aria-label="Period">
              {[null, ...years].map((y) => (
                <button key={y === null ? 'career' : y} className={`chip${year === y ? ' on' : ''}`} aria-pressed={year === y} onClick={() => setYear(y)}>{y === null ? 'Career' : y}</button>
              ))}
            </div>
            {years.length === 0 ? <p className="muted" style={{ marginTop: 8, fontSize: 14 }}>These two drivers never raced in the same season, so only career totals are available.</p> : null}
          </div>

          {data ? (
            <div style={loading ? { opacity: 0.55 } : undefined}>
              <section className="g2 cmp-heads" style={{ marginTop: 22, gap: 16 }}>
                {([['a', a], ['b', b]] as const).map(([w, d]) => (
                  <div key={w} className="panel" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <span className={`cmp-dot ${w}`} aria-hidden="true" />
                    <div>
                      <span className="lbl">Driver {w.toUpperCase()}</span>
                      <p className="cond" style={{ fontSize: 28, fontWeight: 700 }}><Link href={`/drivers/${d.driver_id}`}>{d.name}</Link></p>
                    </div>
                  </div>
                ))}
              </section>

              <section className="cmp-card" style={{ marginTop: 20 }}>
                <h2 style={{ fontSize: 24, marginBottom: 6 }}>Totals{year !== null ? ` in ${year}` : ''}</h2>
                <Bar label="Races" va={data.a.races} vb={data.b.races} />
                <Bar label="Wins" va={data.a.wins} vb={data.b.wins} />
                <Bar label="Podiums" va={data.a.podiums} vb={data.b.podiums} />
                <Bar label="Poles" va={data.a.poles} vb={data.b.poles} />
                <Bar label="Points" va={data.a.points} vb={data.b.points} />
                <p className="muted" style={{ marginTop: 8, fontSize: 13 }}>Bars are scaled to the larger of the two totals in each row.</p>
              </section>

              <section className="g2" style={{ marginTop: 20, gap: 20, alignItems: 'start' }}>
                <div className="cmp-card">
                  <h2 style={{ fontSize: 24, marginBottom: 6 }}>Pace and results</h2>
                  {pairs.map(([label, va, vb, best]) => (
                    <div key={label} className="pair">
                      <span className="muted">{label}</span>
                      <span className={`pv a${best === 'a' ? ' best' : ''}`}>{va}</span>
                      <span className={`pv b${best === 'b' ? ' best' : ''}`}>{vb}</span>
                    </div>
                  ))}
                  <p className="muted" style={{ marginTop: 8, fontSize: 13 }}>Lower is better for these rows. The better value is in bold.</p>
                </div>
                <div className="cmp-card">
                  <h2 style={{ fontSize: 24, marginBottom: 6 }}>Head to head</h2>
                  <div className="h2h">
                    <span className="muted">Finished ahead</span>
                    <p className="score"><span className="a">{data.finish.aAhead}</span> – <span className="b">{data.finish.bAhead}</span></p>
                    <p className="muted" style={{ fontSize: 13 }}>{data.finish.classified} races where both were classified, out of {data.finish.shared} shared.</p>
                  </div>
                  <div className="h2h">
                    <span className="muted">Qualified ahead</span>
                    {data.quali.shared > 0 ? (
                      <>
                        <p className="score"><span className="a">{data.quali.aAhead}</span> – <span className="b">{data.quali.bAhead}</span></p>
                        <p className="muted" style={{ fontSize: 13 }}>{data.quali.shared} shared qualifying sessions (from 1994).</p>
                      </>
                    ) : (
                      <p className="muted" style={{ fontSize: 14 }}>No shared qualifying results. They are recorded from 1994.</p>
                    )}
                  </div>
                </div>
              </section>

              <section className="cmp-card" style={{ marginTop: 20 }}>
                <div className="between" style={{ flexWrap: 'wrap' }}>
                  <h2 style={{ fontSize: 24 }}>{data.chartTitle}</h2>
                  <div className="row" style={{ gap: 16, fontSize: 14 }}>
                    <span><span className="cmp-dot a small" aria-hidden="true" /> {a.name}</span>
                    <span><span className="cmp-dot b small" aria-hidden="true" /> {b.name}</span>
                  </div>
                </div>
                <LineChart series={data.series} xLabels={data.xLabels} label={`${data.chartTitle}: ${a.name} and ${b.name}`} />
                <p className="muted" style={{ marginTop: 8, fontSize: 13 }}>{data.chartNote}</p>
              </section>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
