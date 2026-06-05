export const version = 1;
export const description = 'Initial schema: todos, tags, todo_tags, migrations';

export function up(db: any): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS todos (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id    INTEGER REFERENCES todos(id),
      title        TEXT NOT NULL,
      description  TEXT DEFAULT '',
      completed    INTEGER DEFAULT 0,
      completed_at TEXT,
      sort_order   INTEGER DEFAULT 0,
      created_at   TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tags (
      id    INTEGER PRIMARY KEY AUTOINCREMENT,
      name  TEXT NOT NULL UNIQUE,
      color TEXT DEFAULT '#3b82f6'
    );

    CREATE TABLE IF NOT EXISTS todo_tags (
      todo_id INTEGER REFERENCES todos(id) ON DELETE CASCADE,
      tag_id  INTEGER REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (todo_id, tag_id)
    );

    CREATE TABLE IF NOT EXISTS migrations (
      version     INTEGER PRIMARY KEY,
      description TEXT,
      applied_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}
