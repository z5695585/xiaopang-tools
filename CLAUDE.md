# CLAUDE.md

## 项目信息

小胖工具集 — 可扩展的个人工具集合平台。React + Express + SQLite 全栈应用。

### 启动

```bash
# 后端 (http://localhost:3001)
cd server && npm run dev

# 前端 (http://localhost:5173)
cd client && npm run dev
```

### 技术栈

- 前端：React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- 后端：Node.js + Express + TypeScript + tsx
- 数据库：SQLite (better-sqlite3)
- AI：DeepSeek API（二期）

### 关键设计决策

- **`shared/types.ts` 只放纯类型声明**（interface/type），不放运行时值。TypeScript 编译后类型擦除，避免 `@shared/*` path alias 在 Node.js 运行时无法解析的问题
- **工具包的 meta 常量**就近定义在各自的注册入口，不放在 shared
- **API 响应统一格式**：`ApiResponse<T> = { success: boolean; data?: T; error?: string; }`
- **数据库迁移**：轻量版本号迁移，每个迁移用 `BEGIN...COMMIT` 事务包裹
- **前端不引入 TanStack Query/zustand**：用 React Context + 轻量 `useApi` hook 即可

### 工具包开发

添加新工具包：
1. `client/src/tools/<id>/index.tsx` — 定义 meta 常量 + React 组件
2. `client/src/tools/registry.ts` — 注册 `ClientToolPackage`
3. 可选：`server/src/routes/<id>.ts` — 后端路由，注册到 `server/src/tools/registry.ts`

---

## 编码规范

以下规范来自 Andrej Karpathy 的 LLM 编码最佳实践，优先级高于默认行为。

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
