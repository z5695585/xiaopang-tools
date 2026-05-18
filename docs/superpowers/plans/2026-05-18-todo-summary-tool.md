# 待办 & 总结工具包 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现待办 & 总结工具包：待办 CRUD（含子待办）、标签管理、周/月视图、AI 总结生成、模板设置。

**Architecture:** 后端 REST API（Express 路由）+ 前端 React 组件（Context 状态管理 + useApi hook）。共享类型放 shared/types.ts，meta 常量就近放注册入口。

**Tech Stack:** React 18 + TypeScript + Tailwind + shadcn/ui, Express + better-sqlite3, OpenAI-compatible AI API

---

### Task 1: 数据库迁移 — 二期字段与模板表

**Files:**
- Create: `server/src/migrations/002_todo_template_fields.ts`
- Modify: `server/src/migrate.ts`

- [ ] **Step 1: 创建迁移文件 `server/src/migrations/002_todo_template_fields.ts`**

```typescript
import Database from 'better-sqlite3';

export const version = 2;
export const description = 'Add todo fields (priority, due_date, is_risk, is_focus, deleted_at) and templates table';

export function up(db: Database.Database): void {
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
```

- [ ] **Step 2: 更新 `server/src/migrate.ts`，注册新迁移**

```typescript
import Database from 'better-sqlite3';
import * as m001 from './migrations/001_initial_schema';
import * as m002 from './migrations/002_todo_template_fields';

interface Migration {
  version: number;
  description: string;
  up: (db: Database.Database) => void;
}

const migrations: Migration[] = [
  { version: m001.version, description: m001.description, up: m001.up },
  { version: m002.version, description: m002.description, up: m002.up },
].sort((a, b) => a.version - b.version);

// ... runMigrations 函数保持不变
```

- [ ] **Step 3: Commit**

```bash
cd /c/Users/56955/Desktop/XiaoPang_Tools
git add server/src/migrations/002_todo_template_fields.ts server/src/migrate.ts
git commit -m "feat: add todo fields and templates migration"
```

---

### Task 2: 共享类型扩展

**Files:**
- Modify: `shared/types.ts`

- [ ] **Step 1: 扩展 `shared/types.ts`，添加二期类型**

```typescript
// 工具包元信息 —— 前后端共享的纯类型
export interface ToolPackageMeta {
  id: string;
  name: string;
  icon: string;
}

// 统一 API 响应格式
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// === 二期新增 ===

export interface Todo {
  id: number;
  parent_id: number | null;
  title: string;
  description: string;
  priority: '高' | '中' | '低';
  due_date: string | null;
  completed: number;
  completed_at: string | null;
  sort_order: number;
  is_risk: number;
  is_focus: number;
  created_at: string;
  updated_at: string;
  tags?: Tag[];
  children?: Todo[];
}

export interface Tag {
  id: number;
  name: string;
  color: string;
  todo_count?: number;
}

export interface Template {
  id: number;
  name: string;
  content: string;
  is_default: number;
  created_at: string;
  updated_at: string;
}

export interface SummaryGroup {
  tag: Tag;
  completed: SummaryItem[];
  pending: SummaryItem[];
  risks: SummaryItem[];
  focus: SummaryItem[];
}

export interface SummaryItem {
  title: string;
  subCount: number;
  completedAt?: string;
  isManual?: boolean;
}

export interface SummaryData {
  period: string;
  groups: SummaryGroup[];
}

export interface CreateTodoInput {
  parent_id?: number | null;
  title: string;
  description?: string;
  priority?: '高' | '中' | '低';
  due_date?: string | null;
  tag_ids?: number[];
}

export interface UpdateTodoInput {
  title?: string;
  description?: string;
  priority?: '高' | '中' | '低';
  due_date?: string | null;
  completed?: number;
  is_risk?: number;
  is_focus?: number;
  tag_ids?: number[];
}

export interface ReorderInput {
  items: { id: number; sort_order: number }[];
}
```

- [ ] **Step 2: Commit**

```bash
git add shared/types.ts
git commit -m "feat: add Phase 2 shared types (Todo, Tag, Template, Summary)"
```

---

### Task 3: 后端 — 标签 API

**Files:**
- Create: `server/src/routes/tags.ts`

- [ ] **Step 1: 创建 `server/src/routes/tags.ts`**

```typescript
import { Router, Request, Response } from 'express';
import type { ApiResponse, Tag } from '@shared/types';
import { getDb } from '../db';

const router = Router();

// GET /api/tags — 标签列表（含使用计数）
router.get('/', (_req: Request, res: Response<ApiResponse<Tag[]>>) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT t.*, COUNT(tt.todo_id) as todo_count
    FROM tags t
    LEFT JOIN todo_tags tt ON t.id = tt.tag_id
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
```

- [ ] **Step 2: 注册到工具注册表**

In `server/src/tools/registry.ts`，将 `todoSummaryRouter` 替换为 tags router:
```typescript
import todoSummaryRouter from '../routes/tags';
```

- [ ] **Step 3: 验证**

```bash
cd server && npx tsx src/index.ts &
curl -s http://localhost:3001/api/todo-summary | jq
# Expected: { success: true, data: [] }
curl -s -X POST http://localhost:3001/api/todo-summary -H "Content-Type: application/json" -d '{"name":"项目1","color":"#3b82f6"}'
# Expected: { success: true, data: { id: 1, name: "项目1", ... } }
```

