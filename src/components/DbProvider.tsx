'use client';

import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Db, openDb } from '@/lib/sqljs';

// Opens the database once, in the browser, and shares it with every page.
type State = { db: Db | null; error: string | null };
const DbContext = createContext<State>({ db: null, error: null });

export function DbProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ db: null, error: null });

  useEffect(() => {
    openDb()
      .then((db) => setState({ db, error: null }))
      .catch((e: Error) => setState({ db: null, error: e.message }));
  }, []);

  return <DbContext.Provider value={state}>{children}</DbContext.Provider>;
}

export const useDbState = () => useContext(DbContext);
