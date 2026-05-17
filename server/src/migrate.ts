import Database from 'better-sqlite3';
import * as m001 from './migrations/001_initial_schema';

interface Migration {
  version: number;
  description: string;
  up: (db: Database.Database) => void;
}

const migrations: Migration[] = [
  { version: m001.version, description: m001.description, up: m001.up },
].sort((a, b) => a.version - b.version);

export function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      version     INTEGER PRIMARY KEY,
      description TEXT,
      applied_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const applied = new Set(
    db.prepare('SELECT version FROM migrations').all()
      .map((row: any) => row.version)
  );

  for (const m of migrations) {
    if (applied.has(m.version)) continue;

    const run = db.transaction(() => {
      m.up(db);
      db.prepare('INSERT INTO migrations (version, description) VALUES (?, ?)')
        .run(m.version, m.description);
    });

    run();
  }
}
