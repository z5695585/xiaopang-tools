import { Router, Request, Response } from 'express';
import type { ApiResponse, Template } from '@shared/types';
import { getDb } from '../db';

const router = Router();

// GET /api/templates
router.get('/', (_req: Request, res: Response<ApiResponse<Template[]>>) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM templates ORDER BY is_default DESC, id').all() as Template[];
  res.json({ success: true, data: rows });
});

// POST /api/templates
router.post('/', (req: Request, res: Response<ApiResponse<Template>>) => {
  const { name, content } = req.body;
  if (!name?.trim() || !content?.trim()) {
    res.status(400).json({ success: false, error: '名称和内容不能为空' });
    return;
  }
  const db = getDb();
  const result = db.prepare('INSERT INTO templates (name, content) VALUES (?, ?)').run(name.trim(), content.trim());
  const tpl = db.prepare('SELECT * FROM templates WHERE id = ?').get(result.lastInsertRowid) as Template;
  res.status(201).json({ success: true, data: tpl });
});

// PUT /api/templates/:id
router.put('/:id', (req: Request, res: Response<ApiResponse<Template>>) => {
  const { name, content } = req.body;
  const db = getDb();
  const existing = db.prepare('SELECT * FROM templates WHERE id = ?').get(Number(req.params.id));
  if (!existing) {
    res.status(404).json({ success: false, error: '模板不存在' });
    return;
  }
  db.prepare("UPDATE templates SET name = COALESCE(?, name), content = COALESCE(?, content), updated_at = datetime('now') WHERE id = ?")
    .run(name?.trim() || null, content?.trim() || null, Number(req.params.id));
  const tpl = db.prepare('SELECT * FROM templates WHERE id = ?').get(Number(req.params.id)) as Template;
  res.json({ success: true, data: tpl });
});

// DELETE /api/templates/:id
router.delete('/:id', (req: Request, res: Response<ApiResponse<never>>) => {
  const id = Number(req.params.id);
  const db = getDb();
  const tpl = db.prepare('SELECT * FROM templates WHERE id = ?').get(id) as Template;
  if (!tpl) {
    res.status(404).json({ success: false, error: '模板不存在' });
    return;
  }
  if (tpl.is_default) {
    res.status(400).json({ success: false, error: '默认模板不可删除' });
    return;
  }
  db.prepare('DELETE FROM templates WHERE id = ?').run(id);
  res.json({ success: true });
});

export default router;
