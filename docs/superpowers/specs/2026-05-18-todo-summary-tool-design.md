# 待办 & 总结工具包 — 二期设计文档

## 概述

在框架基础上实现第一个工具包"待办 & 总结"。包括待办 CRUD、子待办层级、标签管理、周/月视图、AI 总结生成。

## 数据模型

### todos 表（二期新增字段）

```sql
ALTER TABLE todos ADD COLUMN priority TEXT DEFAULT '中';     -- 高/中/低
ALTER TABLE todos ADD COLUMN due_date TEXT;                  -- 截止日期 ISO
ALTER TABLE todos ADD COLUMN is_risk INTEGER DEFAULT 0;      -- 0/1 风险标记
ALTER TABLE todos ADD COLUMN is_focus INTEGER DEFAULT 0;     -- 0/1 重点关注
ALTER TABLE todos ADD COLUMN deleted_at TEXT;                -- 软删除
```

### templates 表（新建）

```sql
CREATE TABLE templates (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  content    TEXT NOT NULL,
  is_default INTEGER DEFAULT 0
);
```

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
- **默认模板**：内置，不可删除
- **自定义模板**：用户创建，支持切换

## API 路由

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /api/todos | 查询待办（?status=all|active|completed&tag_id=） |
| POST | /api/todos | 创建待办 |
| PUT | /api/todos/:id | 更新待办 |
| DELETE | /api/todos/:id | 软删除待办 |
| GET | /api/todos/completed | 已完成查询（?period=week|month&from=&to=） |
| PUT | /api/todos/reorder | 批量更新 sort_order |
| GET | /api/tags | 标签列表（含使用计数） |
| POST | /api/tags | 创建标签 |
| PUT | /api/tags/:id | 更新标签 |
| DELETE | /api/tags/:id | 删除标签 |
| GET | /api/templates | 模板列表 |
| POST | /api/templates | 创建模板 |
| PUT | /api/templates/:id | 更新模板 |
| DELETE | /api/templates/:id | 删除模板 |
| POST | /api/summary/generate | 生成 AI 总结 |

## AI 总结流程

```
用户点击生成 → 收集数据(已完成+未完成+风险+按标签分组) → 套用模板填充占位符 →
发 DeepSeek API 生成总结 → 返回渲染后内容 → 弹窗展示（可复制/重新生成）
```

1. 后端根据 `period` 查询完成/未完成项，按标签分组
2. 读取当前模板，将数据填充到模板对应位置
3. 调用 DeepSeek Chat API，发送填充后的 prompt
4. 返回 AI 生成的完整报告

**生成请求 payload：**
```typescript
POST /api/summary/generate
{
  period: "week" | "month",
  templateId: number
}
```

**响应：**
```typescript
{
  success: true,
  data: {
    content: string  // 渲染好的 markdown 文本
  }
}
```

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
| `{{completed}}` | 本周/月已完成（按项目分组） |
| `{{pending}}` | 未完成待办（按项目分组） |
| `{{risks}}` | 标记为风险的项 + AI 推断的风险 |
| `{{focus}}` | 标记为重点关注的项 + AI 推断 |
| `{{ai_summary}}` | AI 综合总结段落 |

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
```

## 验证

1. 待办 CRUD：创建/编辑/删除待办，含优先级、截止日期、标签
2. 子待办：创建/完成子待办，父待办展开可见
3. 标签管理：创建/编辑/删除标签，待办关联标签
4. 周月视图：切换周/月，按标签分组显示完成项
5. AI 总结：生成周报/月报，弹窗展示，可复制
6. 模板设置：编辑/切换模板，占位符帮助可见
7. 软删除：删除待办后数据保留，不在列表中显示
