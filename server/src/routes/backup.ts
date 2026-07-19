import { Router, Request, Response } from 'express';
import type { ApiResponse } from '@shared/types';
import { getDb } from '../db';

const router = Router();

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

// 供手动导出接口和 GitHub 每日备份服务共用
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

router.get('/export', (_req: Request, res: Response) => {
  const payload = buildBackupPayload();

  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="xiaopang-backup-${stamp}.json"`);
  res.send(JSON.stringify(payload, null, 2));
});

router.post('/import', (req: Request, res: Response<ApiResponse<{ imported: { tags: number; todos: number } }>>) => {
  const payload = req.body as BackupPayload;
  if (!payload || payload.version !== 1 || !payload.data) {
    res.status(400).json({ success: false, error: '备份文件格式不正确' });
    return;
  }

  const { tags, todos, todo_tags } = payload.data;
  if (!Array.isArray(tags) || !Array.isArray(todos) || !Array.isArray(todo_tags)) {
    res.status(400).json({ success: false, error: '备份数据不完整' });
    return;
  }

  const db = getDb();
  const runImport = db.transaction(() => {
    db.prepare('DELETE FROM todo_tags').run();
    db.prepare('DELETE FROM todos').run();
    db.prepare('DELETE FROM tags').run();

    const insertTag = db.prepare('INSERT INTO tags (id, name, color) VALUES (?, ?, ?)');
    for (const tag of tags) {
      insertTag.run(tag.id, tag.name, tag.color || '#3b82f6');
    }

    const insertTodo = db.prepare(`
      INSERT INTO todos (
        id, parent_id, title, description, completed, completed_at, sort_order,
        created_at, updated_at, priority, due_date, is_risk, is_focus, deleted_at, planned_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const todo of todos) {
      insertTodo.run(
        todo.id,
        todo.parent_id ?? null,
        todo.title,
        todo.description || '',
        todo.completed ?? 0,
        todo.completed_at ?? null,
        todo.sort_order ?? 0,
        todo.created_at || new Date().toISOString(),
        todo.updated_at || new Date().toISOString(),
        todo.priority || '中',
        todo.due_date ?? null,
        todo.is_risk ?? 0,
        todo.is_focus ?? 0,
        todo.deleted_at ?? null,
        todo.planned_date ?? null,
      );
    }

    const insertTodoTag = db.prepare('INSERT INTO todo_tags (todo_id, tag_id) VALUES (?, ?)');
    for (const item of todo_tags) {
      insertTodoTag.run(item.todo_id, item.tag_id);
    }
  });

  runImport();
  res.json({
    success: true,
    data: {
      imported: {
        tags: tags.length,
        todos: todos.length,
      },
    },
  });
});

export default router;
