import path from 'path';
import { DatabaseSync } from 'node:sqlite';

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'xiaopang.db');

let db: any;

function createNodeSqliteDb(): any {
  const sqlite = new DatabaseSync(DB_PATH);

  return Object.assign(sqlite, {
    pragma(statement: string) {
      sqlite.exec(`PRAGMA ${statement}`);
    },
    transaction<TArgs extends unknown[], TResult>(fn: (...args: TArgs) => TResult) {
      return (...args: TArgs): TResult => {
        sqlite.exec('BEGIN');
        try {
          const result = fn(...args);
          sqlite.exec('COMMIT');
          return result;
        } catch (err) {
          sqlite.exec('ROLLBACK');
          throw err;
        }
      };
    },
  });
}

export function getDb(): any {
  if (!db) {
    db = createNodeSqliteDb();
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}
