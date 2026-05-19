import { useState, useEffect } from 'react';
import { GripVertical, Search, ChevronDown, ChevronRight, Plus, Tags } from 'lucide-react';
import * as Checkbox from '@radix-ui/react-checkbox';
import type { Todo, Tag } from '@shared/types';
import { useTodoContext } from '../context';
import { useApi } from '@/hooks/useApi';
import { TodoForm } from './TodoForm';

export function TodoListView() {
  const { refreshKey, refresh } = useTodoContext();
  const { data: todos, request } = useApi<Todo[]>();
  const { data: tags } = useApi<Tag[]>();
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  useEffect(() => {
    const params = new URLSearchParams();
    if (tagFilter) params.set('tag_id', tagFilter);
    request(`/api/todo-summary/todos?${params}`);
  }, [refreshKey, tagFilter]);

  const toggleExpand = (id: number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filtered = (todos || []).filter(t =>
    search ? t.title.toLowerCase().includes(search.toLowerCase()) : true
  );

  const allTags = tags || [];

  return (
    <div className="flex flex-col h-full">
      {/* 搜索、筛选、添加栏 */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
        <div className="flex items-center gap-2 flex-1 bg-secondary rounded-lg px-3 py-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="搜索待办..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent outline-none text-sm"
          />
        </div>
        <select
          value={tagFilter}
          onChange={e => setTagFilter(e.target.value)}
          className="px-3 py-2 border border-border rounded-lg text-sm bg-background"
        >
          <option value="">所有标签</option>
          {allTags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <button
          onClick={() => useTodoContext().refresh()}
          className="p-2 hover:bg-secondary rounded-lg text-muted-foreground"
          title="管理标签"
        >
          <Tags className="w-4 h-4" />
        </button>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-primary hover:bg-primary-hover text-primary-foreground rounded-lg text-sm flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          添加待办
        </button>
      </div>

      {/* 待办列表 */}
      <div className="flex-1 overflow-auto">
        {filtered.map((todo) => (
          <TodoRow
            key={todo.id}
            todo={todo}
            expanded={expanded.has(todo.id)}
            onToggleExpand={() => toggleExpand(todo.id)}
          />
        ))}
        {filtered.length === 0 && (
          <div className="text-center text-muted-foreground py-12 text-sm">暂无待办事项</div>
        )}
      </div>

      {showForm && <TodoForm onClose={() => { setShowForm(false); refresh(); }} />}
    </div>
  );
}

const priorityColors: Record<string, string> = { '高': 'bg-[#DC2626]', '中': 'bg-[#EAB308]', '低': 'bg-[#9CA3AF]' };

function TodoRow({ todo, expanded, onToggleExpand }: { todo: Todo; expanded: boolean; onToggleExpand: () => void }) {
  const { refresh } = useTodoContext();
  const { request } = useApi();

  const toggleComplete = async () => {
    await request(`/api/todo-summary/todos/${todo.id}`, {
      method: 'PUT',
      body: JSON.stringify({ completed: todo.completed ? 0 : 1 }),
    });
    refresh();
  };

  const toggleSubComplete = async (childId: number, currentCompleted: number) => {
    await request(`/api/todo-summary/todos/${childId}`, {
      method: 'PUT',
      body: JSON.stringify({ completed: currentCompleted ? 0 : 1 }),
    });
    refresh();
  };

  const hasChildren = !!todo.children?.length;

  return (
    <div>
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors border-b border-border">
        <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
        <Checkbox.Root
          checked={todo.completed === 1}
          onCheckedChange={toggleComplete}
          className="w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center data-[state=checked]:bg-primary shrink-0"
        >
          <Checkbox.Indicator>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Checkbox.Indicator>
        </Checkbox.Root>

        {hasChildren && (
          <button onClick={onToggleExpand} className="p-0.5 hover:bg-accent rounded">
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        )}
        {!hasChildren && <div className="w-5" />}

        <div className={`flex-1 text-sm ${todo.completed ? 'line-through text-muted-foreground' : ''}`}>
          {todo.title}
        </div>

        {!!todo.tags?.length && todo.tags.map(t => (
          <span
            key={t.id}
            className="px-3 py-1 rounded-full text-xs text-white"
            style={{ background: t.color }}
          >
            {t.name}
          </span>
        ))}

        <div className={`w-2 h-2 rounded-full ${priorityColors[todo.priority] || 'bg-slate-400'}`} />
        {todo.due_date && (
          <span className="text-sm text-muted-foreground min-w-[60px] text-right">
            {todo.due_date.slice(5)}
          </span>
        )}
      </div>

      {/* 子待办列表 */}
      {expanded && hasChildren && (
        <div className="ml-14 border-l-2 border-primary/20">
          {todo.children!.map(child => (
            <div key={child.id} className="flex items-center gap-3 px-4 py-2 hover:bg-secondary/30 transition-colors">
              <Checkbox.Root
                checked={child.completed === 1}
                onCheckedChange={() => toggleSubComplete(child.id, child.completed)}
                className="w-4 h-4 rounded-full border-2 border-primary flex items-center justify-center data-[state=checked]:bg-primary"
              >
                <Checkbox.Indicator>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M8 2.5L4 6.5L2 4.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Checkbox.Indicator>
              </Checkbox.Root>
              <span className={`text-sm ${child.completed ? 'line-through text-muted-foreground' : ''}`}>
                {child.title}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
