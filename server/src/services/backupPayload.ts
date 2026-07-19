import { getDb } from '../db';

export interface BackupPayload {
  version: 1;
  exported_at: string;
  data: {
    tags: any[];
    todos: any[];
    todo_tags: any[];
  };
}

function rows(table: string): any[] {
  return getDb().prepare(`SELECT * FROM ${table}`).all() as any[];
}

// 供手动导出接口和 GitHub 每日备份服务共用，避免 routes/backup.ts 与 services/githubBackup.ts 互相 import 造成循环依赖
export function buildBackupPayload(): BackupPayload {
  return {
    version: 1,
    exported_at: new Date().toISOString(),
    data: {
      tags: rows('tags'),
      todos: rows('todos'),
      todo_tags: rows('todo_tags'),
    },
  };
}
