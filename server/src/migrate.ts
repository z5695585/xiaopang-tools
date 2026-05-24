import Database from 'better-sqlite3';
import * as m001 from './migrations/001_initial_schema';
import * as m002 from './migrations/002_todo_template_fields';
import * as m003 from './migrations/003_planned_date';

interface Migration {
  version: number;
  description: string;
  up: (db: Database.Database) => void;
}

const migrations: Migration[] = [
  { version: m001.version, description: m001.description, up: m001.up },
  { version: m002.version, description: m002.description, up: m002.up },
  { version: m003.version, description: m003.description, up: m003.up },
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
