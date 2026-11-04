// The shared core was written for the phone app, which uses expo-sqlite. On the web the same two calls are
// provided by the sql.js adapter, so only the shape of the database object is needed here.
declare module 'sql.js';

declare module 'expo-sqlite' {
  export interface SQLiteDatabase {
    getAllAsync<T = unknown>(sql: string, params?: (string | number | null)[]): Promise<T[]>;
    getFirstAsync<T = unknown>(sql: string, params?: (string | number | null)[]): Promise<T | null>;
  }
}

declare module 'd3-geo';
declare module 'topojson-client';
declare module 'world-atlas/land-110m.json';