- [ ] **Step 4: Commit**

```bash
git add server/src/routes/tags.ts server/src/tools/registry.ts
git commit -m "feat: tags CRUD API"
```

---

### Task 4: 后端 — 待办 API

**Files:**
- Create: `server/src/routes/todos.ts`

- [ ] **Step 1: 创建 `server/src/routes/todos.ts`**

```typescript
import { Router, Request, Response } from 'express';
import type { ApiResponse, Todo, CreateTodoInput, UpdateTodoInput, ReorderInput } from '@shared/types';
import { getDb } from '../db';

const router = Router();

// GET /api/todos — 查询待办
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

// POST /api/todos — 创建待办
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

// PUT /api/todos/:id — 更新待办
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

// DELETE /api/todos/:id — 软删除
router.delete('/:id', (req: Request, res: Response<ApiResponse<never>>) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM todos WHERE id = ? AND deleted_at IS NULL').get(Number(req.params.id));
  if (!existing) {
    res.status(404).json({ success: false, error: '待办不存在' });
    return;
  }
  // 级联软删除子待办
  db.prepare("UPDATE todos SET deleted_at = datetime('now') WHERE id = ? OR parent_id = ?")
    .run(Number(req.params.id), Number(req.params.id));
  res.json({ success: true });
});

// PUT /api/todos/reorder — 批量排序
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

export default router;
```

- [ ] **Step 2: 合并路由**

`server/src/tools/registry.ts` 导入 todos 路由并将 tags 和 todos 合并到一个主路由：

```typescript
import { Router } from 'express';
import type { ToolPackageMeta } from '@shared/types';
import tagsRouter from '../routes/tags';
import todosRouter from '../routes/todos';

export interface ServerToolPackage {
  meta: ToolPackageMeta;
  apiRouter?: Router;
}

const todoSummaryMeta: ToolPackageMeta = {
  id: 'todo-summary',
  name: '待办 & 总结',
  icon: '📋',
};

// 合并子路由到同一个工具包下
const mainRouter = Router();
mainRouter.use('/tags', tagsRouter);
mainRouter.use('/todos', todosRouter);

export const toolRegistrations: ServerToolPackage[] = [
  { meta: todoSummaryMeta, apiRouter: mainRouter },
];
```

注意：合并后 API 路径变为 `/api/todo-summary/tags` 和 `/api/todo-summary/todos`。

- [ ] **Step 3: 验证**

```bash
curl -s -X POST http://localhost:3001/api/todo-summary/todos -H "Content-Type: application/json" -d '{"title":"测试待办","priority":"高"}'
# Expected: { success: true, data: { id: 1, title: "测试待办", ... } }
curl -s http://localhost:3001/api/todo-summary/todos
# Expected: { success: true, data: [{ id: 1, ... }] }
```

- [ ] **Step 4: Commit**

```bash
git add server/src/routes/todos.ts server/src/tools/registry.ts
git commit -m "feat: todos CRUD API with sub-todos and reorder"
```

---

### Task 5: 后端 — 模板 API

**Files:**
- Create: `server/src/routes/templates.ts`

- [ ] **Step 1: 创建 `server/src/routes/templates.ts`**

```typescript
import { Router, Request, Response } from 'express';
import type { ApiResponse, Template } from '@shared/types';
import { getDb } from '../db';

const router = Router();

// GET /api/templates — 模板列表
router.get('/', (_req: Request, res: Response<ApiResponse<Template[]>>) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM templates ORDER BY is_default DESC, id').all() as Template[];
  res.json({ success: true, data: rows });
});

// POST /api/templates — 创建模板
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

// PUT /api/templates/:id — 更新模板
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

// DELETE /api/templates/:id — 删除模板
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
```

- [ ] **Step 2: 注册到主路由**

In `server/src/tools/registry.ts`，添加：
```typescript
import templatesRouter from '../routes/templates';
// ...
mainRouter.use('/templates', templatesRouter);
```

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/templates.ts server/src/tools/registry.ts
git commit -m "feat: templates CRUD API"
```

---

### Task 6: 后端 — AI 总结 API

**Files:**
- Create: `server/src/routes/summary.ts`

- [ ] **Step 1: 创建 `server/src/routes/summary.ts`**

```typescript
import { Router, Request, Response } from 'express';
import type { ApiResponse, SummaryData, SummaryGroup, SummaryItem } from '@shared/types';
import { getDb } from '../db';

const router = Router();

function getPeriodDates(period: string, from?: string, to?: string): { start: string; end: string; label: string } {
  const now = new Date();
  if (period === 'week') {
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return {
      start: monday.toISOString(),
      end: sunday.toISOString(),
      label: `${monday.toISOString().slice(0, 10)} ~ ${sunday.toISOString().slice(0, 10)}`,
    };
  }
  if (period === 'month') {
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    first.setHours(0, 0, 0, 0);
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    last.setHours(23, 59, 59, 999);
    return {
      start: first.toISOString(),
      end: last.toISOString(),
      label: `${first.toISOString().slice(0, 10)} ~ ${last.toISOString().slice(0, 10)}`,
    };
  }
  // custom
  return {
    start: from || '',
    end: to || '',
    label: `${from || ''} ~ ${to || ''}`,
  };
}

