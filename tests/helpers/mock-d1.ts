import { DatabaseSync } from 'node:sqlite';

/**
 * Creates an in-memory D1Database mock using Node.js built-in DatabaseSync (node:sqlite)
 * Full compatibility with Cloudflare D1 and Drizzle ORM d1 driver.
 */
export function createMockD1(db: DatabaseSync): D1Database {
  return {
    prepare(query: string) {
      let boundParams: any[] = [];
      const stmtObj = {
        bind(...params: any[]) {
          boundParams = params.map(p => {
            if (typeof p === 'boolean') return p ? 1 : 0;
            if (p === undefined) return null;
            return p;
          });
          return stmtObj;
        },
        async all() {
          const stmt = db.prepare(query);
          const results = stmt.all(...boundParams);
          return {
            results,
            success: true,
            meta: { duration: 0, rows_read: results.length, rows_written: 0 },
          };
        },
        async run() {
          const stmt = db.prepare(query);
          const info = stmt.run(...boundParams);
          return {
            success: true,
            meta: {
              changes: info.changes,
              last_row_id: Number(info.lastInsertRowid),
              duration: 0,
            },
          };
        },
        async first(col?: string) {
          const stmt = db.prepare(query);
          const row = stmt.get(...boundParams) as any;
          if (!row) return null;
          return col ? row[col] : row;
        },
        async raw() {
          const stmt = db.prepare(query);
          const rows = stmt.all(...boundParams) as any[];
          return rows.map(r => Object.values(r));
        },
      };
      return stmtObj as any;
    },
    async batch(statements: any[]) {
      const results = [];
      for (const s of statements) {
        if (typeof s.run === 'function') {
          results.push(await s.run());
        } else if (typeof s.all === 'function') {
          results.push(await s.all());
        }
      }
      return results as any;
    },
    async exec(query: string) {
      db.exec(query);
      return { count: 1, duration: 0 };
    },
    dump() {
      throw new Error('dump not implemented');
    },
  } as any;
}

