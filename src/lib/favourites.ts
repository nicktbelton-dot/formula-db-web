import { useCallback, useEffect, useState } from 'react';

// Favourites live in this browser only (local storage). Keys look like "driver:hamilton".
const KEY = 'fdb:favourites';

function read(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function useFavourites() {
  const [favs, setFavs] = useState<Set<string>>(new Set());

  useEffect(() => {
    setFavs(new Set(read()));
    const onStorage = () => setFavs(new Set(read()));
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const toggle = useCallback((key: string) => {
    const next = new Set(read());
    if (next.has(key)) next.delete(key);
    else next.add(key);
    try {
      localStorage.setItem(KEY, JSON.stringify([...next]));
    } catch {
      /* private browsing: the heart simply will not stick */
    }
    setFavs(next);
  }, []);

  return { favs, toggle };
}
