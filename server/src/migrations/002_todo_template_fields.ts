export const version = 2;
export const description = 'Add todo fields (priority, due_date, is_risk, is_focus, deleted_at) and templates table';

export function up(db: any): void {
  db.exec(`
    ALTER TABLE todos ADD COLUMN priority TEXT DEFAULT '中';
    ALTER TABLE todos ADD COLUMN due_date TEXT;
    ALTER TABLE todos ADD COLUMN is_risk INTEGER DEFAULT 0;
    ALTER TABLE todos ADD COLUMN is_focus INTEGER DEFAULT 0;
    ALTER TABLE todos ADD COLUMN deleted_at TEXT;

    CREATE TABLE IF NOT EXISTS templates (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      content    TEXT NOT NULL,
      is_default INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    INSERT INTO templates (name, content, is_default) VALUES (
      '默认模板',
      '## 本周完成工作\n{{completed}}\n\n## 后续待办\n{{pending}}\n\n## 风险\n{{risks}}\n\n## 重点关注\n{{focus}}\n\n## 本周总结\n{{ai_summary}}',
      1
    );
  `);
}
