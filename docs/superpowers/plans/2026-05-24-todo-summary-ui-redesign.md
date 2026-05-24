# 小胖工具集 UI 全面重构 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有侧边栏布局重构为 iPad 式主屏图标网格，全站采用温暖纸质（Warm Paper）设计语言。

**Architecture:** App.tsx 使用 React state 切换 HomeScreen（图标网格）和 ToolWorkspace（工具内部容器）。所有现有工具组件的业务逻辑保持不变，仅 CSS/样式层翻新。共享设计令牌通过 Tailwind config 的 `extend.theme.colors` 定义。

**Tech Stack:** React 18 + TypeScript + Tailwind CSS + @radix-ui/react-tabs + @radix-ui/react-checkbox + lucide-react + date-fns

---

### Task 1: Tailwind 暖纸设计令牌

**Files:**
- Modify: `client/tailwind.config.js`

- [ ] **Step 1: 扩展 Tailwind 主题配置**

```js
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
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
        },
      },
      borderRadius: {
        'warm-card': '16px',
        'warm-icon': '14px',
        'warm-btn': '8px',
      },
      boxShadow: {
        'warm': '0 2px 12px rgba(139, 115, 85, 0.06)',
        'warm-hover': '0 4px 20px rgba(139, 115, 85, 0.12)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
```

- [ ] **Step 2: 验证 Tailwind 编译**

Run: `cd client && npx tailwindcss -i src/index.css -o /dev/null --dry-run 2>&1 | head -5`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add client/tailwind.config.js
git commit -m "feat: add warm paper design tokens to Tailwind config"
```

---

### Task 2: 全局 CSS 样式

**Files:**
- Modify: `client/src/index.css`

- [ ] **Step 1: 更新全局样式**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-warm-page text-warm-text;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/index.css
git commit -m "feat: apply warm paper body styles"
```

---

### Task 3: HomeScreen 组件（主屏图标网格）

**Files:**
- Create: `client/src/components/HomeScreen.tsx`

- [ ] **Step 1: 创建 HomeScreen 组件**

```tsx
import type { ClientToolPackage } from '../tools/registry';
import { toolPackages } from '../tools/registry';

interface Props {
  onSelectTool: (toolId: string) => void;
}

const placeholderTools = [
  { id: 'placeholder-1', name: '工具 2', icon: '🔧', desc: '即将推出' },
  { id: 'placeholder-2', name: '工具 3', icon: '📊', desc: '即将推出' },
];

export function HomeScreen({ onSelectTool }: Props) {
  const realTools = toolPackages.map(pkg => ({
    id: pkg.meta.id,
    name: pkg.meta.name,
    icon: pkg.meta.icon,
    desc: getToolDesc(pkg.meta.id),
  }));

  const allTools = [...realTools, ...placeholderTools];

  return (
    <div className="min-h-screen bg-warm-page flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-lg">
        {/* 顶部 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[22px] font-bold text-warm-text">🧰 小胖工具</h1>
            <p className="text-[11px] text-warm-muted mt-0.5">{allTools.length} 个工具</p>
          </div>
          <button className="w-9 h-9 bg-warm-secondary hover:bg-warm-border rounded-full flex items-center justify-center transition-colors text-base">
            ⚙
          </button>
        </div>

        {/* 图标网格 */}
        <div className="grid grid-cols-3 gap-4">
          {allTools.map(tool => {
            const isPlaceholder = tool.id.startsWith('placeholder');
            return (
              <button
                key={tool.id}
                onClick={() => !isPlaceholder && onSelectTool(tool.id)}
                disabled={isPlaceholder}
                className={`
                  bg-warm-card rounded-warm-card p-5 text-center transition-all duration-200
                  ${isPlaceholder
                    ? 'border border-dashed border-warm-border opacity-70 cursor-default'
                    : 'border-2 border-warm-border shadow-warm hover:-translate-y-1 hover:shadow-warm-hover active:scale-95'
                  }
                `}
              >
                <div className={`
                  w-14 h-14 rounded-warm-icon flex items-center justify-center text-[28px] mx-auto mb-3
                  ${isPlaceholder ? 'bg-warm-secondary' : 'bg-gradient-to-br from-warm-primary to-warm-primary-hover'}
                `}>
                  {tool.icon}
                </div>
                <div className="text-[13px] font-semibold text-warm-text">{tool.name}</div>
                <div className="text-[10px] text-warm-muted mt-1">{tool.desc}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function getToolDesc(id: string): string {
  switch (id) {
    case 'todo-summary': return '任务管理 + AI 周报';
    default: return '';
  }
}
```

