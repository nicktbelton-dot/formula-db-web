import fs from 'node:fs';
import path from 'node:path';
import initSqlJs from 'sql.js';
import { Db, wrap } from './sqljs';

// The database for pages built ahead of time: read from public/f1.db on disk, once per build.
let opening: Promise<Db> | null = null;

export function getServerDb(): Promise<Db> {
  if (!opening) {
    opening = (async () => {
      const SQL = await initSqlJs();
      const bytes = fs.readFileSync(path.join(process.cwd(), 'public', 'f1.db'));
      return wrap(new SQL.Database(new Uint8Array(bytes)));
    })();
  }
  return opening;
}
