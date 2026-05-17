# 小胖工具集 — 框架设计文档

## 概述

构建一个可扩展的工具集合平台。左侧侧边栏导航，右侧工具内容区。通过插件机制，每个工具包独立维护，注册后出现在导航栏。首个工具包为"待办&总结"。

## 技术栈

| 层 | 技术 | 备注 |
|---|---|---|
| 前端 | React 18 + TypeScript | Vite 构建 |
| UI | Tailwind CSS + shadcn/ui | |
| 后端 | Node.js + Express + TypeScript | tsx 开发，tsc 构建 |
| 数据库 | SQLite (better-sqlite3) | 需编译环境，Windows 需安装 Visual Studio Build Tools |
| AI | DeepSeek API (Chat Completions) | 二期启用 |
| 部署 | 单进程全栈 | 前端构建产物由 Express 托管 |

## 项目结构

```
XiaoPang_Tools/
├── client/                    # React 前端
│   ├── src/
│   │   ├── App.tsx            # 根组件：Sidebar + ToolRouter
│   │   ├── components/
│   │   │   └── Sidebar.tsx    # 可扩展导航栏
│   │   ├── tools/             # 工具包注册中心
│   │   │   ├── registry.ts    # 前端注册表（meta → 组件映射）
│   │   │   └── todo-summary/  # 第一个工具包（一期只搭壳）
│   │   │       └── index.ts   # 注册：meta + component
│   │   ├── hooks/             # 共享 hooks（useApi 等）
│   │   └── lib/               # 共享工具函数
│   ├── package.json
│   ├── tsconfig.json          # paths: { "@shared/*": ["../shared/*"] }
│   └── vite.config.ts         # resolve.alias + proxy /api → localhost:3001
├── server/                    # Node.js 后端
│   ├── src/
│   │   ├── index.ts           # Express 入口 + CORS + 全局错误处理
│   │   ├── db.ts              # SQLite 初始化 + 建表
│   │   ├── migrate.ts         # Schema 迁移（每个迁移用事务包裹）
│   │   ├── middleware/
│   │   │   └── errorHandler.ts  # 全局错误中间件
│   │   ├── routes/
│   │   │   └── todo-summary.ts  # 待办工具 API（一期只搭基础路由）
│   │   └── tools/
│   │       └── registry.ts    # 后端注册表（meta → router 映射）
│   ├── package.json           # "build": "tsc", "start": "node dist/index.js"
│   └── tsconfig.json          # outDir: "./dist", paths: { "@shared/*": ["../shared/*"] }
└── shared/                    # 前后端共享（纯类型声明，无运行时值）
    └── types.ts               # ToolPackageMeta, ApiResponse 等 interface/type
```

### shared/ 引用方式

`shared/types.ts` **只放纯类型声明**（`interface`/`type`），不放任何运行时值（常量、函数、对象）。TypeScript 编译时类型被擦除，`shared/` 在运行时零足迹。

前后端通过 TypeScript path aliases（`@shared/*`）引用，各自在 tsconfig.json 中配置：

```json
// client/tsconfig.json & server/tsconfig.json
{ "compilerOptions": { "paths": { "@shared/*": ["../shared/*"] } } }
```

前端 Vite 侧额外配置 `resolve.alias` 将 `@shared` 映射到 `../shared`。

**为什么常量不放 shared/：** `tsc` 不会重写 path aliases 为实际路径，编译后的 `require("@shared/types")` 在 Node.js 运行时无法解析。纯类型在编译后消失，避开此问题。meta 常量就近定义在各注册表入口。

## 工具包接口规范

### 共享层（`shared/types.ts`）—— 前后端通用

```typescript
interface ToolPackageMeta {
  id: string;     // 唯一标识，如 'todo-summary'
  name: string;   // 显示名称，如 '待办 & 总结'
  icon: string;   // 图标（emoji）
}
```

### 前端扩展（`client/src/tools/registry.ts`）

```typescript
interface ClientToolPackage {
  meta: ToolPackageMeta;
  component: React.ComponentType;
}
```

### 后端扩展（`server/src/tools/registry.ts`）

```typescript
interface ServerToolPackage {
  meta: ToolPackageMeta;
  apiRouter?: Router;
}
```

分离原因：前端不需要知道 Express Router，后端不需要知道 React 组件。共享层只放纯数据字段。

### 添加新工具包流程（一期手动注册）

1. 在工具包入口（`client/src/tools/<tool-id>/index.ts`）定义 meta 常量 + 实现组件
2. 在 `client/src/tools/registry.ts` 注册
3. 如需后端路由，在 `server/src/routes/<tool-id>.ts` 实现，meta 常量就地定义，并在 `server/src/tools/registry.ts` 注册

