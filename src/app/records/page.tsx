import type { Metadata } from 'next';
import Link from '@/components/AppLink';
import { GROUPS, RECORDS } from '@/core/records';

export const metadata: Metadata = {
  title: 'Formula One records and trivia · Formula DB',
  description: 'Youngest winners, longest winning streaks, closest finishes, most wins in a season and more: the Formula One records, each with its top ten.',
};

export default function Records() {
  return (
    <div>
      <p className="crumb">Records</p>
      <h1 style={{ fontSize: 'clamp(34px, 5vw, 46px)', fontWeight: 800 }}>Records and trivia</h1>
      <p className="muted" style={{ margin: '4px 0 8px' }}>{RECORDS.length} records, each with its top ten, worked out from the results.</p>
      {GROUPS.map((group) => {
        const list = RECORDS.filter((r) => r.group === group);
        if (list.length === 0) return null;
        return (
          <section key={group}>
            <h2 className="h-sec">{group}</h2>
            <div className="g2">
              {list.map((r) => (
                <Link key={r.key} href={`/records/${r.key}`} className="item" style={{ alignItems: 'flex-start' }}>
                  <div>
                    <b>{r.title}</b>
                    <div className="sub">{r.blurb}</div>
                  </div>
                  <span className="go end">›</span>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
