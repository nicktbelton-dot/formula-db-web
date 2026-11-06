'use client';

import { useEffect, useState } from 'react';
import Tile from '@/components/Tile';
import { fetchTypical, monthName, Typical } from '@/lib/weather';

// What the weather is usually like at this circuit in the month it races: ten years of daily records, averaged.
const store = {
  get: (k: string) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k: string, v: string) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* not remembered */
    }
  },
};

export default function TypicalWeather({ lat, lon, month }: { lat: number; lon: number; month: number }) {
  const [t, setT] = useState<Typical | null | undefined>(undefined);

  useEffect(() => {
    let live = true;
    fetchTypical(lat, lon, month, store).then((r) => live && setT(r));
    return () => {
      live = false;
    };
  }, [lat, lon, month]);

  return (
    <div className="cmp-card" style={{ padding: 20 }}>
      <span className="lbl" style={{ color: 'var(--link)' }}>Typical weather in {monthName(month)}</span>
      {t === undefined ? <p className="muted" style={{ marginTop: 8 }}>Loading…</p> : null}
      {t === null ? <p className="muted" style={{ marginTop: 8, fontSize: 14 }}>The weather records could not be loaded. They need an internet connection.</p> : null}
      {t ? (
        <>
          <div className="g2" style={{ marginTop: 12, gap: 10 }}>
            <Tile label="Typical high" value={`${t.avgHigh}°C`} />
            <Tile label="Typical low" value={`${t.avgLow}°C`} />
            <Tile label="Wet days" value={`${t.wetDays}`} />
            <Tile label="Rain, mm" value={`${t.rainMm}`} />
          </div>
          <p className="muted" style={{ marginTop: 10, fontSize: 12 }}>
            {monthName(month)} is when this circuit usually races. Averages of the last {t.years} years of records at this location; a wet day is 1 mm or more. A guide, not a forecast.
            {' '}Weather: <a className="link" href="https://open-meteo.com/" rel="noopener">Open-Meteo.com</a> (CC BY 4.0)
          </p>
        </>
      ) : null}
    </div>
  );
}