```typescript
// client/src/tools/todo-summary/index.ts —— 示例
import type { ToolPackageMeta } from '@shared/types';

export const todoSummaryMeta: ToolPackageMeta = {
  id: 'todo-summary',
  name: '待办 & 总结',
  icon: '📋',
};
```

当前为手动注册。二期若工具包超过 3 个，考虑用 `import.meta.glob` 实现约定式自动扫描（`client/src/tools/*/index.ts`），减少注册摩擦。

## API 约定

### 统一响应格式

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

一期 `GET /api/health` 返回：

```json
{ "success": true, "data": { "ok": true } }
```

### 全局错误处理

Express 全局 error handler 中间件捕获所有未处理异常，统一包装为 `ApiResponse<never>` 格式返回。二期所有路由继承此约定。

## 状态管理（二期前瞻）

一期占位页不需要状态管理。二期引入以下模式：

- **服务端数据**：React Context + 轻量 `useApi` hook（基于 fetch 封装，处理 loading/error/data 三态）
- **客户端 UI 状态**：React Context（如当前视图、筛选条件等）

保持零额外依赖。此规模的应用不需要 TanStack Query 或 zustand。

## 数据库设计

```sql
CREATE TABLE todos (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id    INTEGER REFERENCES todos(id),
  title        TEXT NOT NULL,
  description  TEXT DEFAULT '',
  completed    INTEGER DEFAULT 0,       -- SQLite 无 boolean，0/1 替代
  completed_at TEXT,
  sort_order   INTEGER DEFAULT 0,       -- 同级排序值，拖拽时批量更新
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
  -- 二期考虑：deleted_at TEXT 实现软删除，避免误删
);

CREATE TABLE tags (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  name  TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#3b82f6'
);

CREATE TABLE todo_tags (
  todo_id INTEGER REFERENCES todos(id) ON DELETE CASCADE,
  tag_id  INTEGER REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (todo_id, tag_id)
);

CREATE TABLE migrations (
  version     INTEGER PRIMARY KEY,
  description TEXT,
  applied_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### Schema 迁移

轻量版本号迁移：`server/src/migrate.ts` 维护一个迁移列表，启动时按版本号顺序执行未应用的迁移。每个迁移用 `BEGIN...COMMIT` 包裹，确保原子性——迁移执行到一半失败时，事务回滚，version 不被写入，下次启动重试。

迁移文件命名：`server/src/migrations/001_initial_schema.ts`、`002_add_xxx.ts`，与 `migrations.version` 对齐，方便回溯历史。

## API 路由（一期）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /api/health | 健康检查 |

仅搭建框架，待办相关 CRUD 路由在二期实现。

## 开发环境

- 前端：`cd client && npm run dev` → Vite dev server（端口 5173）
- 后端：`cd server && npm run dev` → tsx watch（端口 3001）
- Vite proxy：`/api/*` 转发到 `http://localhost:3001`，开发时无需处理 CORS
- 生产环境：Express 托管前端静态文件 + API，无跨域问题

## 构建与部署

### 构建

```bash
# 前端
cd client && npm run build          # Vite 构建 → server/public/

# 后端
cd server && npm run build          # tsc 编译 → server/dist/
```

server/package.json：
```json
{ "scripts": { "build": "tsc", "start": "node dist/index.js", "dev": "tsx watch src/index.ts" } }
```

server/tsconfig.json：
```json
{ "compilerOptions": { "outDir": "./dist", "paths": { "@shared/*": ["../shared/*"] } } }
```

### 部署

- 单进程启动：`cd server && npm start`
- 推荐平台：Railway / 轻量云服务器

## 一期范围（框架）

1. React 项目脚手架 + Tailwind + shadcn/ui
2. 侧边栏导航组件
3. 工具包注册机制（前端注册表 + 后端注册表 + `@shared` path aliases）
4. 待办工具占位页面
5. Express 后端骨架 + SQLite 初始化 + 事务包裹的迁移机制
6. 统一 API 响应格式 + 全局错误中间件
7. 前后端联调（health check）

## 二期范围（待办工具深挖）

1. 待办 CRUD（含子待办层级）
2. 标签管理
3. 已完成列表（周视图 / 月视图）
4. DeepSeek AI 周报/月报生成
5. 交互细节（拖拽排序、筛选、软删除）

## 验证

1. `npm run dev` 启动前端，侧边栏可见，待办工具项可点击
2. 待办工具占位页正常渲染
3. 后端 `GET /api/health` 返回 `{ success: true, data: { ok: true } }`
4. 前端通过 Vite proxy 成功调用 `/api/health`
5. `GET /api/nonexistent` 返回 404，格式为 `{ success: false, error: "Not found" }`
6. 在注册表中新增一个模拟工具包，确认出现在导航栏
