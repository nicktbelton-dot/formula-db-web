// Weather from Open-Meteo.com (CC BY 4.0): the forecast for a race weekend, and what the weather is typically like at a
// circuit in the month it races. Plain TypeScript with no browser or phone specifics, so the website and the phone app
// share it. The only thing sent is the circuit's coordinates (plus the device's address, as with any web request).

export type Day = { date: string; code: number; high: number; low: number; rainChance: number | null; rainMm: number; windKmh: number };
export type Typical = { month: number; years: number; avgHigh: number; avgLow: number; wetDays: number; rainMm: number };
// somewhere to keep recent answers: the browser's local storage on the website, memory in the phone app
export type Store = { get(key: string): string | null; set(key: string, value: string): void };

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const monthName = (m: number): string => MONTHS[m - 1] ?? '';

const WMO: [number[], string, string][] = [
  [[0], 'Clear', '☀️'],
  [[1], 'Mostly clear', '🌤️'],
  [[2], 'Partly cloudy', '⛅'],
  [[3], 'Overcast', '☁️'],
  [[45, 48], 'Fog', '🌫️'],
  [[51, 53, 55, 56, 57], 'Drizzle', '🌦️'],
  [[61, 63], 'Rain', '🌧️'],
  [[65, 66, 67], 'Heavy rain', '🌧️'],
  [[71, 73, 75, 77, 85, 86], 'Snow', '❄️'],
  [[80, 81], 'Showers', '🌦️'],
  [[82], 'Heavy showers', '🌧️'],
  [[95, 96, 99], 'Thunderstorms', '⛈️'],
];
export function describe(code: number): { text: string; icon: string } {
  const hit = WMO.find(([codes]) => codes.includes(code));
  return hit ? { text: hit[1], icon: hit[2] } : { text: 'Unsettled', icon: '🌥️' };
}

const isoDate = (d: Date) => d.toISOString().slice(0, 10);
export const todayISO = () => isoDate(new Date());
export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return isoDate(d);
}

export const FORECAST_DAYS = 16; // how far ahead the free forecast reaches, counting today

// What can be shown for a race on this date: the forecast opens once race day is within the 16-day window.
export type Window = { state: 'past' } | { state: 'early'; opens: string } | { state: 'ready'; from: string; to: string };
export function forecastWindow(raceDate: string, today: string = todayISO()): Window {
  const last = addDays(today, FORECAST_DAYS - 1);
  const friday = addDays(raceDate, -2);
  if (raceDate < today) return { state: 'past' };
  if (friday > last) return { state: 'early', opens: addDays(raceDate, -(FORECAST_DAYS - 1)) };
  return { state: 'ready', from: friday < today ? today : friday, to: raceDate > last ? last : raceDate };
}

async function remembered<T>(store: Store | null, key: string, ttlMs: number, load: () => Promise<T | null>): Promise<T | null> {
  try {
    const raw = store?.get(key);
    if (raw) {
      const hit = JSON.parse(raw) as { at: number; value: T };
      if (Date.now() - hit.at < ttlMs) return hit.value;
    }
  } catch {
    /* a damaged entry is simply fetched again */
  }
  const value = await load();
  if (value !== null) {
    try {
      store?.set(key, JSON.stringify({ at: Date.now(), value }));
    } catch {
      /* storage full or unavailable: carry on without it */
    }
  }
  return value;
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export function fetchForecast(lat: number, lon: number, from: string, to: string, store: Store | null = null): Promise<Day[] | null> {
  const key = `fdb:wx:fc:${lat.toFixed(2)},${lon.toFixed(2)}:${from}:${to}`;
  return remembered<Day[]>(store, key, 3 * 3600 * 1000, async () => {
    try {
      const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&timezone=auto&start_date=${from}&end_date=${to}` +
        `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const j = await res.json();
      const d = j?.daily;
      if (!d?.time) return null;
      return (d.time as string[]).map((date, i) => ({
        date,
        code: d.weather_code[i],
        high: Math.round(d.temperature_2m_max[i]),
        low: Math.round(d.temperature_2m_min[i]),
        rainChance: d.precipitation_probability_max?.[i] ?? null,
        rainMm: round1(d.precipitation_sum?.[i] ?? 0),
        windKmh: Math.round(d.wind_speed_10m_max?.[i] ?? 0),
      }));
    } catch {
      return null;
    }
  });
}

// Typical weather: the last ten full years of daily records at this spot, averaged for one month.
export function fetchTypical(lat: number, lon: number, month: number, store: Store | null = null): Promise<Typical | null> {
  const lastYear = new Date().getUTCFullYear() - 1;
  const firstYear = lastYear - 9;
  const key = `fdb:wx:typ:${lat.toFixed(2)},${lon.toFixed(2)}:${month}:${lastYear}`;
  return remembered<Typical>(store, key, 30 * 24 * 3600 * 1000, async () => {
    try {
      const url =
        `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&timezone=auto` +
        `&start_date=${firstYear}-01-01&end_date=${lastYear}-12-31&daily=temperature_2m_max,temperature_2m_min,precipitation_sum`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const j = await res.json();
      const d = j?.daily;
      if (!d?.time) return null;
      const highs: number[] = [];
      const lows: number[] = [];
      const wetByYear = new Map<number, number>();
      const rainByYear = new Map<number, number>();
      (d.time as string[]).forEach((date, i) => {
        if (parseInt(date.slice(5, 7), 10) !== month) return;
        const hi = d.temperature_2m_max[i];
        const lo = d.temperature_2m_min[i];
        const mm = d.precipitation_sum[i];
        if (hi == null || lo == null) return;
        const year = parseInt(date.slice(0, 4), 10);
        highs.push(hi);
        lows.push(lo);
        rainByYear.set(year, (rainByYear.get(year) ?? 0) + (mm ?? 0));
        wetByYear.set(year, (wetByYear.get(year) ?? 0) + ((mm ?? 0) >= 1 ? 1 : 0));
      });
      if (highs.length === 0) return null;
      return {
        month,
        years: rainByYear.size,
        avgHigh: Math.round(avg(highs)),
        avgLow: Math.round(avg(lows)),
        wetDays: Math.round(avg([...wetByYear.values()])),
        rainMm: Math.round(avg([...rainByYear.values()])),
      };
    } catch {
      return null;
    }
  });
}
