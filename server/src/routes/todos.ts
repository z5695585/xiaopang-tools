import { Router, Request, Response } from 'express';
import type { ApiResponse, Todo, CreateTodoInput, UpdateTodoInput, ReorderInput } from '@shared/types';
import { getDb } from '../db';

const router = Router();

function attachTodoRelations(db: any, todos: Todo[]): Todo[] {
  for (const todo of todos) {
    todo.tags = db.prepare(`
      SELECT tg.* FROM tags tg JOIN todo_tags tt ON tg.id = tt.tag_id WHERE tt.todo_id = ?
    `).all(todo.id) as any;
    todo.children = db.prepare(
      'SELECT * FROM todos WHERE parent_id = ? AND deleted_at IS NULL ORDER BY sort_order'
    ).all(todo.id) as any;
    for (const child of todo.children || []) {
      child.tags = db.prepare(`
        SELECT tg.* FROM tags tg JOIN todo_tags tt ON tg.id = tt.tag_id WHERE tt.todo_id = ?
      `).all(child.id) as any;
    }
  }
  return todos;
}

// GET /api/todos/archive/months — completed todo archive month counts
router.get('/archive/months', (req: Request, res: Response<ApiResponse<{ month: string; count: number }[]>>) => {
  const db = getDb();
  const { tag_id, search } = req.query;
  const where = ['t.deleted_at IS NULL', 't.parent_id IS NULL', 't.completed = 1', 't.completed_at IS NOT NULL'];
  const params: any[] = [];

  if (tag_id) {
    where.push('EXISTS (SELECT 1 FROM todo_tags tt WHERE tt.todo_id = t.id AND tt.tag_id = ?)');
    params.push(Number(tag_id));
  }
  if (search) {
    where.push('t.title LIKE ?');
    params.push(`%${String(search)}%`);
  }

  const rows = db.prepare(`
    SELECT substr(t.completed_at, 1, 7) AS month, COUNT(*) AS count
    FROM todos t
    WHERE ${where.join(' AND ')}
    GROUP BY substr(t.completed_at, 1, 7)
    ORDER BY month DESC
  `).all(...params) as { month: string; count: number }[];

  res.json({ success: true, data: rows });
});

// GET /api/todos — query todos
router.get('/', (req: Request, res: Response<ApiResponse<Todo[]>>) => {
  const db = getDb();
  const { status = 'all', tag_id, from, to, search, page = '1', page_size } = req.query;

  const where = ['t.deleted_at IS NULL', 't.parent_id IS NULL'];
  const params: any[] = [];

  if (status === 'active') where.push('t.completed = 0');
  else if (status === 'completed') where.push('t.completed = 1');

  if (tag_id) {
    where.push('EXISTS (SELECT 1 FROM todo_tags tt WHERE tt.todo_id = t.id AND tt.tag_id = ?)');
    params.push(Number(tag_id));
  }
  if (from && to) {
    const dateColumn = status === 'completed' ? 't.completed_at' : 't.due_date';
    where.push(`${dateColumn} >= ? AND ${dateColumn} <= ?`);
    params.push(`${from}`, status === 'completed' ? `${to} 23:59:59` : `${to}`);
  }
  if (search) {
    where.push('t.title LIKE ?');
    params.push(`%${String(search)}%`);
  }

  const orderBy = status === 'completed'
    ? 'ORDER BY t.completed_at DESC, t.id DESC'
    : 'ORDER BY t.due_date IS NULL, t.due_date ASC, t.sort_order ASC, t.created_at DESC';

  let limitSql = '';
  if (page_size) {
    const size = Math.min(Math.max(Number(page_size) || 50, 1), 200);
    const pageNumber = Math.max(Number(page) || 1, 1);
    limitSql = ' LIMIT ? OFFSET ?';
    params.push(size, (pageNumber - 1) * size);
  }

  const todos = db.prepare(`
    SELECT t.* FROM todos t
    WHERE ${where.join(' AND ')}
    ${orderBy}
    ${limitSql}
  `).all(...params) as Todo[];

  res.json({ success: true, data: attachTodoRelations(db, todos) });
});

// POST /api/todos — create todo
router.post('/', (req: Request, res: Response<ApiResponse<Todo>>) => {
  const { parent_id, title, description, priority, due_date, planned_date, tag_ids } = req.body as CreateTodoInput;
  if (!title?.trim()) {
    res.status(400).json({ success: false, error: '标题不能为空' });
    return;
  }
  const db = getDb();
  const parentId = parent_id || null;
  const parentTodo = parentId
    ? db.prepare('SELECT * FROM todos WHERE id = ? AND deleted_at IS NULL').get(parentId) as Todo | undefined
    : undefined;
  const inheritedTagIds = parentId
    ? db.prepare('SELECT tag_id FROM todo_tags WHERE todo_id = ?').all(parentId).map((row: any) => row.tag_id)
    : [];
  const finalDueDate = due_date || parentTodo?.due_date || null;
  const finalTagIds = tag_ids?.length ? tag_ids : inheritedTagIds;

  if (!finalDueDate) {
    res.status(400).json({ success: false, error: '截止日期不能为空' });
    return;
  }
  if (!finalTagIds.length) {
    res.status(400).json({ success: false, error: '至少选择一个标签' });
    return;
  }
  const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 as next FROM todos WHERE parent_id IS ?')
    .get(parentId) as any;

  const result = db.prepare(`
    INSERT INTO todos (parent_id, title, description, priority, due_date, planned_date, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(parentId, title.trim(), description || '', priority || '中', finalDueDate, planned_date || finalDueDate, maxOrder.next);

  const insert = db.prepare('INSERT INTO todo_tags (todo_id, tag_id) VALUES (?, ?)');
  for (const tagId of finalTagIds) {
    insert.run(result.lastInsertRowid, tagId);
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
  if (input.planned_date !== undefined) { sets.push('planned_date = ?'); params.push(input.planned_date); }
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

  // 级联完成/取消完成子任务
  if (input.completed !== undefined) {
    db.prepare(`
      UPDATE todos SET completed = ?,
        completed_at = CASE WHEN ? = 1 THEN datetime('now') ELSE NULL END,
        updated_at = datetime('now')
      WHERE parent_id = ? AND deleted_at IS NULL
    `).run(input.completed, input.completed, Number(req.params.id));
  }

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
