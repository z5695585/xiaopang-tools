# 待办 & 总结工具包 — 二期设计文档

## 概述

在框架基础上实现第一个工具包"待办 & 总结"。包括待办 CRUD、子待办层级、标签管理、周/月视图、AI 总结生成。

## 数据模型

### todos 表（二期新增字段）

```sql
ALTER TABLE todos ADD COLUMN priority TEXT DEFAULT '中';     -- 高/中/低
ALTER TABLE todos ADD COLUMN due_date TEXT;                  -- 截止日期 ISO 字符串
ALTER TABLE todos ADD COLUMN is_risk INTEGER DEFAULT 0;      -- 0/1 风险标记
ALTER TABLE todos ADD COLUMN is_focus INTEGER DEFAULT 0;     -- 0/1 重点关注
ALTER TABLE todos ADD COLUMN deleted_at TEXT;                -- 软删除时间戳
```

### templates 表（新建）

```sql
CREATE TABLE templates (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  content    TEXT NOT NULL,
  is_default INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

默认模板在迁移脚本中直接 INSERT，代码层面禁止删除 `is_default=1` 的模板（API 返回 400）。

## 页面结构

待办工具包内有 4 个视图，通过主页面顶部筛选栏 + 入口按钮切换：

### 1. 待办列表（主页面）

- **筛选栏**：全部 / 待完成 / 已完成 / 按标签筛选
- **添加待办**：输入框 + 展开表单（标题、描述、优先级、截止日期、标签选择、子待办）
- **待办项**：复选框、标题、优先级角标、标签、截止日期、子待办数量
- **展开详情**：点击展开，显示描述、子待办列表、标签、操作（编辑/删除/添加子待办）
- **拖拽排序**：同级待办可拖拽调整 sort_order
- **入口按钮**：📊 周月视图 / 🏷 标签管理 / ⚙ 模板设置

### 2. 周月视图

- **时间切换**：本周 / 本月 / 自定义日期范围
- **按标签（项目）分组展示**
- **完成项**：已完成待办 + 子待办，显示完成日期
- **进行中项**：未完成但属于该标签的待办
- **风险/重点关注标记**：在列表中高亮显示
- **🤖 生成 AI 周报/月报按钮**

### 3. 标签管理

- **列表**：名称、颜色、使用计数
- **CRUD**：新建/编辑/删除标签
- **颜色选择器**：预设色板
- **删除保护**：有使用中的标签提示确认

### 4. 模板设置

- **文本编辑区**：markdown + 占位符
- **占位符帮助面板**：
  - `{{week_range}}` — 时间范围
  - `{{completed}}` — 已完成项（按项目分组）
  - `{{pending}}` — 未完成项（按项目分组）
  - `{{risks}}` — 风险项
  - `{{focus}}` — 重点关注项
  - `{{ai_summary}}` — AI 综合总结段落
- **默认模板**：内置，is_default=1，代码层面禁止删除
- **自定义模板**：用户创建，可自由编辑/删除/切换

## API 路由

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /api/todos | 查询待办（?status=all\|active\|completed&tag_id=） |
| POST | /api/todos | 创建待办 |
| PUT | /api/todos/:id | 更新待办 |
| DELETE | /api/todos/:id | 软删除待办 |
| PUT | /api/todos/reorder | 批量更新 sort_order |
| GET | /api/tags | 标签列表（含使用计数） |
| POST | /api/tags | 创建标签 |
| PUT | /api/tags/:id | 更新标签 |
| DELETE | /api/tags/:id | 删除标签 |
| GET | /api/templates | 模板列表 |
| POST | /api/templates | 创建模板 |
| PUT | /api/templates/:id | 更新模板 |
| DELETE | /api/templates/:id | 删除模板（is_default=1 返回 400） |
| GET | /api/summary/data | 获取总结所需数据（?period=week\|month&from=&to=） |
| POST | /api/summary/generate | 生成 AI 总结 |

## AI 总结流程

### 两步式处理（前端一键调用）

用户点击"生成周报"按钮，前端只调一个 API：

```
POST /api/summary/generate { templateId, period }
  → 后端内部：
      1. 收集数据（按 period 查询完成/未完成/风险项，按标签分组）
      2. 用数据填充模板占位符（草稿）
      3. 将草稿发给 AI 润色 + 补充分析
      4. 返回最终报告
  → 前端弹窗展示（可复制/重新生成）
