# CLAUDE.md

## 项目信息

小胖工具集 — 可扩展的个人工具集合平台。React + Express + SQLite 全栈应用，iPad 风格主屏 + 温暖纸质设计语言。

### 启动

```bash
# 后端 (http://localhost:3001)
cd server && npm run dev

# 前端 (http://localhost:5173)
cd client && npm run dev
```

### 目录结构

```
XiaoPang_Tools/
├── shared/                     # 前后端共享（仅类型声明）
│   └── types.ts                # 所有 interface/type 定义
├── server/                     # Express 后端
│   ├── src/
│   │   ├── index.ts            # 入口：中间件注册、路由挂载、启动
│   │   ├── db.ts               # SQLite 单例连接
│   │   ├── migrate.ts          # 迁移引擎（版本号驱动）
│   │   ├── middleware/
│   │   │   ├── auth.ts         # 鉴权中间件（x-auth-password 头校验）
│   │   │   └── errorHandler.ts # 全局错误处理 + SPA 回退
│   │   ├── routes/             # API 路由（按工具或功能拆分）
│   │   │   ├── auth.ts         # POST /api/auth/login
│   │   │   ├── todos.ts        # /api/todo-summary/todos/*
│   │   │   ├── tags.ts         # /api/todo-summary/tags/*
│   │   │   ├── templates.ts    # /api/todo-summary/templates/*
│   │   │   └── summary.ts      # /api/todo-summary/summary/*
│   │   ├── migrations/         # 数据库迁移脚本
│   │   └── tools/
│   │       └── registry.ts     # 后端工具注册（路由合并）
│   ├── public/                 # 前端构建产物（Vite build 输出）
│   └── .env                    # 环境变量（已 gitignore）
└── client/                     # React 前端
    ├── src/
    │   ├── App.tsx             # 根组件：鉴权门控 → 主屏 / 工具工作区
    │   ├── index.css           # Tailwind 指令 + 全局样式 + 动画
    │   ├── hooks/
    │   │   └── useApi.ts       # 通用 API 请求 hook
    │   ├── components/
    │   │   ├── HomeScreen.tsx   # iPad 风格图标网格主屏
    │   │   ├── ToolWorkspace.tsx# 工具内部容器（返回按钮 + 内容区）
    │   │   ├── LoginScreen.tsx  # 登录页（密码输入）
    │   │   └── ui/             # shadcn/ui 组件
    │   └── tools/
    │       ├── registry.ts     # 前端工具注册（ClientToolPackage[]）
    │       └── todo-summary/   # 待办 & 总结工具包
    │           ├── index.tsx   # 入口：Tabs 布局
    │           ├── context.tsx # TodoContext（refresh 机制）
    │           └── components/ # 各功能组件
    └── tailwind.config.js      # 暖纸设计令牌定义
```

---

## 如何添加一个新工具包

以添加一个名为 `pomodoro`（番茄钟）的工具为例：

### 1. 定义类型（如需要）

`shared/types.ts` 中添加新工具的类型声明（仅 interface/type，不写 runtime 值）：

```ts
export interface PomodoroSession {
  id: number;
  start_time: string;
  end_time: string;
  duration_minutes: number;
}
```

### 2. 创建数据库迁移（如需要）

`server/src/migrations/004_pomodoro.ts`：

```ts
import type Database from 'better-sqlite3';

export const version = 4;
export const description = 'Create pomodoro_sessions table';

export function up(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS pomodoro_sessions (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      start_time      TEXT NOT NULL,
      end_time        TEXT,
      duration_minutes INTEGER NOT NULL DEFAULT 25,
      created_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}
```

然后在 `server/src/migrate.ts` 中注册：
```ts
import * as m004 from './migrations/004_pomodoro';
// 在 migrations 数组中追加
{ version: m004.version, description: m004.description, up: m004.up },
```

### 3. 创建后端 API 路由

`server/src/routes/pomodoro.ts`：

```ts
import { Router, Request, Response } from 'express';
import type { ApiResponse, PomodoroSession } from '@shared/types';
import { getDb } from '../db';

const router = Router();

router.get('/', (_req: Request, res: Response<ApiResponse<PomodoroSession[]>>) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM pomodoro_sessions ORDER BY start_time DESC').all();
  res.json({ success: true, data: rows as PomodoroSession[] });
});

export default router;
```