// GET /api/summary/data — 周月视图数据
router.get('/data', (req: Request, res: Response<ApiResponse<SummaryData>>) => {
  const db = getDb();
  const { period = 'week', from, to } = req.query;
  const { start, end, label } = getPeriodDates(period as string, from as string, to as string);

  const tags = db.prepare('SELECT * FROM tags').all() as any[];
  const groups: SummaryGroup[] = [];

  for (const tag of tags) {
    const completed = db.prepare(`
      SELECT title, (SELECT COUNT(*) FROM todos c WHERE c.parent_id = t.id AND c.completed = 1) as subCount,
             completed_at as completedAt
      FROM todos t
      WHERE t.deleted_at IS NULL AND t.completed = 1 AND t.parent_id IS NULL
        AND t.completed_at >= ? AND t.completed_at <= ?
        AND EXISTS (SELECT 1 FROM todo_tags tt WHERE tt.todo_id = t.id AND tt.tag_id = ?)
    `).all(start, end, tag.id) as SummaryItem[];

    const pending = db.prepare(`
      SELECT title, (SELECT COUNT(*) FROM todos c WHERE c.parent_id = t.id) as subCount
      FROM todos t
      WHERE t.deleted_at IS NULL AND t.completed = 0 AND t.parent_id IS NULL
        AND EXISTS (SELECT 1 FROM todo_tags tt WHERE tt.todo_id = t.id AND tt.tag_id = ?)
    `).all(tag.id) as SummaryItem[];

    const risks = db.prepare(`
      SELECT title, 0 as subCount, 1 as isManual
      FROM todos t
      WHERE t.deleted_at IS NULL AND t.is_risk = 1 AND t.parent_id IS NULL
        AND EXISTS (SELECT 1 FROM todo_tags tt WHERE tt.todo_id = t.id AND tt.tag_id = ?)
    `).all(tag.id) as SummaryItem[];

    const focus = db.prepare(`
      SELECT title, 0 as subCount, 1 as isManual
      FROM todos t
      WHERE t.deleted_at IS NULL AND t.is_focus = 1 AND t.parent_id IS NULL
        AND EXISTS (SELECT 1 FROM todo_tags tt WHERE tt.todo_id = t.id AND tt.tag_id = ?)
    `).all(tag.id) as SummaryItem[];

    if (completed.length || pending.length) {
      groups.push({
        tag: { id: tag.id, name: tag.name, color: tag.color },
        completed,
        pending,
        risks,
        focus,
      } as SummaryGroup);
    }
  }

  res.json({ success: true, data: { period: label, groups } });
});

// POST /api/summary/generate — AI 生成总结
router.post('/generate', async (req: Request, res: Response<ApiResponse<{ content: string }>>) => {
  const { templateId, period } = req.body;
  const db = getDb();

  const tpl = db.prepare('SELECT * FROM templates WHERE id = ?').get(templateId) as any;
  if (!tpl) {
    res.status(400).json({ success: false, error: '模板不存在' });
    return;
  }

  // 收集数据
  const { start, end, label } = getPeriodDates(period || 'week');

  const tags = db.prepare('SELECT * FROM tags').all() as any[];
  let completedText = '';
  let pendingText = '';
  let risksText = '';
  let focusText = '';

  for (const tag of tags) {
    const completed = db.prepare(`
      SELECT t.title, (SELECT COUNT(*) FROM todos c WHERE c.parent_id = t.id AND c.completed = 1) as sub_count
      FROM todos t WHERE t.deleted_at IS NULL AND t.completed = 1 AND t.parent_id IS NULL
        AND t.completed_at >= ? AND t.completed_at <= ?
        AND EXISTS (SELECT 1 FROM todo_tags tt WHERE tt.todo_id = t.id AND tt.tag_id = ?)
    `).all(start, end, tag.id) as any[];

    const pending = db.prepare(`
      SELECT t.title FROM todos t WHERE t.deleted_at IS NULL AND t.completed = 0 AND t.parent_id IS NULL
        AND EXISTS (SELECT 1 FROM todo_tags tt WHERE tt.todo_id = t.id AND tt.tag_id = ?)
    `).all(tag.id) as any[];

    if (completed.length) {
      completedText += `* ${tag.name}：${completed.map((c: any) => c.title + (c.sub_count ? `（含${c.sub_count}子项）` : '')).join('、')}\n`;
    }

    if (pending.length) {
      pendingText += `* ${tag.name}：${pending.map((p: any) => p.title).join('、')}\n`;
    }

    const risks = db.prepare(`
      SELECT title FROM todos WHERE is_risk = 1 AND deleted_at IS NULL AND parent_id IS NULL
        AND EXISTS (SELECT 1 FROM todo_tags tt WHERE tt.todo_id = todos.id AND tt.tag_id = ?)
    `).all(tag.id) as any[];
    if (risks.length) {
      risksText += `* ${tag.name}：${risks.map((r: any) => r.title).join('、')}\n`;
    }
  }

  // 填充模板占位符
  let draft = tpl.content
    .replace('{{week_range}}', label)
    .replace('{{completed}}', completedText || '暂无')
    .replace('{{pending}}', pendingText || '暂无')
    .replace('{{risks}}', risksText || '暂无')
    .replace('{{focus}}', '')
    .replace('{{ai_summary}}', '{{AI_GENERATED}}');

  // 调用 AI API
  const provider = process.env.AI_API_PROVIDER || 'deepseek';
  const baseUrl = process.env.AI_API_BASE_URL || 'https://api.deepseek.com/v1';
  const apiKey = process.env.AI_API_KEY || '';
  const model = process.env.AI_API_MODEL || 'deepseek-chat';
  const temperature = parseFloat(process.env.AI_API_TEMPERATURE || '0.7');

  if (!apiKey) {
    // 无 API key 时直接返回草稿
    const finalContent = draft.replace('{{AI_GENERATED}}', '（配置 AI API Key 后可自动生成）');
    res.json({ success: true, data: { content: finalContent } });
    return;
  }

  try {
    const aiResp = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature,
        messages: [
          {
            role: 'system',
            content: `你是项目管理助手。根据提供的周报数据润色和完善，注意：1.检查表述是否通顺 2.分析数据推断潜在风险和关注事项 3.生成本周总结替换{{AI_GENERATED}} 4.保持markdown格式和原结构不变。直接返回完整报告，不要加前缀说明。`,
          },
          { role: 'user', content: draft },
        ],
      }),
    });

    if (!aiResp.ok) throw new Error(`AI API error: ${aiResp.status}`);
    const aiJson = await aiResp.json() as any;
    const content = aiJson.choices?.[0]?.message?.content || draft;
    res.json({ success: true, data: { content } });
  } catch (err: any) {
    res.json({ success: true, data: { content: draft.replace('{{AI_GENERATED}}', `（AI 生成失败：${err.message}）`) } });
  }
});