```

两个 API 各司其职：

- `GET /api/summary/data` — 为**周月视图页面**提供结构化数据，渲染完成/进行中列表
- `POST /api/summary/generate` — 一键生成 AI 总结，后端内部完成数据收集→填模板→调 AI→返回

**Step 1 — 数据收集（`GET /api/summary/data`）**

返回结构化数据，供填充占位符使用：

```typescript
// 响应
{
  success: true,
  data: {
    period: "2026-05-11 ~ 2026-05-17",
    groups: [
      {
        tag: { id: 1, name: "项目1", color: "#3b82f6" },
        completed: [
          { title: "完成数据库表设计", subCount: 2, completedAt: "2026-05-15" },
          { title: "API接口联调", subCount: 0, completedAt: "2026-05-14" }
        ],
        pending: [
          { title: "前端页面对接", subCount: 1 }
        ],
        risks: [
          { title: "性能优化延期", isManual: true }
        ],
        focus: [
          { title: "用户反馈跟进", isManual: true }
        ]
      },
      // ... 更多项目
    ]
  }
}
```

**Step 2 — 填充草稿（后端逻辑，不暴露 API）**

后端读取当前模板，逐个替换占位符：

- `{{week_range}}` → `2026-05-11 ~ 2026-05-17`
- `{{completed}}` → 格式化后的完成列表文本
- `{{pending}}` → 格式化后的未完成列表文本
- `{{risks}}` → 手动标记的风险项 + 留空（等待 AI 补充）
- `{{focus}}` → 手动标记的重点项 + 留空（等待 AI 补充）
- `{{ai_summary}}` → 标记位（等待 AI 生成）

**Step 3 — AI 润色（`POST /api/summary/generate`）**

```typescript
// 请求
{
  templateId: number,
  period: "week" | "month"
}

// 响应
{
  success: true,
  data: {
    content: string  // AI 生成的完整 markdown
  }
}
```

后端将填充好的草稿作为 system prompt 发送给 AI API，要求 AI：
1. 检查并润色完成/待办列表的表述
2. 分析数据，推断潜在风险和需要关注的事项（补充到 {{risks}} 和 {{focus}} 段）
3. 生成一段综合总结（替换 {{ai_summary}}）
4. 保持原有 markdown 结构和项目分组

### AI API 配置

支持多种 AI API，通过环境变量配置：

| 环境变量 | 说明 | 示例 |
|---|---|---|
| `AI_API_PROVIDER` | 提供商 | `deepseek` / `volcano` |
| `AI_API_KEY` | API 密钥 | `sk-xxx` |
| `AI_API_BASE_URL` | API 地址 | `https://api.deepseek.com/v1` |
| `AI_API_MODEL` | 模型名 | `deepseek-chat` / `doubao-pro-32k` |
| `AI_API_TEMPERATURE` | 温度（默认 0.7） | `0.7` |

后端根据 `AI_API_PROVIDER` 选择对应的 API 端点，统一用 OpenAI-compatible chat completions 格式调用。环境变量配置在 `server/.env` 文件中，该文件已在 `.gitignore` 中排除。

## 前端状态管理

- 使用 React Context 管理当前工具包内的路由状态（当前视图、筛选条件）
- 使用 `useApi` hook 处理所有 API 调用
- 不引入 TanStack Query、zustand

## 优先级定义

| 优先级 | 显示 | 颜色 |
|---|---|---|
| 高 | 高 | 红色 #ef4444 |
| 中 | 中 | 黄色 #f59e0b |
| 低 | 低 | 灰色 #94a3b8 |

## 占位符定义

| 占位符 | 替换内容 |
|---|---|
| `{{week_range}}` | 时间范围（如 "2026-05-11 ~ 2026-05-17"） |
| `{{completed}}` | 已完成项，按项目分组列出 |
| `{{pending}}` | 未完成项，按项目分组列出 |
| `{{risks}}` | 手动标记的风险项 + AI 推断补充 |
| `{{focus}}` | 手动标记的重点项 + AI 推断补充 |
| `{{ai_summary}}` | AI 生成的综合总结段落 |

## 默认模板

```
## 本周完成工作
{{completed}}

## 后续待办
{{pending}}

## 风险
{{risks}}

## 重点关注
{{focus}}

## 本周总结
{{ai_summary}}
```

## 验证

1. 待办 CRUD：创建/编辑/删除待办，含优先级、截止日期、标签
2. 子待办：创建/完成子待办，父待办展开可见
3. 标签管理：创建/编辑/删除标签，待办关联标签
4. 周月视图：切换周/月，按标签分组显示完成项
5. `GET /api/summary/data`：返回指定时间范围的完整结构化数据
6. AI 总结：生成周报/月报，弹窗展示，可复制
7. 模板设置：编辑/切换模板，占位符帮助可见，默认模板不可删除
8. 软删除：删除待办后数据保留，不在列表中显示