### 4. 注册后端路由

`server/src/tools/registry.ts` 中添加：

```ts
import pomodoroRouter from '../routes/pomodoro';

// 在 toolRegistrations 数组中追加
{
  meta: { id: 'pomodoro', name: '番茄钟', icon: '🍅' },
  apiRouter: pomodoroRouter,
},
```

### 5. 创建前端工具组件

`client/src/tools/pomodoro/index.tsx`：

```tsx
import type { ToolPackageMeta } from '@shared/types';

export const pomodoroMeta: ToolPackageMeta = {
  id: 'pomodoro',
  name: '番茄钟',
  icon: '🍅',
};

export function PomodoroPage() {
  return <div>🍅 番茄钟工作区</div>;
}
```

### 6. 注册前端工具

`client/src/tools/registry.ts` 中添加：

```ts
import { pomodoroMeta, PomodoroPage } from './pomodoro';

// 在 toolPackages 数组中追加
{ meta: pomodoroMeta, component: PomodoroPage },
```

### 7. 更新 HomeScreen 描述

`client/src/components/HomeScreen.tsx` 的 `getToolDesc` 函数中添加对应 case：

```ts
case 'pomodoro': return '番茄工作法计时';
```

完成后，主屏会自动显示新工具图标（3 列网格自动排列）。

---

## 设计令牌系统

暖纸风格的色彩、圆角、阴影全部在 `client/tailwind.config.js` 中定义为 Tailwind 扩展令牌。

### 色彩

| Token | 十六进制 | 用途 |
|-------|----------|------|
| `warm-page` | `#FAF7F2` | 页面底色 |
| `warm-card` | `#FFFFFF` | 卡片 / 行背景 |
| `warm-secondary` | `#F0EBE3` | 次要区域背景 |
| `warm-border` | `#E8E0D5` | 边框 / 分割线 |
| `warm-primary` | `#C9A96E` | 主强调色（按钮 / 选中态） |
| `warm-primary-hover` | `#B8935A` | 按钮悬停 |
| `warm-text` | `#5C4A3A` | 正文 |
| `warm-text-secondary` | `#8B7355` | 次要文字 |
| `warm-muted` | `#B8A088` | 弱化文字 / 未选中复选框边框 |

### 圆角

| Token | 值 | 用途 |
|-------|-----|------|
| `rounded-warm-card` | `16px` | 卡片 / 弹窗 |
| `rounded-warm-icon` | `14px` | 图标容器 |
| `rounded-warm-btn` | `8px` | 按钮 / 输入框 |

### 阴影

| Token | 值 |
|-------|-----|
| `shadow-warm` | `0 2px 12px rgba(139,115,85,0.06)` |
| `shadow-warm-hover` | `0 4px 20px rgba(139,115,85,0.12)` |

### 使用规则

- **组件内不写硬编码颜色**：一律使用 `warm-*` 令牌（`bg-warm-card`、`text-warm-muted`），不写 `bg-white`、`text-gray-500`
- **功能色例外**：优先级红/黄/灰（`#DC2626`/`#EAB308`/`#9CA3AF`）和标签自定义色可用硬编码
- **新组件优先用 `rounded-warm-btn`** 做圆角，卡片用 `rounded-warm-card`

---

## 鉴权系统

单密码鉴权，适用于个人工具场景。

| 组件 | 位置 | 职责 |
|------|------|------|
| auth middleware | `server/src/middleware/auth.ts` | 检查所有 `/api/*` 请求的 `x-auth-password` 头，放行 `/api/auth/login` 和 `/api/health` |
| login API | `server/src/routes/auth.ts` | `POST /api/auth/login` 验证密码 |
| LoginScreen | `client/src/components/LoginScreen.tsx` | 登录页 UI |
| useApi | `client/src/hooks/useApi.ts` | 自动从 `sessionStorage` 读取密码并附加到请求头 |
| App.tsx | `client/src/App.tsx` | 启动时验证已存密码，未通过则显示 LoginScreen |