export default router;
```

- [ ] **Step 2: 注册到主路由**

```typescript
import summaryRouter from '../routes/summary';
mainRouter.use('/summary', summaryRouter);
```

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/summary.ts server/src/tools/registry.ts
git commit -m "feat: AI summary data and generation API"
```

---

### Task 7: 前端 — Context 状态管理与主页面路由

**Files:**
- Create: `client/src/tools/todo-summary/context.tsx`
- Modify: `client/src/tools/todo-summary/index.tsx`

- [ ] **Step 1: 创建 `context.tsx`**

```typescript
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Todo, Tag, Template } from '@shared/types';
import { useApi } from '@/hooks/useApi';

type View = 'list' | 'weekmonth' | 'tags' | 'templates';

interface TodoContextValue {
  view: View;
  setView: (v: View) => void;
  filter: string;
  setFilter: (f: string) => void;
  selectedTagId: number | null;
  setSelectedTagId: (id: number | null) => void;
  refresh: () => void;
  refreshKey: number;
}

const TodoCtx = createContext<TodoContextValue | null>(null);

export function TodoProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<View>('list');
  const [filter, setFilter] = useState('all');
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  return (
    <TodoCtx.Provider value={{ view, setView, filter, setFilter, selectedTagId, setSelectedTagId, refresh, refreshKey }}>
      {children}
    </TodoCtx.Provider>
  );
}

export function useTodoContext() {
  const ctx = useContext(TodoCtx);
  if (!ctx) throw new Error('useTodoContext must be used within TodoProvider');
  return ctx;
}
```

- [ ] **Step 2: 更新 `index.tsx` 主页面（含筛选栏和视图路由）**

```typescript
import type { ToolPackageMeta } from '@shared/types';
import { TodoProvider, useTodoContext } from './context';
import { TodoList } from './components/TodoList';
import { WeekMonthView } from './components/WeekMonthView';
import { TagManage } from './components/TagManage';
import { TemplateSettings } from './components/TemplateSettings';

export const todoSummaryMeta: ToolPackageMeta = {
  id: 'todo-summary',
  name: '待办 & 总结',
  icon: '📋',
};

function MainPage() {
  const { view, setView, filter, setFilter } = useTodoContext();

  return (
    <div className="flex flex-col h-full">
      {/* 顶部筛选栏 */}
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-white">
        <div className="flex gap-1">
          {['all', 'active', 'completed'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filter === f ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {{ all: '全部', active: '待完成', completed: '已完成' }[f]}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <button onClick={() => setView('weekmonth')} className={`px-3 py-1.5 rounded-md text-sm ${view === 'weekmonth' ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-600'}`}>📊 周月视图</button>
        <button onClick={() => setView('tags')} className={`px-3 py-1.5 rounded-md text-sm ${view === 'tags' ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-600'}`}>🏷 标签管理</button>
        <button onClick={() => setView('templates')} className={`px-3 py-1.5 rounded-md text-sm ${view === 'templates' ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-600'}`}>⚙ 模板设置</button>
      </div>

      {/* 视图区 */}
      <div className="flex-1 overflow-auto">
        {view === 'list' && <TodoList />}
        {view === 'weekmonth' && <WeekMonthView />}
        {view === 'tags' && <TagManage />}
        {view === 'templates' && <TemplateSettings />}
      </div>
    </div>
  );
}