- [ ] **Step 2: 验证 TypeScript 编译**

Run: `cd client && npx tsc --noEmit src/components/HomeScreen.tsx 2>&1 | head -10`
Expected: No errors (may have path alias warnings, that's OK as long as Vite resolves them).

- [ ] **Step 3: Commit**

```bash
git add client/src/components/HomeScreen.tsx
git commit -m "feat: add iPad-style HomeScreen with icon grid"
```

---

### Task 4: ToolWorkspace 组件（工具内部容器）

**Files:**
- Create: `client/src/components/ToolWorkspace.tsx`

- [ ] **Step 1: 创建 ToolWorkspace 组件**

```tsx
import type { ComponentType } from 'react';

interface Props {
  title: string;
  icon: string;
  onBack: () => void;
  children: React.ReactNode;
}

export function ToolWorkspace({ title, icon, onBack, children }: Props) {
  return (
    <div className="min-h-screen bg-warm-page flex flex-col">
      {/* 顶部导航栏 */}
      <header className="h-12 flex items-center gap-3 px-6 bg-warm-card border-b border-warm-border shrink-0">
        <button
          onClick={onBack}
          className="text-[11px] text-warm-muted hover:text-warm-text transition-colors"
        >
          ← 返回
        </button>
        <span className="text-[15px] font-semibold text-warm-text">
          {icon} {title}
        </span>
      </header>

      {/* 工具内容区 */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 验证编译**

Run: `cd client && npx tsc --noEmit src/components/ToolWorkspace.tsx 2>&1 | head -10`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/ToolWorkspace.tsx
git commit -m "feat: add ToolWorkspace container with back navigation"
```

---

### Task 5: 重写 App.tsx（主屏/工具路由）

**Files:**
- Modify: `client/src/App.tsx`

- [ ] **Step 1: 重写 App.tsx，用 React state 替代侧边栏**

```tsx
import { useState } from 'react';
import { HomeScreen } from './components/HomeScreen';
import { ToolWorkspace } from './components/ToolWorkspace';
import { toolPackages } from './tools/registry';
import type { ClientToolPackage } from './tools/registry';

function App() {
  const [activeToolId, setActiveToolId] = useState<string | null>(null);

  const activeTool: ClientToolPackage | undefined = activeToolId
    ? toolPackages.find(p => p.meta.id === activeToolId)
    : undefined;

  if (activeToolId && activeTool) {
    return (
      <ToolWorkspace
        title={activeTool.meta.name}
        icon={activeTool.meta.icon}
        onBack={() => setActiveToolId(null)}
      >
        <activeTool.component />
      </ToolWorkspace>
    );
  }

  return <HomeScreen onSelectTool={setActiveToolId} />;
}

export default App;
```

- [ ] **Step 2: 验证编译**

Run: `cd client && npx tsc --noEmit 2>&1 | head -20`
Expected: No new errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/App.tsx
git commit -m "feat: rewrite App with HomeScreen/ToolWorkspace two-layer navigation"
```

---

### Task 6: 删除 Sidebar 组件

**Files:**
- Delete: `client/src/components/Sidebar.tsx`

- [ ] **Step 1: 删除 Sidebar.tsx**

Run: `rm client/src/components/Sidebar.tsx`

- [ ] **Step 2: 验证编译无残留引用**

Run: `cd client && npx tsc --noEmit 2>&1 | grep -i "sidebar" || echo "No sidebar references"`
Expected: "No sidebar references"

- [ ] **Step 3: Commit**

```bash
git rm client/src/components/Sidebar.tsx
git commit -m "refactor: remove Sidebar, replaced by HomeScreen"
```

---

### Task 7: TodoRow UI 翻新

**Files:**
- Modify: `client/src/tools/todo-summary/components/TodoRow.tsx`

- [ ] **Step 1: 更新 TodoRow 样式为暖纸风格**

关键改动（实际文件中逐处替换）：
- 行容器 `px-4 py-3 hover:bg-secondary/50 border-b border-border` → `px-4 py-3 hover:bg-warm-page border-b border-warm-border bg-warm-card`
- Checkbox `border-slate-400 hover:border-primary` → `border-warm-border hover:border-warm-primary`
- Checkbox checked `bg-primary border-primary` → `bg-warm-primary border-warm-primary`
- 拖拽手柄 `text-muted-foreground` → `text-warm-muted`
- 优先级点 `bg-[#DC2626]/bg-[#EAB308]/bg-[#9CA3AF]` → 保持原色（功能色）
- 展开区域 `border-primary/20 bg-secondary/20` → `border-warm-primary/20 bg-warm-secondary`
- 操作按钮 `text-muted-foreground` → `text-warm-muted hover:text-warm-text`
- 删除按钮 hover `bg-red-100 text-red-500` → `bg-red-50 text-red-400`

- [ ] **Step 2: 验证编译**

Run: `cd client && npx tsc --noEmit 2>&1 | head -5`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/tools/todo-summary/components/TodoRow.tsx
git commit -m "refactor: warm paper restyle for TodoRow"
```

---

### Task 8: TodoListView + DraggableTodoList UI 翻新

**Files:**
- Modify: `client/src/tools/todo-summary/components/TodoListView.tsx`
- Modify: `client/src/tools/todo-summary/components/DraggableTodoList.tsx`

- [ ] **Step 1: 更新 TodoListView 搜索栏和筛选器样式**

关键改动：
- 顶部操作栏 `border-b border-border` → `border-b border-warm-border`
- Tab 分段控件 `bg-secondary` → `bg-warm-secondary`，选中 `bg-background text-foreground shadow-sm` → `bg-warm-primary text-white shadow-sm`
- 搜索框 `bg-secondary` → `bg-white border border-warm-border`
- 标签 select `border-border` → `border-warm-border`
- 添加按钮 `bg-primary hover:bg-primary/90` → `bg-warm-primary hover:bg-warm-primary-hover`
- 空状态 `text-muted-foreground` → `text-warm-muted`

- [ ] **Step 2: 更新 DraggableTodoList 样式**

改动：
- 容器行 hover 时 `opacity-50` → 保持

- [ ] **Step 3: 验证编译**

Run: `cd client && npx tsc --noEmit 2>&1 | head -5`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add client/src/tools/todo-summary/components/TodoListView.tsx client/src/tools/todo-summary/components/DraggableTodoList.tsx
git commit -m "refactor: warm paper restyle for TodoListView and DraggableTodoList"
```

---

### Task 9: TodoForm UI 翻新

**Files:**
- Modify: `client/src/tools/todo-summary/components/TodoForm.tsx`

- [ ] **Step 1: 更新 TodoForm 样式**

关键改动：
- 遮罩 `bg-black/30` → `bg-black/20`
- 表单卡片 `bg-white rounded-lg shadow-xl` → `bg-warm-card rounded-warm-card shadow-warm-hover`
- 标题 `text-slate-700` → `text-warm-text`
- 输入框 `border rounded-md` → `border border-warm-border rounded-warm-btn focus:ring-2 focus:ring-warm-primary/20 focus:border-warm-primary`
- 标签选择未选中 `bg-slate-100 text-slate-600` → `bg-warm-secondary text-warm-text-secondary`
- 取消按钮 `bg-secondary hover:bg-accent` → `bg-warm-secondary hover:bg-warm-border`
- 提交按钮 `bg-primary hover:bg-primary/90` → `bg-warm-primary hover:bg-warm-primary-hover`
- 表单 label `text-slate-700` → `text-warm-text`

- [ ] **Step 2: 验证编译**

Run: `cd client && npx tsc --noEmit 2>&1 | head -5`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/tools/todo-summary/components/TodoForm.tsx
git commit -m "refactor: warm paper restyle for TodoForm"
```

---

### Task 10: WeekView + MonthView UI 翻新

**Files:**
- Modify: `client/src/tools/todo-summary/components/WeekView.tsx`
- Modify: `client/src/tools/todo-summary/components/MonthView.tsx`

- [ ] **Step 1: 更新 WeekView + MonthView 样式**

关键改动（两个文件共用模式）：
- 导航栏 `border-b border-border` → `border-b border-warm-border`
- 导航按钮 `hover:bg-secondary` → `hover:bg-warm-secondary`
- 日期单元格 `border border-border bg-background` → `border border-warm-border bg-white rounded-lg`
- 今日标记 `bg-accent` → `bg-warm-secondary`，日期数字 `text-primary` → `text-warm-primary`
- AI 按钮 `border-2 border-primary text-primary hover:bg-accent` → `border-2 border-warm-primary text-warm-primary hover:bg-warm-secondary`
- 统计栏 `bg-secondary` → `bg-warm-secondary`，进度条 `bg-primary` → `bg-warm-primary`
- MonthView 今日圆圈 `bg-primary text-primary-foreground` → `bg-warm-primary text-white`

- [ ] **Step 2: 验证编译**

Run: `cd client && npx tsc --noEmit 2>&1 | head -5`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/tools/todo-summary/components/WeekView.tsx client/src/tools/todo-summary/components/MonthView.tsx
git commit -m "refactor: warm paper restyle for WeekView and MonthView"
```

---

### Task 11: AiSummaryPanel + ReportTemplates UI 翻新

**Files:**
- Modify: `client/src/tools/todo-summary/components/AiSummaryPanel.tsx`
- Modify: `client/src/tools/todo-summary/components/ReportTemplates.tsx`

- [ ] **Step 1: 更新 AiSummaryPanel 样式**

关键改动：
- 面板 `bg-card border-l border-border` → `bg-warm-card border-l border-warm-border`
- 阴影 `shadow-[-4px_0_12px_rgba(0,0,0,0.08)]` → `shadow-[-4px_0_12px_rgba(139,115,85,0.08)]`
- 关闭按钮 `hover:bg-secondary` → `hover:bg-warm-secondary`
- 生成按钮 `bg-primary hover:bg-primary-hover` → `bg-warm-primary hover:bg-warm-primary-hover`
- 复制按钮 `bg-secondary hover:bg-accent` → `bg-warm-secondary hover:bg-warm-border`
- 内容区 `<pre>` 标签 → `<div>` 标签（正常排版）

- [ ] **Step 2: 更新 ReportTemplates 样式**

关键改动：
- 卡片 `bg-card border border-border` → `bg-warm-card border border-warm-border`
- 选中态 `border-primary ring-2 ring-primary/20` → `border-warm-primary ring-2 ring-warm-primary/20`
- 图标容器 `bg-accent` → `bg-warm-secondary`
- 编辑区 `bg-muted` → `bg-warm-secondary`
- 占位符按钮 `bg-primary/10 text-primary hover:bg-primary/20` → `bg-warm-primary/10 text-warm-primary hover:bg-warm-primary/20`
- 保存按钮 `bg-primary text-primary-foreground` → `bg-warm-primary text-white`

- [ ] **Step 3: 验证编译**

Run: `cd client && npx tsc --noEmit 2>&1 | head -5`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add client/src/tools/todo-summary/components/AiSummaryPanel.tsx client/src/tools/todo-summary/components/ReportTemplates.tsx
git commit -m "refactor: warm paper restyle for AiSummaryPanel and ReportTemplates"
```

---

### Task 12: todo-summary/index.tsx Tabs 翻新

**Files:**
- Modify: `client/src/tools/todo-summary/index.tsx`

- [ ] **Step 1: 更新 Tabs 样式**

关键改动：
- Tab 列表 `border-b border-border` → `border-b border-warm-border`
- Tab 触发器 `text-muted-foreground data-[state=active]:text-primary data-[state=active]:border-primary` → `text-warm-muted data-[state=active]:text-warm-primary data-[state=active]:border-warm-primary`

- [ ] **Step 2: 验证编译**

Run: `cd client && npx tsc --noEmit 2>&1 | head -5`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/tools/todo-summary/index.tsx
git commit -m "refactor: warm paper restyle for todo-summary Tabs"
```

---

### Task 13: 占位工具交互

**Files:**
- Modify: `client/src/components/HomeScreen.tsx`

- [ ] **Step 1: 添加占位工具点击提示**

占位图标已在 Task 3 中设置了 `disabled` 和 `cursor-default`。无需额外代码改动。

- [ ] **Step 2: 手动验证**

Run: `cd client && npm run dev`
打开浏览器：点击占位工具，确认无反应且光标为默认箭头样式。点击待办总结，确认正常进入。

- [ ] **Step 3: Commit**

```bash
git add client/src/components/HomeScreen.tsx
git commit -m "feat: placeholder tool cards with disabled state"
```

---

### Task 14: 动画和微交互

**Files:**
- Modify: `client/src/components/HomeScreen.tsx` — 过渡动画
- Modify: `client/src/App.tsx` — 视图切换动画

- [ ] **Step 1: 在 index.css 中添加视图过渡动画**

```css
@layer utilities {
  .animate-fade-in {
    animation: fadeIn 0.2s ease-out;
  }
  .animate-slide-up {
    animation: slideUp 0.25s ease-out;
  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
```

- [ ] **Step 2: 在 HomeScreen 中添加卡片入场动画**

在 HomeScreen 的图标网格中，给每个卡片添加 CSS animation-delay：

```tsx
{allTools.map((tool, i) => (
  <button
    key={tool.id}
    style={{ animationDelay: `${i * 60}ms` }}
    className={`animate-slide-up ...`}
    ...
  >
```

- [ ] **Step 3: 在 App.tsx 中添加视图切换过渡**

为 ToolWorkspace 包裹 `animate-fade-in` class。

- [ ] **Step 4: 验证视觉效果**

Run: `cd client && npm run dev`
打开浏览器：检查主屏卡片是否有错落入场动画，工具内部视图是否有淡入效果。

- [ ] **Step 5: Commit**

```bash
git add client/src/index.css client/src/components/HomeScreen.tsx client/src/App.tsx
git commit -m "feat: add view transition animations and card entrance effects"
```

---

### Task 15: 端到端验证

- [ ] **Step 1: 启动后端 + 前端**

```bash
# Terminal 1
cd server && npm run dev

# Terminal 2
cd client && npm run dev
```

- [ ] **Step 2: 验证清单**

| # | 验证项 | 预期 |
|---|--------|------|
| 1 | 打开 localhost:5173 | 看到主屏 3 个图标 |
| 2 | 点击待办总结 | 进入工具，顶部有返回按钮 |
| 3 | 点击返回 | 回到主屏 |
| 4 | 创建待办 | 表单暖色风格，功能正常 |
| 5 | 拖拽排序 | 拖拽正常，顺序持久化 |
| 6 | 展开待办 | 子待办显示正常 |
| 7 | 切换标签 | 待办/周视图/月视图/模板 正常 |
| 8 | 周/月视图 | 日历显示正常，导航正常 |
| 9 | AI 总结 | 生成/复制/重新生成 正常 |
| 10 | 模板编辑 | 选择/编辑/保存 正常 |
| 11 | 占位图标 | 点击无反应 |
| 12 | 整体视觉 | 暖纸配色一致，无残留旧颜色 |

- [ ] **Step 3: 修复发现的问题（如有）**

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: final verification fixes"
```