- 默认密码 `xiaopang`，通过环境变量 `ACCESS_PASSWORD` 覆盖
- `sessionStorage` 存储密码，关闭浏览器后需重新登录
- **新增的 API 调用必须使用 `useApi` hook**（自动带鉴权头）。如需原生 `fetch`，必须手动附加 `x-auth-password` 头（参考 `TagManage.tsx` 的 `authHeaders()`）

---

## GitHub 每日备份

防止 Railway 欠费/误删导致数据永久丢失：应用进程存活期间，每小时检查一次今天是否已经成功备份过，未备份则把全量数据（tags/todos/todo_tags）写入你自己配置的 GitHub 仓库。

| 组件 | 位置 | 职责 |
|------|------|------|
| 备份数据构建 | `server/src/routes/backup.ts` 的 `buildBackupPayload()` | 手动导出（`GET .../backup/export`）和自动备份共用同一份数据构建逻辑 |
| GitHub 写入服务 | `server/src/services/githubBackup.ts` | 直接用 `fetch` 调 GitHub Contents API（GET 取 sha → PUT 创建/覆盖文件），不引入 octokit 依赖 |
| 定时检查 | `server/src/index.ts` | 启动后延迟 10s 检查一次，之后每小时检查一次（`setInterval`），不引入 node-cron 依赖 |
| 开关 & 状态 API | `server/src/routes/settings.ts` | `GET/PUT /api/settings/backup` 读写开关，`POST /api/settings/backup/run` 手动触发 |
| 设置 UI | `client/src/components/BackupSettingsSection.tsx` | 挂在主屏 ⚙ 设置弹窗里，开关 + 上次备份时间/状态 + 立即备份按钮 |

- 开关状态（`backup_enabled`）和上次运行结果存在 `app_settings` 表里，`GITHUB_TOKEN`/`GITHUB_BACKUP_REPO` 等敏感信息只存环境变量，永远不通过 API 返回给前端
- 备份文件路径：`backups/xiaopang-YYYY-MM-DD.json`（按天命名，同一天重复执行会覆盖当天文件，不会越堆越多）
- 失败（网络问题、token 失效等）不会更新"最后成功日期"，下一次小时检查会自动重试；成功才会记录当天已完成，避免重复提交
- 手动"立即备份"按钮不受开关状态限制，方便在打开自动备份前先验证 token/仓库配置是否正确

---

## 前端规范

### useApi Hook

所有 API 调用统一使用 `useApi<T>()`：

```ts
const { data, loading, error, request } = useApi<Todo[]>();

// GET 请求
useEffect(() => {
  request('/api/todo-summary/todos');
}, [refreshKey]);

// POST/PUT/DELETE
await request('/api/todo-summary/todos', {
  method: 'POST',
  body: JSON.stringify({ title: '新待办' }),
});
```

约束：
- **写操作（POST/DELETE）若返回类型与 `useApi<T>` 的 T 不一致，必须用原生 `fetch` + `authHeaders()` 模式**（参考 `TagManage.tsx`，避免类型污染导致白屏）
- `useApi` 在请求中保留旧 `data`（不会因为 loading 把列表清空），仅在请求失败且返回 `success: false` 时不清空
- **不要在 render 阶段调用 setState**，同步逻辑放 `useEffect`

### 组件模式

- **每个组件文件只导出一个主组件**，类型和常量就近定义
- **Props 命名为 `Props`**（不导出），除非需要跨文件共享
- **不引入运行时状态管理库**（zustand 等），用 React Context + `useApi` 足够
- Context 保持轻量：`TodoContext` 只提供 `refresh()` 和 `refreshKey`

### 文件命名

```
client/src/tools/<tool-id>/
├── index.tsx           # 入口：meta 常量 + 页面组件
├── context.tsx         # 工具专属 Context（如需要）
└── components/
    ├── FooList.tsx     # 列表组件
    ├── FooForm.tsx     # 表单组件
    └── ...
```

---

## 后端规范

### 数据库迁移

- 迁移文件放在 `server/src/migrations/`，命名 `NNN_description.ts`
- 每个迁移导出 `version`（递增整数）、`description`（字符串）、`up`（函数）
- 在 `server/src/migrate.ts` 的 `migrations` 数组中注册
- SQLite 不支持 `ALTER COLUMN`，新增列用 `ALTER TABLE ... ADD COLUMN`
- **不要在迁移中使用 `BEGIN...COMMIT`**，迁移引擎已用 `db.transaction()` 包裹

