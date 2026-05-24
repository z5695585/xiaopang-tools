# 小胖工具集 UI 全面重构设计规格

## 概述

将当前"深色侧边栏 + 内容区"布局重构为 iPad 式主屏图标网格，采用温暖纸质（Warm Paper）设计语言。保留所有现有业务逻辑和数据流，仅改造 UI 表现层。

## 设计语言：温暖纸质

| 维度 | 规范 |
|------|------|
| 底色 | `#FAF7F2` (page), `#FFFFFF` (card) |
| 暖灰 | `#F0EBE3` (secondary), `#E8E0D5` (border) |
| 强调色 | `#C9A96E` (amber-primary), `#B8935A` (hover) |
| 文字 | `#5C4A3A` (primary), `#8B7355` (secondary), `#B8A088` (muted) |
| 圆角 | 卡片 16px, 按钮 8px, 图标 14px, 输入框 8px |
| 阴影 | 低对比度: `0 2px 12px rgba(139,115,85,0.06)` |
| 字体 | 系统默认, 主屏标题 22px/700, 正文 14px, 辅助 11px |

## 架构变更

### 导航模式：单层 → 两层

```
之前: Sidebar(工具列表) + Content(当前工具)
之后: HomeScreen(图标网格) ↔ ToolWorkspace(工具内部)
```

导航流：
- `/` → HomeScreen: 3 个工具图标的网格（1 个真实 + 2 个占位）
- 点击图标 → ToolWorkspace: 工具内部组件，顶部有返回按钮
- 点击返回 → 回到 HomeScreen

### 组件树变更

```
App.tsx (新增路由状态: home | tool)
├── HomeScreen.tsx (NEW)
│   └── ToolIcon.tsx (NEW) — 单个图标卡片
└── ToolWorkspace.tsx (NEW — 替代原 App.tsx 的内容区)
    └── <activeTool.component /> (保留)
        └── todo-summary/index.tsx (UI 翻新，逻辑保留)
            ├── TodoListView.tsx (UI 翻新)
            ├── WeekView.tsx (UI 翻新)
            ├── MonthView.tsx (UI 翻新)
            ├── ReportTemplates.tsx (UI 翻新)
            ├── AiSummaryPanel.tsx (UI 翻新)
            ├── TodoForm.tsx (UI 翻新)
            ├── TodoRow.tsx (UI 翻新)
            └── DraggableTodoList.tsx (逻辑保留)
```

### 删除文件

- `client/src/components/Sidebar.tsx` — 不再需要侧边栏

### 新增文件

- `client/src/components/HomeScreen.tsx` — iPad 式主屏图标网格
- `client/src/components/ToolWorkspace.tsx` — 工具内部容器（返回按钮 + 内容）

## 设计令牌系统

### Tailwind Config 扩展

```js
// tailwind.config.js theme.extend
colors: {
  warm: {
    page: '#FAF7F2',
    card: '#FFFFFF',
    secondary: '#F0EBE3',
    border: '#E8E0D5',
    primary: '#C9A96E',
    'primary-hover': '#B8935A',
    text: '#5C4A3A',
    'text-secondary': '#8B7355',
    muted: '#B8A088',
  }
},
borderRadius: {
  'warm-card': '16px',
  'warm-icon': '14px',
  'warm-btn': '8px',
},
boxShadow: {
  'warm': '0 2px 12px rgba(139,115,85,0.06)',
  'warm-hover': '0 4px 20px rgba(139,115,85,0.12)',
}
```

### CSS 全局样式

```css
body {
  background: #FAF7F2;
  color: #5C4A3A;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
```

## 组件规格

### HomeScreen — 主屏图标网格

```
┌─────────────────────────────────────┐
│  🧰 小胖工具          3 个工具  ⚙ │
│                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────┐│
│  │    📋    │ │    🔧    │ │  📊  ││
│  │ 待办&总结 │ │  工具 2  │ │工具 3││
│  │任务+AI周报│ │  即将推出 │ │即将推出│
│  └──────────┘ └──────────┘ └──────┘│
└─────────────────────────────────────┘
```

- 3 列网格 (`grid-cols-3`)，间距 16px，居中显示在页面中
- 真实工具卡片：(1) 实线边框 + 暖色边框 (2) 微阴影 (3) 点击进入
- 占位卡片：虚线边框 `dashed`，半透明 `opacity: 0.7`
- 图标：56×56 圆角方形，渐变琥珀底色 + emoji，`border-radius: 14px`
- 卡片标题：13px/600，文字色
- 卡片描述：10px，辅助色
- Hover 效果：`-translate-y-1` + `shadow-warm-hover`，过渡 200ms
- 点击动画：`scale-95` 按压反馈（150ms）

### ToolWorkspace — 工具内部容器

```
┌─────────────────────────────────────┐
│  ← 返回    📋 待办 & 总结          │
│  ───────────────────────────────  │
│  [待办] [周视图] [月视图] [模板]  │
│  ───────────────────────────────  │
│                                     │
│  (工具内容区，保留现有结构)          │
│                                     │
└─────────────────────────────────────┘
```

- 顶部导航栏：`h-12`，左返回按钮 + 工具标题，底部 `border-b`
- 返回按钮：文字 `← 返回`，11px，暖色；hover 下划线
- 工具内部 Tab 切换保留现有的 `@radix-ui/react-tabs`

