'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from '@/components/AppLink';
import { useDbState } from '@/components/DbProvider';
import { buildStatQuery, STAT_LABELS } from '@/core/statQueries';
import type { StatKey } from '@/core/types';
import { slugify } from '@/lib/slug';

type Row = { kind: 'race' | 'season'; ref: number; year: number; ord: number; title: string; sub: string | null; right: string | null };
type Params = { entity: 'driver' | 'team'; id: string; stat: StatKey };

// The records behind a statistic tile. The address says which: /stats?entity=driver&id=hamilton&stat=wins
export default function StatListView() {
  const { db, error } = useDbState();
  const [params, setParams] = useState<Params | null | undefined>(undefined);
  const [name, setName] = useState('');
  const [rows, setRows] = useState<Row[] | null>(null);
  const [newestFirst, setNewestFirst] = useState(true);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const entity = q.get('entity');
    const id = q.get('id');
    const stat = q.get('stat') as StatKey | null;
    setParams((entity === 'driver' || entity === 'team') && id && stat ? { entity, id, stat } : null);
  }, []);

  useEffect(() => {
    if (!db || !params) return;
    const sql = buildStatQuery(params.entity, params.stat);
    if (!sql) {
      setRows([]);
      return;
    }
    db.getAllAsync<Row>(sql, [params.id]).then(setRows).catch((e) => {
      console.error(e);
      setRows([]);
    });
    const nameSql = params.entity === 'driver' ? `SELECT given_name || ' ' || family_name AS name FROM driver WHERE driver_id = ?` : `SELECT name FROM team WHERE team_id = ?`;
    db.getFirstAsync<{ name: string }>(nameSql, [params.id]).then((r) => setName(r?.name ?? params.id)).catch(() => setName(params.id));
  }, [db, params]);

  const sorted = useMemo(() => {
    if (!rows) return [];
    const dir = newestFirst ? -1 : 1;
    return [...rows].sort((a, b) => dir * (a.year - b.year || a.ord - b.ord));
  }, [rows, newestFirst]);

  if (params === undefined) return <p className="muted" style={{ marginTop: 24 }}>Loading…</p>;
  if (params === null) {
    return (
      <div className="prose">
        <p className="crumb">Records</p>
        <h1 style={{ fontSize: 40, fontWeight: 800 }}>Nothing to show</h1>
        <p style={{ marginTop: 12 }}>This page opens from a statistic tile on a driver or team page, for example the Wins tile.</p>
      </div>
    );
  }

  const back = params.entity === 'driver' ? { label: 'Drivers', href: '/drivers', page: `/drivers/${params.id}` } : { label: 'Teams', href: '/teams', page: `/teams/${params.id}` };
  const label = STAT_LABELS[params.stat] ?? params.stat;

  return (
    <div>
      <p className="crumb"><Link href={back.href}>{back.label}</Link> › <Link href={back.page}>{name || params.id}</Link> › {label}</p>
      <div className="between" style={{ margin: '6px 0 22px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 46px)', fontWeight: 800 }}>{name || '…'}</h1>
          <p className="muted" style={{ marginTop: 6 }}>
            {label}{rows ? ` · ${rows.length} ${rows.length === 1 ? 'record' : 'records'}` : ''}
          </p>
        </div>
        {rows && rows.length > 1 ? (
          <button className="btn" onClick={() => setNewestFirst(!newestFirst)}>{newestFirst ? 'Newest first' : 'Oldest first'} ⇅</button>
        ) : null}
      </div>
      {error ? <p className="empty">The data could not be loaded: {error}</p> : null}
      {!rows && !error ? <p className="muted">Loading…</p> : null}
      {rows && rows.length === 0 ? <p className="empty">No records yet.</p> : null}
      <div className="stack">
        {sorted.map((r, i) => (
          <Link key={`${r.kind}-${r.ref}-${i}`} className="item" href={r.kind === 'race' ? `/races/${slugify(r.title)}` : `/seasons/${r.ref}`}>
            <div>
              <b>{r.title}</b>
              {r.sub ? <div className="sub">{r.sub}</div> : null}
            </div>
            {r.right ? <span className="end">{r.right}</span> : null}
            <span className="go">›</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
