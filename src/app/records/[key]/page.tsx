import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from '@/components/AppLink';
import { allRecordKeys, loadRecord } from '@/lib/recordData';

// One page per record, with its top ten built ahead of time from the database.
export const dynamicParams = false;

export async function generateStaticParams() {
  return allRecordKeys().map((key) => ({ key }));
}

type Props = { params: Promise<{ key: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { key } = await params;
  const data = await loadRecord(key);
  if (!data) return { title: 'Record not found · Formula DB' };
  const first = data.rows[0];
  return {
    title: `${data.title} · Formula DB`,
    description: `${data.blurb}${first ? ` The record: ${first.title}${first.right ? `, ${first.right}` : ''}.` : ''}`,
  };
}

export default async function RecordPage({ params }: Props) {
  const { key } = await params;
  const data = await loadRecord(key);
  if (!data) notFound();

  return (
    <div style={{ maxWidth: 860 }}>
      <p className="crumb"><Link href="/records">Records</Link> › {data.group}</p>
      <h1 style={{ fontSize: 'clamp(32px, 5vw, 46px)', fontWeight: 800 }}>{data.title}</h1>
      <p className="muted" style={{ margin: '6px 0 14px', fontSize: 16 }}>{data.blurb}</p>
      {data.note ? <p className="empty" style={{ marginBottom: 18 }}>{data.note}</p> : null}
      {data.rows.length === 0 ? <p className="empty">No results for this record yet.</p> : null}

      <ol className="stack" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {data.rows.map((r, i) => {
          const tag = r.tag ?? (data.latestYear !== null && r.year === data.latestYear ? 'This season' : undefined);
          const inner = (
            <>
              <span className="cond" style={{ fontSize: 26, fontWeight: 700, width: 34, color: 'var(--accent)' }}>{i + 1}</span>
              <div>
                <b>{r.title}</b>
                {r.sub ? <div className="sub">{r.sub}</div> : null}
                {tag ? <span className="rec-tag">{tag}</span> : null}
              </div>
              {r.right ? <span className="end">{r.right}</span> : null}
              {r.href ? <span className="go">›</span> : null}
            </>
          );
          return (
            <li key={i}>
              {r.href ? <Link href={r.href} className="item">{inner}</Link> : <div className="item">{inner}</div>}
            </li>
          );
        })}
      </ol>

      <div className="between" style={{ marginTop: 28, flexWrap: 'wrap' }}>
        {data.prev ? <Link className="btn" href={`/records/${data.prev.key}`}>‹ {data.prev.title}</Link> : <span />}
        {data.next ? <Link className="btn" href={`/records/${data.next.key}`}>{data.next.title} ›</Link> : <span />}
      </div>
    </div>
  );
}
