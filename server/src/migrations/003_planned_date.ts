import type Database from 'better-sqlite3';

export const version = 3;
export const description = 'Add planned_date column to todos';

export function up(db: Database.Database): void {
  db.exec(`
    ALTER TABLE todos ADD COLUMN planned_date TEXT;
  `);
}
