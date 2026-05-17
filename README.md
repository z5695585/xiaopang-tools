# 小胖工具集 (XiaoPang Tools)

## 项目概述

可扩展的个人工具集合平台。左侧侧边栏导航，右侧工具内容区。通过插件机制，每个工具包独立维护，注册后出现在导航栏。

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 18 + TypeScript + Vite |
| UI | Tailwind CSS + shadcn/ui |
| 后端 | Node.js + Express + TypeScript |
| 数据库 | SQLite (better-sqlite3) |
| AI | DeepSeek API（二期） |

## 项目结构

```
XiaoPang_Tools/
├── client/                    # React 前端
│   └── src/
│       ├── App.tsx            # 根组件：Sidebar + 动态工具路由
│       ├── components/
│       │   └── Sidebar.tsx    # 可扩展导航栏
│       ├── tools/
│       │   ├── registry.ts    # 前端工具注册表
│       │   └── todo-summary/  # 待办 & 总结工具包
│       └── hooks/
│           └── useApi.ts      # 类型安全的 API 调用 hook
├── server/                    # Node.js 后端
│   └── src/
│       ├── index.ts           # Express 入口
│       ├── db.ts              # SQLite 连接
│       ├── migrate.ts         # 迁移引擎
│       ├── migrations/        # 迁移文件（001_xxx.ts）
│       ├── middleware/
│       │   └── errorHandler.ts
│       ├── routes/
│       │   └── health.ts      # 健康检查
│       └── tools/
│           └── registry.ts    # 后端工具注册表
├── shared/                    # 前后端共享类型（纯声明，无运行时值）
│   └── types.ts
└── docs/
    └── superpowers/
        ├── specs/             # 设计文档
        └── plans/             # 实施计划
```

## 快速启动

```bash
# 终端 1 — 后端
cd server && npm run dev        # http://localhost:3001

# 终端 2 — 前端
cd client && npm run dev        # http://localhost:5173
```

前端 Vite dev server 自动将 `/api/*` 代理到后端。

## 工具包开发

添加新工具包只需 3 步：

1. 在 `client/src/tools/<id>/index.tsx` 定义 meta 常量 + 组件
2. 在 `client/src/tools/registry.ts` 注册
3. 如需后端路由，在 `server/src/routes/` 实现并注册到 `server/src/tools/registry.ts`

详见 `docs/superpowers/specs/2026-05-17-xiaopang-tools-framework-design.md`

## 一期范围（已完成）

- [x] 可扩展侧边栏导航 + 工具包注册机制
- [x] Express + SQLite 后端骨架 + 迁移系统
- [x] 统一 API 响应格式 + 健康检查
- [x] 前后端联调（Vite proxy）

## 二期范围（待规划）

- [ ] 待办 CRUD（含子待办层级）
- [ ] 标签管理
- [ ] 已完成列表（周视图 / 月视图）
- [ ] DeepSeek AI 周报/月报生成

## 开发约定

- `shared/types.ts` 只放纯类型声明（interface/type），不放运行时值。TypeScript 编译后类型被擦除，避免 Node.js 运行时路径解析问题
- 工具包的 meta 常量就近定义在各自的注册入口，不放在 shared
- API 响应统一为 `{ success: boolean; data?: T; error?: string; }`
- 每个数据库迁移用 `BEGIN...COMMIT` 包裹，确保原子性
