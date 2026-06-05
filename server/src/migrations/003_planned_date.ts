export const version = 3;
export const description = 'Add planned_date column to todos';

export function up(db: any): void {
  db.exec(`
    ALTER TABLE todos ADD COLUMN planned_date TEXT;
  `);
}
