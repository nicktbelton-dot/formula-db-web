import type { Metadata } from 'next';
import Link from 'next/link';
import { loadSeasonList } from '@/lib/seasonData';

export const metadata: Metadata = {
  title: 'Formula One seasons since 1950 · Formula DB',
  description: 'Every Formula One season since 1950: the champions, the number of races, and results race by race.',
};

export default async function Seasons() {
  const rows = await loadSeasonList();
  return (
    <div>
      <p className="crumb">Seasons</p>
      <h1 style={{ fontSize: 'clamp(34px, 5vw, 46px)', fontWeight: 800 }}>Seasons</h1>
      <p className="muted" style={{ margin: '4px 0 22px' }}>{rows.length} seasons, newest first. Choose one for its races, winners and standings.</p>

      <div className="only-wide">
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Season</th><th>Drivers&apos; champion</th><th>Constructors&apos; champion</th><th className="r">Races</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.year}>
                  <td className="num"><Link className="link" href={`/seasons/${r.year}`}>{r.year}</Link></td>
                  <td className="nm">{r.champ_id ? <Link href={`/drivers/${r.champ_id}`}>{r.champion}</Link> : <span className="muted">In progress</span>}</td>
                  <td>{r.team_champion ?? <span className="muted">{r.year < 1958 ? 'Not awarded' : 'In progress'}</span>}</td>
                  <td className="r num">{r.races}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="only-phone">
        <div className="stack">
          {rows.map((r) => (
            <Link key={r.year} href={`/seasons/${r.year}`} className="item">
              <span className="acc num" style={{ width: 44 }}>{r.year}</span>
              <div>
                <b>{r.champion ?? 'In progress'}</b>
                <div className="sub">{r.team_champion ?? (r.year < 1958 ? 'No constructors\u2019 title' : '')} · {r.races} races</div>
              </div>
              <span className="go end">›</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