### TodoListView — UI 翻新

- 顶部操作栏（搜索/筛选/添加）背景改为 `warm-secondary`
- 搜索框：白底暖边框，聚焦时琥珀色边框
- 全部/待完成/已完成分段控件：暖色背景 `bg-warm-secondary`，选中 `bg-warm-primary text-white`
- 添加按钮：琥珀色实心 `bg-warm-primary`，hover 加深
- 标签下拉框：白底暖边框

### TodoRow — UI 翻新

- 每行：白底卡片 `bg-white border border-warm-border`，`rounded-lg`，低阴影
- 悬停：阴影微微加深，背景微暖 `bg-warm-page`
- Checkbox：未选中 `border-2 border-warm-border`，已选中 `bg-warm-primary border-warm-primary`
- 拖拽手柄：`text-warm-muted`，悬停变 `text-warm-primary`
- 展开区域：左边框从 `border-primary/20` 改为 `border-warm-primary/20`，底色 `bg-warm-secondary/20`
- 标签徽章：保留原色但调低饱和度以融入暖色环境

### TodoForm — UI 翻新

- 模态遮罩：`bg-black/20` 暖色调（当前 `bg-black/30`）
- 表单卡片：暖白底，圆角 16px，暖色阴影
- 输入框：白底，`border border-warm-border`，聚焦 `ring-2 ring-warm-primary/20 border-warm-primary`
- 标签选择：选中态用各标签原色，未选中 `bg-warm-secondary text-warm-text-secondary`
- 提交按钮：`bg-warm-primary`，hover 加深
- 取消按钮：`bg-warm-secondary hover:bg-warm-border`

### WeekView / MonthView — UI 翻新

- 日期单元格：`bg-white border border-warm-border rounded-lg`
- 今日标记：`text-warm-primary`，背景微琥珀 `bg-warm-secondary`
- 导航箭头：`hover:bg-warm-secondary`
- 统计栏：`bg-warm-secondary` + 进度条 `bg-warm-primary`
- AI 按钮：边框 `border-2 border-warm-primary text-warm-primary`

### AiSummaryPanel — UI 翻新

- 滑入面板保持 380px 宽，右边滑入
- 面板底色：`bg-white`，左边框 `border-warm-border`
- 阴影：`-4px 0 12px rgba(139,115,85,0.08)`
- 生成按钮：`bg-warm-primary`
- 内容区：`font-sans` 正常排版（去掉当前 `pre` 标签）

### ReportTemplates — UI 翻新

- 模板卡片：`bg-white border border-warm-border rounded-xl`
- 选中态：`border-warm-primary ring-2 ring-warm-primary/20`
- 图标容器：`bg-warm-secondary`
- 编辑区：`bg-warm-secondary` 底色，代码框白底暖边框
- 占位符按钮：`bg-warm-primary/10 text-warm-primary hover:bg-warm-primary/20`

## 动画与微交互

| 场景 | 动画 |
|------|------|
| 主屏 → 工具 | 卡片缩放放大 + 内容淡入（200ms ease-out） |
| 工具 → 主屏 | 内容淡出 + 主屏淡入（150ms ease-in） |
| 图标 Hover | `translateY(-4px)` + 阴影加深（200ms） |
| 图标点击 | `scale(0.95)` 按压（150ms） |
| 待办行 Hover | 背景变暖 + 操作按钮淡入（150ms） |
| 模态打开 | 遮罩淡入 + 表单缩放弹入（200ms ease-out） |
| AI 面板打开 | 从右侧滑入（250ms ease-out） |
| Checkbox 切换 | 缩放弹跳（200ms cubic-bezier） |

## 实施策略

### Phase A: 基础设施（不破坏现有功能）
1. 更新 `tailwind.config.js` 添加暖色设计令牌
2. 更新 `index.css` 全局样式
3. 创建 `HomeScreen.tsx` + `ToolWorkspace.tsx`

### Phase B: 外壳重写
4. 重写 `App.tsx`：使用 React state 管理 home/tool 视图切换
5. 删除 `Sidebar.tsx`
6. 验证：主屏 → 工具 → 返回 流程正常

### Phase C: 逐组件 UI 翻新（每个独立可测）
7. `TodoListView.tsx` + `TodoRow.tsx` + `DraggableTodoList.tsx`
8. `TodoForm.tsx`
9. `WeekView.tsx` + `MonthView.tsx`
10. `AiSummaryPanel.tsx` + `ReportTemplates.tsx`
11. `todo-summary/index.tsx` (Tabs)

### Phase D: 收尾
12. 占位工具图标交互（hover 提示"即将推出"，点击无反应或提示）
13. 动画和微交互
14. 全面验证

## 不变项

- **后端 API 完全不变** — 所有路由、数据结构、迁移脚本
- **`shared/types.ts` 不变** — 类型系统
- **`useApi.ts` hook 不变** — 数据请求层
- **`context.tsx` 不变** — 刷新机制
- **`registry.ts` 模式不变** — 工具注册机制
- **业务逻辑不变** — CRUD、拖拽排序、日历计算、AI 生成

## 风险

- **低风险**：纯 UI 改动，后端和数据流不受影响
- **视觉一致性**：需要仔细检查每个组件的颜色映射是否完整
- **回归测试**：所有 CRUD 操作、拖拽排序、日历视图、AI 生成 需手动验证
