'use client';

import { useEffect, useState } from 'react';
import { describe, Day, fetchForecast, forecastWindow } from '@/lib/weather';
import { longDate } from '@/lib/format';

// The forecast for a race weekend (Friday to Sunday), from Open-Meteo. Shown only for a race still to come.
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

const dayLabel = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

export default function RaceWeather({ lat, lon, raceDate, onDark = true }: { lat: number; lon: number; raceDate: string; onDark?: boolean }) {
  const [days, setDays] = useState<Day[] | null | undefined>(undefined);
  // computed after the page loads, so a built page never shows a stale "today"
  const [win, setWin] = useState<ReturnType<typeof forecastWindow> | null>(null);

  useEffect(() => {
    const w = forecastWindow(raceDate);
    setWin(w);
    if (w.state !== 'ready') return;
    let live = true;
    fetchForecast(lat, lon, w.from, w.to, store).then((d) => live && setDays(d));
    return () => {
      live = false;
    };
  }, [lat, lon, raceDate]);

  if (!win || win.state === 'past') return null;
  const cls = `wx${onDark ? '' : ' wx-light'}`;

  if (win.state === 'early') {
    return (
      <div className={cls}>
        <span className="wx-title">Race weekend forecast</span>
        <p className="wx-note">The forecast opens on {longDate(win.opens)}, when race day is within 16 days.</p>
        <p className="wx-credit">Weather: <a href="https://open-meteo.com/" rel="noopener">Open-Meteo.com</a></p>
      </div>
    );
  }
  if (days === undefined) {
    return (
      <div className={cls}>
        <span className="wx-title">Race weekend forecast</span>
        <p className="wx-note">Loading the forecast…</p>
      </div>
    );
  }
  if (days === null || days.length === 0) {
    return (
      <div className={cls}>
        <span className="wx-title">Race weekend forecast</span>
        <p className="wx-note">The forecast could not be loaded. It needs an internet connection.</p>
      </div>
    );
  }
  return (
    <div className={cls}>
      <span className="wx-title">Race weekend forecast</span>
      <div className="wx-days">
        {days.map((d) => {
          const w = describe(d.code);
          return (
            <div key={d.date} className={`wx-day${d.date === raceDate ? ' race' : ''}`}>
              <span className="wx-label">{d.date === raceDate ? 'Race day' : dayLabel(d.date)}</span>
              <span className="wx-icon" role="img" aria-label={w.text}>{w.icon}</span>
              <b className="num">{d.high}° <span className="wx-low">/ {d.low}°</span></b>
              <span className="wx-line">{w.text}</span>
              <span className="wx-line">{d.rainChance !== null ? `${d.rainChance}% rain` : `${d.rainMm} mm`} · {d.windKmh} km/h</span>
            </div>
          );
        })}
      </div>
      <p className="wx-credit">A forecast, not a promise. Day-level, for the circuit&apos;s location. Weather: <a href="https://open-meteo.com/" rel="noopener">Open-Meteo.com</a> (CC BY 4.0)</p>
    </div>
  );
}