### API 路由

- 路由文件放在 `server/src/routes/`，导出 `Router`
- 响应统一使用 `ApiResponse<T>` 格式：`{ success: boolean; data?: T; error?: string }`
- 错误状态码：400（参数错误）、404（不存在）、500（服务器错误）
- 路由按工具拆分，挂载到 `/api/<tool-id>/` 下
- **Express 路由顺序敏感**：静态路由（如 `/reorder`）必须放在参数路由（如 `/:id`）之前

### 数据库

- `db.ts` 提供 `getDb()` 单例
- 数据库路径通过 `DB_PATH` 环境变量配置（部署时指向 Volume 路径），本地默认 `server/xiaopang.db`
- 开启 WAL 模式和外键约束
- 软删除：`deleted_at` 字段，不物理删除数据

---

## 部署

### 本地测试

```bash
cd client && npm run build   # 构建前端到 server/public/
cd ../server && npm run dev  # 启动后端
```

### Railway 部署

- Root Directory 设为 `server`
- 必须有 Volume（Mount Path `/app/data`）+ 环境变量 `DB_PATH=/app/data/xiaopang.db`
- 环境变量 `ACCESS_PASSWORD` 设置访问密码
- 构建前端后提交 `server/public/` 下的产物（Railway 不构建前端）
- （可选）开启 GitHub 每日备份需要额外配置：
  - `GITHUB_TOKEN`：细粒度 Personal Access Token，只授权备份仓库的 Contents 读写权限
  - `GITHUB_BACKUP_REPO`：备份仓库全名，格式 `owner/repo`（建议用独立私有仓库，不要用代码仓库本身）
  - `GITHUB_BACKUP_BRANCH`：可选，默认 `main`
  - 配置好环境变量后，还需要在设置弹窗里手动打开"每日备份到 GitHub"开关才会生效

---

## 编码规范

以下规范优先级高于默认行为。

### 1. 先思考再编码

- 动手前明确假设，不确定就问
- 有多种理解方式时，列出选项而非默默选一个
- 有更简单的方案时，提出来
- 遇到不清晰的地方，停下来，说清楚哪里困惑，然后问

### 2. 简单优先

- 只写需求范围内的代码，不预判未来功能
- 不为一处使用引入抽象
- 不添加未要求的"灵活性"或"可配置性"
- 不为不可能发生的场景写错误处理
- 写了 200 行能精简到 50 行，就重写

**自问：高级工程师会觉得这是过度设计吗？如果是，简化。**

### 3. 精准修改

编辑已有代码时：
- 不"顺便改进"相邻代码、注释、格式
- 不重构没坏的东西
- 匹配现有风格，哪怕你觉得有其他更好的写法
- 发现无关的死代码，口头提及但不要删除

你的改动造成的孤儿代码要清理：
- 删掉你的改动导致的未使用 import/变量/函数
- 不删之前就存在的死代码（除非被要求）

**测试：每一行改动都应该能追溯到用户的具体需求。**

### 4. 目标驱动执行

把任务转化为可验证的目标：
- "加校验" → "先写无效输入测试，确保失败；再实现，确保通过"
- "修 bug" → "先写能复现的测试，再修"
- "重构 X" → "确保重构前后测试全绿"

多步骤任务给出简要计划：
```
1. 做 X → 验证：检查 A
2. 做 Y → 验证：检查 B
3. 做 Z → 验证：检查 C
```

强验证标准让你能独立循环迭代，弱标准（"把它弄好"）需要不断确认。

### 5. 关键设计决策

- **`shared/types.ts` 只放纯类型声明**（interface/type），不放运行时值。TypeScript 编译后类型擦除，避免 `@shared/*` path alias 在 Node.js 运行时无法解析的问题
- **工具包的 meta 常量**就近定义在各自的注册入口，不放在 shared
- **API 响应统一格式**：`ApiResponse<T> = { success: boolean; data?: T; error?: string; }`
- **前端不引入 TanStack Query/zustand**：用 React Context + 轻量 `useApi` hook
- **生产环境使用 tsx 运行 TypeScript**：不依赖 tsc 编译，避免路径别名问题
