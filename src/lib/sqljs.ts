import initSqlJs from 'sql.js';

// Opens the Formula DB database in the browser (sql.js is SQLite compiled to WebAssembly) and offers the same
// two calls the phone app uses, so the question engine, records and queries run here unchanged.
export type Db = {
  getAllAsync<T = Record<string, unknown>>(sql: string, params?: (string | number | null)[]): Promise<T[]>;
  getFirstAsync<T = Record<string, unknown>>(sql: string, params?: (string | number | null)[]): Promise<T | null>;
};

let opening: Promise<Db> | null = null;

export function openDb(): Promise<Db> {
  if (!opening) {
    opening = (async () => {
      const SQL = await initSqlJs({ locateFile: (file: string) => `/${file}` });
      const response = await fetch('/f1.db');
      if (!response.ok) throw new Error(`Could not load the database (${response.status})`);
      const raw = new SQL.Database(new Uint8Array(await response.arrayBuffer()));

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
    })();
  }
  return opening;
}
