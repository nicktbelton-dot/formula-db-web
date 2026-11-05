import type { Series } from '@/lib/compareData';

// A simple line chart for two drivers: points by season, or cumulative points through a season.
const W = 720;
const H = 300;
const PAD = { left: 48, right: 14, top: 14, bottom: 30 };

function niceMax(v: number): number {
  if (v <= 0) return 10;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / pow;
  const n = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return n * pow;
}

export default function LineChart({ series, xLabels, label }: { series: Series[]; xLabels: string[]; label: string }) {
  const values = series.flatMap((s) => s.values.filter((v): v is number => v !== null));
  if (xLabels.length === 0 || values.length === 0) return <p className="muted">Not enough data to draw a chart.</p>;
  const max = niceMax(Math.max(...values));
  const n = xLabels.length;
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v: number) => PAD.top + plotH - (v / max) * plotH;
  const ticks = [0, 1, 2, 3, 4].map((k) => (max / 4) * k);
  const step = Math.max(1, Math.ceil(n / 9));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="line-chart">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--divider)" />
          <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">{Number.isInteger(t) ? t : t.toFixed(1)}</text>
        </g>
      ))}
      {xLabels.map((l, i) =>
        i % step === 0 || i === n - 1 ? (
          <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--muted)">{l}</text>
        ) : null
      )}
      {series.map((s) => {
        const color = s.which === 'a' ? 'var(--cmp-a)' : 'var(--cmp-b)';
        let d = '';
        let pen = false; // a missing season breaks the line
        s.values.forEach((v, i) => {
          if (v === null) {
            pen = false;
            return;
          }
          d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)} `;
          pen = true;
        });
        return (
          <g key={s.which}>
            <path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            {n <= 40 ? s.values.map((v, i) => (v === null ? null : <circle key={i} cx={x(i)} cy={y(v)} r="3" fill={color} />)) : null}
          </g>
        );
      })}
    </svg>
  );
}
