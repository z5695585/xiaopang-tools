# 小胖工具集框架 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭建可扩展工具集合平台：侧边栏导航、工具包注册机制、Express + SQLite 后端骨架、前后端联调。

**Architecture:** React SPA（Vite 构建）+ Node.js/Express 后端 + SQLite 数据库。`shared/types.ts` 放纯类型声明，前后端通过 `@shared/*` path aliases 引用。工具包通过手动注册表接入。

**Tech Stack:** React 18 + TypeScript + Tailwind CSS + shadcn/ui, Express + better-sqlite3 + tsx

---

### Task 1: 项目目录结构与根配置

**Files:**
- Create: `.gitignore`
- Create: `shared/types.ts`

- [ ] **Step 1: 创建目录结构**

```bash
cd /c/Users/56955/Desktop/XiaoPang_Tools
mkdir -p shared
mkdir -p server/src/middleware
mkdir -p server/src/routes
mkdir -p server/src/tools
mkdir -p server/src/migrations
mkdir -p client/src/components
mkdir -p client/src/tools/todo-summary
mkdir -p client/src/hooks
mkdir -p client/src/lib
```

- [ ] **Step 2: 创建 .gitignore**

```
node_modules/
dist/
*.db
*.db-journal
.env
.superpowers/
```

- [ ] **Step 3: 创建 shared/types.ts（纯类型声明，无运行时值）**

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
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "chore: project structure and shared types"
```

---

### Task 2: Server — 项目配置与依赖

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`

- [ ] **Step 1: 创建 server/package.json**

