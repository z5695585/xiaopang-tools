import { useState, useEffect } from 'react';
import { Search, Plus } from 'lucide-react';
import type { Todo } from '@shared/types';
import { useTodoContext } from '../context';
import { useApi } from '@/hooks/useApi';
import { TodoForm } from './TodoForm';
import { DraggableTodoList } from './DraggableTodoList';
import { TagManage } from './TagManage';

type FilterTab = 'all' | 'active' | 'completed';

export function TodoListView() {
  const { refreshKey, refresh } = useTodoContext();
  const { data: todos, request } = useApi<Todo[]>();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<FilterTab>('all');
  const [showForm, setShowForm] = useState(false);
  const [editTodo, setEditTodo] = useState<Todo | null>(null);
  const [addSubFor, setAddSubFor] = useState<Todo | null>(null);
  const [showTagManage, setShowTagManage] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set('status', tab);
    request(`/api/todo-summary/todos?${params}`);
  }, [refreshKey, tab]);

  const filtered = (todos || []).filter(t =>
    search ? t.title.toLowerCase().includes(search.toLowerCase()) : true
  );

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'active', label: '待完成' },
    { key: 'completed', label: '已完成' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* 顶部操作栏 */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-warm-border">
        {/* 全部/待完成/已完成 */}
        <div className="flex bg-warm-secondary rounded-lg p-0.5">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                tab === t.key ? 'bg-warm-primary text-white shadow-sm' : 'text-warm-muted hover:text-warm-text'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* 搜索 */}
        <div className="flex items-center gap-2 flex-1 bg-white border border-warm-border rounded-lg px-3 py-2">
          <Search className="w-4 h-4 text-warm-muted" />
          <input
            type="text"
            placeholder="搜索待办..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent outline-none text-sm"
          />
        </div>

        <button
          onClick={() => setShowTagManage(true)}
          className="px-3 py-2 border border-warm-border rounded-lg text-xs text-warm-text-secondary hover:bg-warm-secondary transition-colors shrink-0"
        >
          管理标签
        </button>

        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-warm-primary hover:bg-warm-primary-hover text-white rounded-lg text-sm flex items-center gap-2 transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          添加待办
        </button>
      </div>

      {/* 待办列表 */}
      {filtered.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-warm-muted text-sm">
          {tab === 'completed' ? '暂无已完成事项' : '暂无待办事项'}
        </div>
      ) : (
        <DraggableTodoList
          todos={filtered}
          onEdit={setEditTodo}
          onEditSub={setEditTodo}
          onAddSub={setAddSubFor}
        />
      )}

      {/* 标签管理 */}
      {showTagManage && <TagManage onClose={() => { setShowTagManage(false); refresh(); }} />}

      {/* 新建/编辑/添加子待办 表单 */}
      {(showForm || editTodo || addSubFor) && (
        <TodoForm
          todo={editTodo || undefined}
          parentId={addSubFor ? addSubFor.id : undefined}
          onClose={() => {
            setShowForm(false);
            setEditTodo(null);
            setAddSubFor(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}
