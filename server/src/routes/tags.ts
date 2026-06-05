import { Router, Request, Response } from 'express';
import type { ApiResponse, Tag } from '@shared/types';
import { getDb } from '../db';

const router = Router();

// GET /api/tags — 标签列表（含使用计数）
router.get('/', (_req: Request, res: Response<ApiResponse<Tag[]>>) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT t.*, COUNT(td.id) as todo_count
    FROM tags t
    LEFT JOIN todo_tags tt ON t.id = tt.tag_id
    LEFT JOIN todos td ON td.id = tt.todo_id AND td.deleted_at IS NULL
    GROUP BY t.id
    ORDER BY t.id
  `).all() as Tag[];
  res.json({ success: true, data: rows });
});

// POST /api/tags — 创建标签
router.post('/', (req: Request, res: Response<ApiResponse<Tag>>) => {
  const { name, color } = req.body;
  if (!name?.trim()) {
    res.status(400).json({ success: false, error: '标签名称不能为空' });
    return;
  }
  const db = getDb();
  const result = db.prepare('INSERT INTO tags (name, color) VALUES (?, ?)').run(name.trim(), color || '#3b82f6');
  const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(result.lastInsertRowid) as Tag;
  res.status(201).json({ success: true, data: tag });
});

// PUT /api/tags/:id — 更新标签
router.put('/:id', (req: Request, res: Response<ApiResponse<Tag>>) => {
  const { name, color } = req.body;
  const db = getDb();
  const existing = db.prepare('SELECT * FROM tags WHERE id = ?').get(Number(req.params.id));
  if (!existing) {
    res.status(404).json({ success: false, error: '标签不存在' });
    return;
  }
  db.prepare('UPDATE tags SET name = COALESCE(?, name), color = COALESCE(?, color) WHERE id = ?')
    .run(name?.trim() || null, color || null, Number(req.params.id));
  const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(Number(req.params.id)) as Tag;
  res.json({ success: true, data: tag });
});

// DELETE /api/tags/:id — 删除标签
router.delete('/:id', (req: Request, res: Response<ApiResponse<never>>) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM tags WHERE id = ?').get(Number(req.params.id));
  if (!existing) {
    res.status(404).json({ success: false, error: '标签不存在' });
    return;
  }
  db.prepare('DELETE FROM tags WHERE id = ?').run(Number(req.params.id));
  res.json({ success: true });
});

export default router;