```json
{
  "name": "xiaopang-server",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "better-sqlite3": "^11.7.0",
    "cors": "^2.8.5",
    "express": "^4.21.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.12",
    "@types/cors": "^2.8.17",
    "@types/express": "^5.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 2: 安装依赖**

```bash
cd /c/Users/56955/Desktop/XiaoPang_Tools/server && npm install
```

Expected: 无报错（Windows 需预先安装 Visual Studio Build Tools 以编译 better-sqlite3）

- [ ] **Step 3: 创建 server/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "paths": {
      "@shared/*": ["../shared/*"]
    },
    "baseUrl": "."
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 4: Commit**

```bash
git add server/package.json server/package-lock.json server/tsconfig.json
git commit -m "chore: server project config and dependencies"
```

---

### Task 3: Server — 数据库初始化与迁移系统

**Files:**
- Create: `server/src/db.ts`
- Create: `server/src/migrations/001_initial_schema.ts`
- Create: `server/src/migrate.ts`

- [ ] **Step 1: 创建 server/src/db.ts**

```typescript
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(__dirname, '..', 'xiaopang.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}
```

- [ ] **Step 2: 创建 server/src/migrations/001_initial_schema.ts**

```typescript
import Database from 'better-sqlite3';

export const version = 1;
export const description = 'Initial schema: todos, tags, todo_tags, migrations';

export function up(db: Database.Database): void {
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
```

- [ ] **Step 3: 创建 server/src/migrate.ts**

```typescript
import Database from 'better-sqlite3';
import * as m001 from './migrations/001_initial_schema';

interface Migration {
  version: number;
  description: string;
  up: (db: Database.Database) => void;
}

const migrations: Migration[] = [
  { version: m001.version, description: m001.description, up: m001.up },
].sort((a, b) => a.version - b.version);

export function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      version     INTEGER PRIMARY KEY,
      description TEXT,
      applied_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const applied = new Set(
    db.prepare('SELECT version FROM migrations').all()
      .map((row: any) => row.version)
  );

  for (const m of migrations) {
    if (applied.has(m.version)) continue;

    const run = db.transaction(() => {
      m.up(db);
      db.prepare('INSERT INTO migrations (version, description) VALUES (?, ?)')
        .run(m.version, m.description);
    });

    run(); // 事务包裹：失败时自动回滚，version 不被写入
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add server/src/db.ts server/src/migrations/ server/src/migrate.ts
git commit -m "feat: database init and migration system"
```

---

### Task 4: Server — 全局错误处理中间件

**Files:**
- Create: `server/src/middleware/errorHandler.ts`

- [ ] **Step 1: 创建 server/src/middleware/errorHandler.ts**

```typescript
import { Request, Response, NextFunction } from 'express';
import type { ApiResponse } from '@shared/types';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response<ApiResponse<never>>,
  _next: NextFunction
): void {
  console.error('[error]', err.message);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
}

export function notFoundHandler(
  _req: Request,
  res: Response<ApiResponse<never>>
): void {
  res.status(404).json({ success: false, error: 'Not found' });
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/middleware/errorHandler.ts
git commit -m "feat: global error handler and 404 middleware"
```

---

### Task 5: Server — 健康检查路由与后端工具注册表

**Files:**
- Create: `server/src/routes/health.ts`
- Create: `server/src/tools/registry.ts`

- [ ] **Step 1: 创建 server/src/routes/health.ts**

```typescript
import { Router, Request, Response } from 'express';
import type { ApiResponse } from '@shared/types';

const router = Router();

router.get('/', (_req: Request, res: Response<ApiResponse<{ ok: boolean }>>) => {
  res.json({ success: true, data: { ok: true } });
});

export default router;
```

- [ ] **Step 2: 创建 server/src/tools/registry.ts**

```typescript
import { Router } from 'express';
import type { ToolPackageMeta } from '@shared/types';
import todoSummaryRouter from '../routes/health';

export interface ServerToolPackage {
  meta: ToolPackageMeta;
  apiRouter?: Router;
}

// 待办工具一期只搭壳，复用 health 路由占位
const todoSummaryMeta: ToolPackageMeta = {
  id: 'todo-summary',
  name: '待办 & 总结',
  icon: '📋',
};

export const toolRegistrations: ServerToolPackage[] = [
  { meta: todoSummaryMeta, apiRouter: todoSummaryRouter },
];
```

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/health.ts server/src/tools/registry.ts
git commit -m "feat: health check route and backend tool registry"
```

---

### Task 6: Server — Express 入口

**Files:**
- Create: `server/src/index.ts`

- [ ] **Step 1: 创建 server/src/index.ts**

```typescript
import express from 'express';
import cors from 'cors';
import path from 'path';
import { getDb } from './db';
import { runMigrations } from './migrate';
import { toolRegistrations } from './tools/registry';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());

// 静态文件（生产环境托管前端构建产物）
app.use(express.static(path.join(__dirname, '..', 'public')));

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ success: true, data: { ok: true } });
});

// 注册工具包 API 路由
for (const tool of toolRegistrations) {
  if (tool.apiRouter) {
    app.use(`/api/${tool.meta.id}`, tool.apiRouter);
  }
}

// 错误处理（必须在路由之后）
app.use(notFoundHandler);
app.use(errorHandler);

// 启动数据库并运行迁移
const db = getDb();
runMigrations(db);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

- [ ] **Step 2: 验证后端启动**

```bash
cd /c/Users/56955/Desktop/XiaoPang_Tools/server && npx tsx src/index.ts
```

Expected: `Server running on http://localhost:3001`

按 Ctrl+C 停止。

- [ ] **Step 3: 验证健康检查**

```bash
cd /c/Users/56955/Desktop/XiaoPang_Tools/server && npx tsx src/index.ts &
sleep 2
curl -s http://localhost:3001/api/health
```

Expected: `{"success":true,"data":{"ok":true}}`

- [ ] **Step 4: 验证 404 格式**

```bash
curl -s http://localhost:3001/api/nonexistent
```

Expected: `{"success":false,"error":"Not found"}`

- [ ] **Step 5: Commit**

```bash
git add server/src/index.ts
git commit -m "feat: Express entry point with tool API registration"
```

---

### Task 7: Client — Vite + React + Tailwind + shadcn/ui 脚手架

**Files:**
- Create: `client/package.json`
- Create: `client/tsconfig.json`
- Create: `client/tsconfig.node.json`
- Create: `client/vite.config.ts`
- Create: `client/tailwind.config.js`
- Create: `client/postcss.config.js`
- Create: `client/index.html`
- Create: `client/src/main.tsx`
- Create: `client/src/index.css`
- Create: `client/components.json`

- [ ] **Step 1: 创建 client/package.json**

```json
{
  "name": "xiaopang-client",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "lucide-react": "^0.460.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.6.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.16",
    "tailwindcss-animate": "^1.0.7",
    "typescript": "^5.6.0",
    "vite": "^6.0.0"
  }
}
```

- [ ] **Step 2: 安装依赖**

```bash
cd /c/Users/56955/Desktop/XiaoPang_Tools/client && npm install
```

- [ ] **Step 3: 初始化 shadcn/ui**

```bash
cd /c/Users/56955/Desktop/XiaoPang_Tools/client && npx shadcn@latest init -d
```

Expected: 生成 `components.json` 和 `src/lib/utils.ts`

- [ ] **Step 4: 创建 client/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@shared/*": ["../shared/*"],
      "@/*": ["./src/*"]
    },
    "baseUrl": "."
  },
  "include": ["src"]
}
```

- [ ] **Step 5: 创建 client/vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: '../server/public',
    emptyOutDir: true,
  },
});
```

- [ ] **Step 6: 创建 client/index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>小胖工具</title>
  </head>
  <body class="min-h-screen bg-background antialiased">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 7: 创建 client/src/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 8: 创建 client/src/main.tsx**

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 9: 验证前端启动**

```bash
cd /c/Users/56955/Desktop/XiaoPang_Tools/client && npx vite --host
```

Expected: Vite dev server 在 http://localhost:5173 启动

按 Ctrl+C 停止。

- [ ] **Step 10: Commit**

```bash
git add client/package.json client/package-lock.json client/tsconfig.json \
        client/vite.config.ts client/index.html client/src/main.tsx \
        client/src/index.css client/components.json client/src/lib/
git commit -m "chore: client scaffold with Vite, React, Tailwind, shadcn/ui"
```

---

### Task 8: Client — useApi hook

**Files:**
- Create: `client/src/hooks/useApi.ts`

- [ ] **Step 1: 创建 client/src/hooks/useApi.ts**

```typescript
import { useState, useCallback } from 'react';
import type { ApiResponse } from '@shared/types';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useApi<T = unknown>() {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const request = useCallback(async (url: string, options?: RequestInit): Promise<ApiResponse<T> | null> => {
    setState({ data: null, loading: true, error: null });
    try {
      const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
      });
      const json: ApiResponse<T> = await res.json();
      if (!json.success) {
        setState({ data: null, loading: false, error: json.error || 'Unknown error' });
        return null;
      }
      setState({ data: json.data ?? null, loading: false, error: null });
      return json;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Network error';
      setState({ data: null, loading: false, error: message });
      return null;
    }
  }, []);

  return { ...state, request };
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/hooks/useApi.ts
git commit -m "feat: useApi hook for typed API calls"
```

---

### Task 9: Client — 工具包注册表与待办占位页

**Files:**
- Create: `client/src/tools/registry.ts`
- Create: `client/src/tools/todo-summary/index.ts`

- [ ] **Step 1: 创建 client/src/tools/todo-summary/index.ts**

```typescript
import type { ToolPackageMeta } from '@shared/types';

export const todoSummaryMeta: ToolPackageMeta = {
  id: 'todo-summary',
  name: '待办 & 总结',
  icon: '📋',
};

export function TodoSummaryPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
      <span className="text-6xl mb-4">📋</span>
      <h2 className="text-xl font-semibold mb-2">待办 & 总结</h2>
      <p className="text-sm">即将实现 — 敬请期待</p>
    </div>
  );
}
```

- [ ] **Step 2: 创建 client/src/tools/registry.ts**

```typescript
import type { ComponentType } from 'react';
import type { ToolPackageMeta } from '@shared/types';
import { todoSummaryMeta, TodoSummaryPage } from './todo-summary';

export interface ClientToolPackage {
  meta: ToolPackageMeta;
  component: ComponentType;
}

export const toolPackages: ClientToolPackage[] = [
  { meta: todoSummaryMeta, component: TodoSummaryPage },
];
```

- [ ] **Step 3: Commit**

```bash
git add client/src/tools/
git commit -m "feat: tool registry and todo-summary placeholder page"
```

---

### Task 10: Client — Sidebar 侧边栏组件

**Files:**
- Create: `client/src/components/Sidebar.tsx`

- [ ] **Step 1: 添加 shadcn button 组件**

```bash
cd /c/Users/56955/Desktop/XiaoPang_Tools/client && npx shadcn@latest add button
```

- [ ] **Step 2: 创建 client/src/components/Sidebar.tsx**

```typescript
import type { ClientToolPackage } from '../tools/registry';
import { toolPackages } from '../tools/registry';

interface SidebarProps {
  activeToolId: string;
  onSelectTool: (id: string) => void;
}

export function Sidebar({ activeToolId, onSelectTool }: SidebarProps) {
  return (
    <aside className="w-56 bg-slate-900 text-slate-200 flex flex-col h-screen">
      {/* 品牌区 */}
      <div className="px-4 py-5 border-b border-slate-700">
        <h1 className="text-base font-bold tracking-tight">🧰 小胖工具</h1>
      </div>

      {/* 工具列表 */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {toolPackages.map((pkg: ClientToolPackage) => (
          <button
            key={pkg.meta.id}
            onClick={() => onSelectTool(pkg.meta.id)}
            className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeToolId === pkg.meta.id
                ? 'bg-sky-500 text-white'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <span className="mr-2">{pkg.meta.icon}</span>
            {pkg.meta.name}
          </button>
        ))}
      </nav>

      {/* 底部：将来添加工具包入口（一期仅展示） */}
      <div className="px-4 py-3 border-t border-slate-700">
        <p className="text-xs text-slate-500 text-center">更多工具即将上线</p>
      </div>
    </aside>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/Sidebar.tsx client/src/components/ui/
git commit -m "feat: Sidebar navigation component"
```

---

### Task 11: Client — App.tsx 根组件

**Files:**
- Create: `client/src/App.tsx`

- [ ] **Step 1: 创建 client/src/App.tsx**

```typescript
import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { toolPackages } from './tools/registry';
import type { ClientToolPackage } from './tools/registry';

function App() {
  const [activeToolId, setActiveToolId] = useState(toolPackages[0].meta.id);
  const activeTool: ClientToolPackage | undefined = toolPackages.find(
    (p) => p.meta.id === activeToolId
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar activeToolId={activeToolId} onSelectTool={setActiveToolId} />
      <main className="flex-1 overflow-y-auto bg-slate-50 p-6">
        {activeTool ? (
          <activeTool.component />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            未找到工具包
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
```

- [ ] **Step 2: Commit**

```bash
git add client/src/App.tsx
git commit -m "feat: App root with Sidebar and dynamic tool routing"
```

---

### Task 12: 端到端验证

- [ ] **Step 1: 启动后端**

```bash
cd /c/Users/56955/Desktop/XiaoPang_Tools/server && npx tsx src/index.ts &
```

- [ ] **Step 2: 启动前端**

```bash
cd /c/Users/56955/Desktop/XiaoPang_Tools/client && npx vite &
```

- [ ] **Step 3: 验证点 1 — 侧边栏可见**

打开浏览器访问 http://localhost:5173，确认左侧显示深色侧边栏，包含 "🧰 小胖工具" 品牌名和 "📋 待办 & 总结" 菜单项。

- [ ] **Step 4: 验证点 2 — 占位页渲染**

点击 "📋 待办 & 总结"，右侧内容区显示 "📋 待办 & 总结 — 即将实现" 占位页。

- [ ] **Step 5: 验证点 3 — Health check**

```bash
curl -s http://localhost:3001/api/health
```

Expected: `{"success":true,"data":{"ok":true}}`

- [ ] **Step 6: 验证点 4 — 前端通过 Vite proxy 调用后端**

在浏览器控制台执行：

```javascript
fetch('/api/health').then(r => r.json()).then(console.log)
```

Expected: `{success: true, data: {ok: true}}`

- [ ] **Step 7: 验证点 5 — 404 格式**

```bash
curl -s http://localhost:3001/api/nonexistent
```

Expected: `{"success":false,"error":"Not found"}`

- [ ] **Step 8: 验证点 6 — 新增模拟工具包确认注册机制**

在 `client/src/tools/registry.ts` 的 `toolPackages` 数组中添加：

```typescript
{
  meta: { id: 'demo', name: '演示工具', icon: '🧪' },
  component: () => (
    <div className="flex items-center justify-center h-full">
      <p>这是一个演示工具包</p>
    </div>
  ),
}
```

刷新浏览器，确认侧边栏出现 "🧪 演示工具"，点击后右侧显示演示内容。

- [ ] **Step 9: 移除模拟工具包，还原代码**

- [ ] **Step 10: 最终 Commit**

```bash
git add -A && git commit -m "chore: finalize phase 1 framework"
```
