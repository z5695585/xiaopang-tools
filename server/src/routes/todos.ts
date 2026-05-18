import { Router, Request, Response } from 'express';
import type { ApiResponse, Todo, CreateTodoInput, UpdateTodoInput, ReorderInput } from '@shared/types';
import { getDb } from '../db';

const router = Router();

// GET /api/todos — query todos
router.get('/', (req: Request, res: Response<ApiResponse<Todo[]>>) => {
  const db = getDb();
  const { status = 'all', tag_id } = req.query;

  let where = 'WHERE t.deleted_at IS NULL AND t.parent_id IS NULL';
  const params: any[] = [];

  if (status === 'active') where += ' AND t.completed = 0';
  else if (status === 'completed') where += ' AND t.completed = 1';

  const todos = db.prepare(`SELECT t.* FROM todos t ${where} ORDER BY t.sort_order, t.created_at DESC`).all(...params) as Todo[];

  for (const todo of todos) {
    todo.tags = db.prepare(`
      SELECT tg.* FROM tags tg JOIN todo_tags tt ON tg.id = tt.tag_id WHERE tt.todo_id = ?
    `).all(todo.id) as any;
    todo.children = db.prepare(
      'SELECT * FROM todos WHERE parent_id = ? AND deleted_at IS NULL ORDER BY sort_order'
    ).all(todo.id) as any;
  }

  if (tag_id) {
    const filtered = todos.filter(t => t.tags?.some(tg => tg.id === Number(tag_id)));
    res.json({ success: true, data: filtered });
    return;
  }

  res.json({ success: true, data: todos });
});

// POST /api/todos — create todo
router.post('/', (req: Request, res: Response<ApiResponse<Todo>>) => {
  const { parent_id, title, description, priority, due_date, tag_ids } = req.body as CreateTodoInput;
  if (!title?.trim()) {
    res.status(400).json({ success: false, error: '标题不能为空' });
    return;
  }
  const db = getDb();
  const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 as next FROM todos WHERE parent_id IS ?')
    .get(parent_id || null) as any;

  const result = db.prepare(`
    INSERT INTO todos (parent_id, title, description, priority, due_date, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(parent_id || null, title.trim(), description || '', priority || '中', due_date || null, maxOrder.next);

  if (tag_ids?.length) {
    const insert = db.prepare('INSERT INTO todo_tags (todo_id, tag_id) VALUES (?, ?)');
    for (const tagId of tag_ids) {
      insert.run(result.lastInsertRowid, tagId);
    }
  }

  const todo = db.prepare('SELECT * FROM todos WHERE id = ?').get(result.lastInsertRowid) as Todo;
  res.status(201).json({ success: true, data: todo });
});

// PUT /api/todos/reorder — batch reorder (must be before /:id)
router.put('/reorder', (req: Request, res: Response<ApiResponse<never>>) => {
  const { items } = req.body as ReorderInput;
  if (!items?.length) {
    res.status(400).json({ success: false, error: 'items 不能为空' });
    return;
  }
  const db = getDb();
  const update = db.prepare('UPDATE todos SET sort_order = ?, updated_at = datetime(\'now\') WHERE id = ?');
  const runAll = db.transaction(() => {
    for (const item of items) {
      update.run(item.sort_order, item.id);
    }
  });
  runAll();
  res.json({ success: true });
});

// PUT /api/todos/:id — update todo
router.put('/:id', (req: Request, res: Response<ApiResponse<Todo>>) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM todos WHERE id = ? AND deleted_at IS NULL').get(Number(req.params.id));
  if (!existing) {
    res.status(404).json({ success: false, error: '待办不存在' });
    return;
  }

  const input = req.body as UpdateTodoInput;
  const sets: string[] = [];
  const params: any[] = [];

  if (input.title !== undefined) { sets.push('title = ?'); params.push(input.title.trim()); }
  if (input.description !== undefined) { sets.push('description = ?'); params.push(input.description); }
  if (input.priority !== undefined) { sets.push('priority = ?'); params.push(input.priority); }
  if (input.due_date !== undefined) { sets.push('due_date = ?'); params.push(input.due_date); }
  if (input.is_risk !== undefined) { sets.push('is_risk = ?'); params.push(input.is_risk); }
  if (input.is_focus !== undefined) { sets.push('is_focus = ?'); params.push(input.is_focus); }
  if (input.completed !== undefined) {
    sets.push('completed = ?'); params.push(input.completed);
    sets.push("completed_at = CASE WHEN ? = 1 THEN datetime('now') ELSE NULL END");
    params.push(input.completed);
  }
  sets.push("updated_at = datetime('now')");
  params.push(Number(req.params.id));

  db.prepare(`UPDATE todos SET ${sets.join(', ')} WHERE id = ?`).run(...params);

  if (input.tag_ids !== undefined) {
    db.prepare('DELETE FROM todo_tags WHERE todo_id = ?').run(Number(req.params.id));
    const insert = db.prepare('INSERT INTO todo_tags (todo_id, tag_id) VALUES (?, ?)');
    for (const tagId of input.tag_ids) {
      insert.run(Number(req.params.id), tagId);
    }
  }

  const todo = db.prepare('SELECT * FROM todos WHERE id = ?').get(Number(req.params.id)) as Todo;
  res.json({ success: true, data: todo });
});

// DELETE /api/todos/:id — soft delete
router.delete('/:id', (req: Request, res: Response<ApiResponse<never>>) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM todos WHERE id = ? AND deleted_at IS NULL').get(Number(req.params.id));
  if (!existing) {
    res.status(404).json({ success: false, error: '待办不存在' });
    return;
  }
  // cascade soft delete children
  db.prepare("UPDATE todos SET deleted_at = datetime('now') WHERE id = ? OR parent_id = ?")
    .run(Number(req.params.id), Number(req.params.id));
  res.json({ success: true });
});

export default router;
