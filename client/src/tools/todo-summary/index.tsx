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
          {(['all', 'active', 'completed'] as const).map(f => (
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
