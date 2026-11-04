import initSqlJs from 'sql.js';

// Opens the Formula DB database (sql.js is SQLite compiled to WebAssembly) and offers the same two calls the
// phone app uses, so the question engine, records and queries run here unchanged. In the browser it loads
// /f1.db; at build time, lib/serverDb.ts wraps the same database read from disk.
export type Db = {
  getAllAsync<T = Record<string, unknown>>(sql: string, params?: (string | number | null)[]): Promise<T[]>;
  getFirstAsync<T = Record<string, unknown>>(sql: string, params?: (string | number | null)[]): Promise<T | null>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function wrap(raw: any): Db {
  const rows = <T,>(sql: string, params: (string | number | null)[] = []): T[] => {
    const statement = raw.prepare(sql);
    try {
      if (params.length > 0) statement.bind(params.map((p) => (p === undefined ? null : p)));
      const out: T[] = [];
      while (statement.step()) out.push(statement.getAsObject() as T);
      return out;
    } finally {
      statement.free();
    }
  };
  return {
    getAllAsync: async <T,>(sql: string, params?: (string | number | null)[]) => rows<T>(sql, params),
    getFirstAsync: async <T,>(sql: string, params?: (string | number | null)[]) => rows<T>(sql, params)[0] ?? null,
  };
}

let opening: Promise<Db> | null = null;

export function openDb(): Promise<Db> {
  if (!opening) {
    opening = (async () => {
      const SQL = await initSqlJs({ locateFile: (file: string) => `/${file}` });
      const response = await fetch('/f1.db');
      if (!response.ok) throw new Error(`Could not load the database (${response.status})`);
      return wrap(new SQL.Database(new Uint8Array(await response.arrayBuffer())));
    })();
  }
  return opening;
}