export function TodoSummaryPage() {
  return (
    <TodoProvider>
      <MainPage />
    </TodoProvider>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/tools/todo-summary/context.tsx client/src/tools/todo-summary/index.tsx
git commit -m "feat: todo tool context and main page routing"
```

---

### Task 8: 前端 — 待办列表与待办项组件

**Files:**
- Create: `client/src/tools/todo-summary/components/TodoList.tsx`
- Create: `client/src/tools/todo-summary/components/TodoItem.tsx`

- [ ] **Step 1: 创建 `TodoItem.tsx`**

```typescript
import { useState } from 'react';
import type { Todo } from '@shared/types';
import { useTodoContext } from '../context';
import { useApi } from '@/hooks/useApi';

interface Props {
  todo: Todo;
  isChild?: boolean;
}

export function TodoItem({ todo, isChild }: Props) {
  const [expanded, setExpanded] = useState(false);
  const { refresh } = useTodoContext();
  const { request } = useApi();

  const toggleComplete = async () => {
    await request(`/api/todo-summary/todos/${todo.id}`, {
      method: 'PUT',
      body: JSON.stringify({ completed: todo.completed ? 0 : 1 }),
    });
    refresh();
  };

  const handleDelete = async () => {
    if (!confirm('确定删除？')) return;
    await request(`/api/todo-summary/todos/${todo.id}`, { method: 'DELETE' });
    refresh();
  };

  const priorityColors: Record<string, string> = { '高': 'bg-red-500', '中': 'bg-amber-500', '低': 'bg-slate-400' };

  return (
    <div className={`${isChild ? 'ml-6' : ''}`}>
      <div className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-slate-50 group">
        <input type="checkbox" checked={todo.completed === 1} onChange={toggleComplete} className="shrink-0" />
        <button onClick={() => setExpanded(!expanded)} className="flex-1 text-left">
          <span className={`text-sm ${todo.completed ? 'line-through text-slate-400' : ''}`}>{todo.title}</span>
        </button>
        {todo.priority && (
          <span className={`text-xs text-white px-1.5 py-0.5 rounded ${priorityColors[todo.priority]}`}>{todo.priority}</span>
        )}
        {todo.due_date && <span className="text-xs text-slate-400">{todo.due_date.slice(0, 10)}</span>}
        {!!todo.tags?.length && (
          <div className="flex gap-1">
            {todo.tags.map(t => (
              <span key={t.id} className="text-xs px-1.5 py-0.5 rounded" style={{ background: t.color + '20', color: t.color }}>{t.name}</span>
            ))}
          </div>
        )}
        {!!todo.children?.length && !isChild && (
          <span className="text-xs text-slate-400">{todo.children.length} 子项</span>
        )}
        {todo.is_risk ? <span className="text-xs text-red-500">⚠</span> : null}
        {todo.is_focus ? <span className="text-xs text-purple-500">★</span> : null}
        <button onClick={handleDelete} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 text-xs">🗑</button>
      </div>

      {expanded && !isChild && (
        <div className="ml-8 mb-2">
          {todo.description && <p className="text-sm text-slate-500 mb-2">{todo.description}</p>}
          {todo.children?.map(child => (
            <TodoItem key={child.id} todo={child} isChild />
          ))}
          <button className="text-xs text-sky-500 hover:text-sky-600 mt-1">+ 添加子待办</button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 创建 `TodoList.tsx`**

```typescript
import { useState } from 'react';
import type { Todo } from '@shared/types';
import { useTodoContext } from '../context';
import { useApi } from '@/hooks/useApi';
import { TodoItem } from './TodoItem';

export function TodoList() {
  const { filter, selectedTagId, refreshKey } = useTodoContext();
  const { data, loading } = useApi<Todo[]>();
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  // 用 refreshKey 触发重新加载
  const todos = data; // 实际需在 useEffect 中调用 request

  return (
    <div className="max-w-3xl mx-auto p-4">
      {/* 快速添加 */}
      <form
        onSubmit={async e => {
          e.preventDefault();
          if (!newTitle.trim()) return;
          await fetch('/api/todo-summary/todos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: newTitle }),
          });
          setNewTitle('');
          location.reload(); // 简化：后续改为 refresh()
        }}
        className="flex gap-2 mb-4"
      >
        <input
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          placeholder="添加新待办..."
          className="flex-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
        />
        <button type="submit" className="px-4 py-2 bg-sky-500 text-white rounded-md text-sm font-medium hover:bg-sky-600">添加</button>
      </form>

      <div className="space-y-0.5">
        {loading ? (
          <p className="text-sm text-slate-400">加载中...</p>
        ) : (
          <TodoListView />
        )}
      </div>
    </div>
  );
}

function TodoListView() {
  const { filter, refreshKey } = useTodoContext();
  // useEffect 从 /api/todo-summary/todos?status=filter 加载
  // 简化实现占位
  return <p className="text-sm text-slate-400">待办项将在实现时通过 API 加载</p>;
}
```

注：TodoList 组件在实际实现中通过 useEffect + useApi hook 加载数据。以上为骨架，实现时填充完整的 API 调用逻辑。

- [ ] **Step 3: Commit**

```bash
git add client/src/tools/todo-summary/components/TodoList.tsx client/src/tools/todo-summary/components/TodoItem.tsx
git commit -m "feat: TodoItem and TodoList components"
```

---

### Task 9: 前端 — 待办表单（创建/编辑）

**Files:**
- Create: `client/src/tools/todo-summary/components/TodoForm.tsx`

- [ ] **Step 1: 创建 `TodoForm.tsx`**

```typescript
import { useState, useEffect } from 'react';
import type { Todo, Tag } from '@shared/types';
import { useTodoContext } from '../context';
import { useApi } from '@/hooks/useApi';

interface Props {
  todo?: Todo | null;
  parentId?: number | null;
  onClose: () => void;
}

export function TodoForm({ todo, parentId, onClose }: Props) {
  const { refresh } = useTodoContext();
  const { data: tags } = useApi<Tag[]>();
  const { request } = useApi<Todo>();

  const [title, setTitle] = useState(todo?.title || '');
  const [description, setDescription] = useState(todo?.description || '');
  const [priority, setPriority] = useState(todo?.priority || '中');
  const [dueDate, setDueDate] = useState(todo?.due_date?.slice(0, 10) || '');
  const [selectedTags, setSelectedTags] = useState<number[]>(todo?.tags?.map(t => t.id) || []);
  const [isRisk, setIsRisk] = useState(!!todo?.is_risk);
  const [isFocus, setIsFocus] = useState(!!todo?.is_focus);

  // 加载标签列表
  useEffect(() => {
    request('/api/todo-summary/tags');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const body: any = {
      title: title.trim(),
      description,
      priority,
      due_date: dueDate || null,
      tag_ids: selectedTags,
      is_risk: isRisk ? 1 : 0,
      is_focus: isFocus ? 1 : 0,
    };
    if (parentId) body.parent_id = parentId;

    if (todo) {
      await request(`/api/todo-summary/todos/${todo.id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
    } else {
      await request('/api/todo-summary/todos', {
        method: 'POST',
        body: JSON.stringify(body),
      });
    }
    refresh();
    onClose();
  };

  const toggleTag = (tagId: number) => {
    setSelectedTags(prev => prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]);
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[80vh] overflow-y-auto">
        <h3 className="font-semibold text-lg">{todo ? '编辑待办' : parentId ? '添加子待办' : '新建待办'}</h3>

        <div>
          <label className="text-sm font-medium text-slate-700">标题</label>
          <input value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm mt-1" placeholder="待办标题" required />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">描述</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm mt-1" rows={3} placeholder="详细描述（可选）" />
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium text-slate-700">优先级</label>
            <select value={priority} onChange={e => setPriority(e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm mt-1">
              <option value="高">高</option>
              <option value="中">中</option>
              <option value="低">低</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium text-slate-700">截止日期</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm mt-1" />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">标签</label>
          <div className="flex gap-1.5 mt-1 flex-wrap">
            {(tags || []).map(tag => (
              <button
                type="button"
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                  selectedTags.includes(tag.id) ? 'text-white' : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
                }`}
                style={selectedTags.includes(tag.id) ? { background: tag.color } : undefined}
              >
                {tag.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isRisk} onChange={e => setIsRisk(e.target.checked)} /> ⚠ 标记风险
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isFocus} onChange={e => setIsFocus(e.target.checked)} /> ★ 重点关注
          </label>
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 bg-slate-100 rounded-md hover:bg-slate-200">取消</button>
          <button type="submit" className="px-4 py-2 text-sm text-white bg-sky-500 rounded-md hover:bg-sky-600">{todo ? '保存' : '创建'}</button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/tools/todo-summary/components/TodoForm.tsx
git commit -m "feat: TodoForm create/edit component"
```

---

### Task 10: 前端 — 标签管理页

**Files:**
- Create: `client/src/tools/todo-summary/components/TagManage.tsx`

- [ ] **Step 1: 创建 `TagManage.tsx`**

```typescript
import { useState, useEffect } from 'react';
import type { Tag } from '@shared/types';
import { useTodoContext } from '../context';
import { useApi } from '@/hooks/useApi';

const PRESET_COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export function TagManage() {
  const { refreshKey } = useTodoContext();
  const { data: tags, request } = useApi<Tag[]>();
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');

  useEffect(() => { request('/api/todo-summary/tags'); }, [refreshKey]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    await request('/api/todo-summary/tags', { method: 'POST', body: JSON.stringify({ name: newName, color: newColor }) });
    setNewName('');
    setNewColor(PRESET_COLORS[0]);
  };

  const handleUpdate = async (id: number, name: string, color: string) => {
    await request(`/api/todo-summary/tags/${id}`, { method: 'PUT', body: JSON.stringify({ name, color }) });
    setEditingId(null);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除此标签？关联的待办将不再有此标签。')) return;
    await request(`/api/todo-summary/tags/${id}`, { method: 'DELETE' });
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <h2 className="text-lg font-semibold">🏷 标签管理</h2>

      {/* 新建标签 */}
      <form onSubmit={handleCreate} className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="text-sm font-medium text-slate-700">标签名称</label>
          <input value={newName} onChange={e => setNewName(e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm mt-1" placeholder="项目名称" />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">颜色</label>
          <div className="flex gap-1 mt-1">
            {PRESET_COLORS.map(c => (
              <button type="button" key={c} onClick={() => setNewColor(c)}
                className={`w-7 h-7 rounded-full border-2 ${newColor === c ? 'border-slate-800 scale-110' : 'border-transparent'}`}
                style={{ background: c }} />
            ))}
          </div>
        </div>
        <button type="submit" className="px-4 py-2 bg-sky-500 text-white rounded-md text-sm hover:bg-sky-600 h-fit">添加</button>
      </form>

      {/* 标签列表 */}
      <div className="space-y-2">
        {(tags || []).map(tag => (
          <div key={tag.id} className="flex items-center gap-3 p-3 bg-white border rounded-md">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ background: tag.color }} />
            {editingId === tag.id ? (
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onBlur={() => handleUpdate(tag.id, editName, tag.color)}
                onKeyDown={e => e.key === 'Enter' && handleUpdate(tag.id, editName, tag.color)}
                className="flex-1 px-2 py-1 border rounded text-sm"
                autoFocus
              />
            ) : (
              <span className="flex-1 text-sm" onDoubleClick={() => { setEditingId(tag.id); setEditName(tag.name); }}>
                {tag.name}
              </span>
            )}
            <span className="text-xs text-slate-400">{tag.todo_count || 0} 个待办</span>
            <button onClick={() => handleDelete(tag.id)} className="text-xs text-slate-400 hover:text-red-500">删除</button>
          </div>
        ))}
      </div>

      <button onClick={() => useTodoContext().setView('list')} className="text-sm text-slate-500 hover:text-sky-500">← 返回待办列表</button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/tools/todo-summary/components/TagManage.tsx
git commit -m "feat: TagManage component"
```

---

### Task 11: 前端 — 周月视图

**Files:**
- Create: `client/src/tools/todo-summary/components/WeekMonthView.tsx`

- [ ] **Step 1: 创建 `WeekMonthView.tsx`**

```typescript
import { useState, useEffect } from 'react';
import type { SummaryData } from '@shared/types';
import { useTodoContext } from '../context';
import { useApi } from '@/hooks/useApi';
import { SummaryModal } from './SummaryModal';

type Period = 'week' | 'month' | 'custom';

export function WeekMonthView() {
  const { setView } = useTodoContext();
  const { data: summaryData, request } = useApi<SummaryData>();
  const [period, setPeriod] = useState<Period>('week');
  const [showSummary, setShowSummary] = useState(false);

  const loadData = (p: Period) => {
    request(`/api/todo-summary/summary/data?period=${p}`);
  };

  useEffect(() => { loadData(period); }, [period]);

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      {/* 时间切换 */}
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold">📊 工作总结</h2>
        <div className="flex gap-1 ml-4">
          {(['week', 'month'] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium ${period === p ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
              {p === 'week' ? '本周' : '本月'}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <button onClick={() => setShowSummary(true)}
          className="px-4 py-2 bg-purple-500 text-white rounded-md text-sm font-medium hover:bg-purple-600">
          🤖 生成{period === 'week' ? '周报' : '月报'}
        </button>
      </div>

      {/* 数据展示 */}
      {summaryData ? (
        <div className="space-y-6">
          <p className="text-sm text-slate-500">{summaryData.period}</p>
          {summaryData.groups.map((g, i) => (
            <div key={i}>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: g.tag.color }} />
                <h3 className="font-semibold text-sm">{g.tag.name}</h3>
                <span className="text-xs text-slate-400">完成 {g.completed.length} · 进行中 {g.pending.length}</span>
              </div>
              <div className="ml-4 space-y-1">
                {g.completed.map((item, j) => (
                  <div key={j} className="flex items-center gap-2 text-sm text-slate-600">
                    <span className="text-green-500">✓</span> {item.title}
                    {item.subCount > 0 && <span className="text-xs text-slate-400">含 {item.subCount} 子项</span>}
                    {item.completedAt && <span className="text-xs text-slate-400 ml-auto">{item.completedAt.slice(0, 10)}</span>}
                  </div>
                ))}
                {g.pending.map((item, j) => (
                  <div key={j} className="flex items-center gap-2 text-sm text-slate-500">
                    <span className="text-amber-500">◷</span> {item.title}
                  </div>
                ))}
                {g.risks.map((item, j) => (
                  <div key={j} className="flex items-center gap-2 text-sm text-red-500">
                    ⚠ {item.title}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400">加载中...</p>
      )}

      <button onClick={() => setView('list')} className="text-sm text-slate-500 hover:text-sky-500">← 返回待办列表</button>

      {showSummary && <SummaryModal period={period} onClose={() => setShowSummary(false)} />}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/tools/todo-summary/components/WeekMonthView.tsx
git commit -m "feat: WeekMonthView component"
```

---

### Task 12: 前端 — 模板设置页与 AI 总结弹窗

**Files:**
- Create: `client/src/tools/todo-summary/components/TemplateSettings.tsx`
- Create: `client/src/tools/todo-summary/components/SummaryModal.tsx`

- [ ] **Step 1: 创建 `TemplateSettings.tsx`**

```typescript
import { useState, useEffect } from 'react';
import type { Template } from '@shared/types';
import { useTodoContext } from '../context';
import { useApi } from '@/hooks/useApi';

const PLACEHOLDER_HELP = [
  { key: '{{week_range}}', desc: '时间范围，如 "2026-05-11 ~ 2026-05-17"' },
  { key: '{{completed}}', desc: '已完成项，按项目分组列出' },
  { key: '{{pending}}', desc: '未完成项，按项目分组列出' },
  { key: '{{risks}}', desc: '风险项（手动标记 + AI 推断）' },
  { key: '{{focus}}', desc: '重点关注项（手动标记 + AI 推断）' },
  { key: '{{ai_summary}}', desc: 'AI 生成的综合总结段落' },
];

export function TemplateSettings() {
  const { setView, refreshKey } = useTodoContext();
  const { data: templates, request } = useApi<Template[]>();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [content, setContent] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => { request('/api/todo-summary/templates'); }, [refreshKey]);

  const selected = (templates || []).find(t => t.id === selectedId);

  useEffect(() => {
    if (selected) setContent(selected.content);
  }, [selected]);

  const handleSave = async () => {
    if (!selected || !content.trim()) return;
    await request(`/api/todo-summary/templates/${selected.id}`, { method: 'PUT', body: JSON.stringify({ content }) });
  };

  const insertPlaceholder = (key: string) => {
    setContent(prev => prev + key);
  };

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <h2 className="text-lg font-semibold">⚙ 模板设置</h2>

      {/* 模板选择 */}
      <div className="flex gap-2 flex-wrap">
        {(templates || []).map(tpl => (
          <button key={tpl.id} onClick={() => setSelectedId(tpl.id)}
            className={`px-3 py-1.5 rounded-md text-sm ${selectedId === tpl.id ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {tpl.name} {tpl.is_default ? '(默认)' : ''}
          </button>
        ))}
      </div>

      {/* 编辑区 */}
      {selected && (
        <div className="space-y-3">
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            className="w-full h-64 px-3 py-2 border rounded-md text-sm font-mono"
            placeholder="编辑模板内容..."
          />
          <div className="flex gap-2">
            <button onClick={handleSave} className="px-4 py-2 bg-sky-500 text-white rounded-md text-sm hover:bg-sky-600">保存</button>
            <button onClick={() => setShowHelp(!showHelp)} className="px-4 py-2 text-sm text-slate-600 bg-slate-100 rounded-md hover:bg-slate-200">
              {showHelp ? '隐藏' : '显示'}占位符帮助
            </button>
          </div>
        </div>
      )}

      {/* 占位符帮助 */}
      {showHelp && (
        <div className="bg-slate-50 border rounded-md p-4">
          <h4 className="text-sm font-semibold mb-2">可用占位符</h4>
          <div className="space-y-2">
            {PLACEHOLDER_HELP.map(ph => (
              <div key={ph.key} className="flex items-center gap-2">
                <button onClick={() => insertPlaceholder(ph.key)} className="text-xs font-mono bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded hover:bg-purple-200">
                  {ph.key}
                </button>
                <span className="text-xs text-slate-500">{ph.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button onClick={() => setView('list')} className="text-sm text-slate-500 hover:text-sky-500">← 返回待办列表</button>
    </div>
  );
}
```

- [ ] **Step 2: 创建 `SummaryModal.tsx`**

```typescript
import { useState } from 'react';
import { useApi } from '@/hooks/useApi';

interface Props {
  period: string;
  onClose: () => void;
}

export function SummaryModal({ period, onClose }: Props) {
  const { data: result, loading, request } = useApi<{ content: string }>();
  const [content, setContent] = useState('');

  const handleGenerate = async () => {
    const resp = await request('/api/todo-summary/summary/generate', {
      method: 'POST',
      body: JSON.stringify({ templateId: 1, period }),
    });
    if (resp?.data?.content) setContent(resp.data.content);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-semibold">🤖 AI {period === 'week' ? '周报' : '月报'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          {!content && !loading && (
            <div className="text-center py-12">
              <p className="text-slate-500 mb-4">点击生成{period === 'week' ? '周报' : '月报'}</p>
              <button onClick={handleGenerate} className="px-6 py-2 bg-purple-500 text-white rounded-md font-medium hover:bg-purple-600">🤖 生成</button>
            </div>
          )}

          {loading && <p className="text-center text-slate-400 py-12">生成中...</p>}

          {content && (
            <pre className="text-sm whitespace-pre-wrap font-sans text-slate-700 leading-relaxed">{content}</pre>
          )}
        </div>

        {content && (
          <div className="flex gap-2 justify-end px-6 py-4 border-t">
            <button onClick={handleCopy} className="px-4 py-2 text-sm text-slate-600 bg-slate-100 rounded-md hover:bg-slate-200">📋 复制</button>
            <button onClick={handleGenerate} className="px-4 py-2 text-sm text-white bg-purple-500 rounded-md hover:bg-purple-600">🔄 重新生成</button>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/tools/todo-summary/components/TemplateSettings.tsx client/src/tools/todo-summary/components/SummaryModal.tsx
git commit -m "feat: TemplateSettings and SummaryModal components"
```

---

### Task 13: 集成验证与修复

- [ ] **Step 1: 启动前后端**

```bash
cd server && npx tsx src/index.ts &
cd client && npx vite &
```

- [ ] **Step 2: 验证完整流程**

1. 创建标签（项目1、项目2）
2. 创建待办（含优先级、截止日期、标签）
3. 创建子待办、完成子待办
4. 切到周月视图，确认按项目分组
5. 生成 AI 周报（无 API key 时返回草稿）
6. 编辑模板，切换模板
7. 软删除待办，确认不在列表中

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "chore: integration fixes and final polish"
```
