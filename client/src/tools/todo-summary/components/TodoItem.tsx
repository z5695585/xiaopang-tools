import { useState } from 'react';
import type { Todo } from '@shared/types';
import { useTodoContext } from '../context';
import { useApi } from '@/hooks/useApi';

interface Props {
  todo: Todo;
  isChild?: boolean;
}

export function TodoItem({ todo, isChild }: Props) {
  const [expanded, setExpanded] = useState(false);
  const { refresh } = useTodoContext();
  const { request } = useApi();

  const toggleComplete = async () => {
    await request(`/api/todo-summary/todos/${todo.id}`, {
      method: 'PUT',
      body: JSON.stringify({ completed: todo.completed ? 0 : 1 }),
    });
    refresh();
  };

  const handleDelete = async () => {
    if (!confirm('确定删除？')) return;
    await request(`/api/todo-summary/todos/${todo.id}`, { method: 'DELETE' });
    refresh();
  };

  const priorityColors: Record<string, string> = { '高': 'bg-red-500', '中': 'bg-amber-500', '低': 'bg-slate-400' };

  return (
    <div className={`${isChild ? 'ml-6' : ''}`}>
      <div className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-slate-50 group">
        <input type="checkbox" checked={todo.completed === 1} onChange={toggleComplete} className="shrink-0" />
        <button onClick={() => setExpanded(!expanded)} className="flex-1 text-left">
          <span className={`text-sm ${todo.completed ? 'line-through text-slate-400' : ''}`}>{todo.title}</span>
        </button>
        {todo.priority && (
          <span className={`text-xs text-white px-1.5 py-0.5 rounded ${priorityColors[todo.priority] || 'bg-slate-400'}`}>{todo.priority}</span>
        )}
        {todo.due_date && <span className="text-xs text-slate-400">{todo.due_date.slice(0, 10)}</span>}
        {!!todo.tags?.length && (
          <div className="flex gap-1">
            {todo.tags.map(t => (
              <span key={t.id} className="text-xs px-1.5 py-0.5 rounded" style={{ background: t.color + '20', color: t.color }}>{t.name}</span>
            ))}
          </div>
        )}
        {!!todo.children?.length && !isChild && (
          <span className="text-xs text-slate-400">{todo.children.length} 子项</span>
        )}
        {todo.is_risk ? <span className="text-xs text-red-500" title="风险">⚠</span> : null}
        {todo.is_focus ? <span className="text-xs text-purple-500" title="重点关注">★</span> : null}
        <button onClick={handleDelete} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 text-xs">🗑</button>
      </div>

      {expanded && !isChild && (
        <div className="ml-8 mb-2">
          {todo.description && <p className="text-sm text-slate-500 mb-2">{todo.description}</p>}
          {todo.children?.map(child => (
            <TodoItem key={child.id} todo={child} isChild />
          ))}
          <AddSubTodo parentId={todo.id} />
        </div>
      )}
    </div>
  );
}

function AddSubTodo({ parentId }: { parentId: number }) {
  const [title, setTitle] = useState('');
  const { refresh } = useTodoContext();
  const { request } = useApi();

  const handleAdd = async () => {
    if (!title.trim()) return;
    await request('/api/todo-summary/todos', {
      method: 'POST',
      body: JSON.stringify({ title: title.trim(), parent_id: parentId }),
    });
    setTitle('');
    refresh();
  };

  return (
    <form onSubmit={e => { e.preventDefault(); handleAdd(); }} className="flex gap-1 mt-1">
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="添加子待办..." className="flex-1 px-2 py-1 border rounded text-xs" />
      <button type="submit" className="text-xs text-sky-500 hover:text-sky-600">添加</button>
    </form>
  );
}
