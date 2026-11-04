'use client';

import { useState } from 'react';
import { Layout, layoutLabel } from '@/lib/layouts';

// The circuit's track drawn on a dark card. With several layouts, year chips switch between them;
// given a year (on a race page) it shows the layout used in that season.
export default function TrackCard({ layouts, initial, year, title }: { layouts: Layout[]; initial: number; year?: number; title?: string }) {
  const [index, setIndex] = useState(Math.min(Math.max(initial, 0), Math.max(layouts.length - 1, 0)));
  if (layouts.length === 0) return null;
  const current = layouts[Math.min(index, layouts.length - 1)];
  const caption = [
    current.years_text ? `Used ${current.years_text}` : null,
    current.length_km ? `${current.length_km.toFixed(3)} km` : null,
    current.turns ? `${current.turns} turns` : null,
  ].filter(Boolean).join(' · ');

  return (
    <div className="panel" style={{ padding: 20 }}>
      <div className="between"><h2 style={{ fontSize: 24, color: '#fff' }}>{title ?? (year !== undefined ? `Track layout in ${year}` : 'Track layout')}</h2>
        {layouts.length > 1 && year === undefined ? <span className="sub">{layouts.length} layouts since {layouts[0].first_year ?? ''}</span> : null}
      </div>
      {layouts.length > 1 && year === undefined ? (
        <div className="chips layout-chips" role="group" aria-label="Layouts by years used">
          {layouts.map((l, i) => (
            <button key={l.layout_id} className={`chip${i === index ? ' on-accent' : ''}`} aria-pressed={i === index} onClick={() => setIndex(i)}>{layoutLabel(l)}</button>
          ))}
        </div>
      ) : null}
      <div className="track-box">
        <svg viewBox="0 0 500 500" role="img" aria-label={`Drawing of the track layout${current.years_text ? `, used ${current.years_text}` : ''}`}>
          {current.paths.map((p, i) => (
            <path key={i} d={p.d} fill="none" stroke="#FFFFFF" strokeWidth={Math.max(5, p.w * 0.55)} strokeLinejoin="round" strokeLinecap="round" />
          ))}
        </svg>
      </div>
      <p className="sub" style={{ textAlign: 'center', marginTop: 6 }}>{caption}</p>
      <p className="sub" style={{ textAlign: 'center', marginTop: 2, fontSize: 12 }}>Layout drawings: F1DB, CC BY 4.0</p>
    </div>
  );
}
