import { useEffect } from 'react';
import type { Todo } from '@shared/types';
import { useTodoContext } from '../context';
import { useApi } from '@/hooks/useApi';
import { TodoItem } from './TodoItem';

export function TodoList() {
  const { filter, refreshKey, refresh } = useTodoContext();
  const { data: todos, loading, request } = useApi<Todo[]>();

  useEffect(() => {
    request(`/api/todo-summary/todos?status=${filter}`);
  }, [filter, refreshKey]);

  const handleQuickAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.elements.namedItem('quickTitle') as HTMLInputElement;
    if (!input.value.trim()) return;
    await request('/api/todo-summary/todos', {
      method: 'POST',
      body: JSON.stringify({ title: input.value.trim() }),
    });
    input.value = '';
    refresh();
  };

  return (
    <div className="max-w-3xl mx-auto p-4">
      {/* 快速添加 */}
      <form onSubmit={handleQuickAdd} className="flex gap-2 mb-4">
        <input
          name="quickTitle"
          placeholder="添加新待办..."
          className="flex-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
        />
        <button type="submit" className="px-4 py-2 bg-sky-500 text-white rounded-md text-sm font-medium hover:bg-sky-600">添加</button>
      </form>

      {/* 待办列表 */}
      <div className="space-y-0.5">
        {loading ? (
          <p className="text-sm text-slate-400 text-center py-8">加载中...</p>
        ) : !todos?.length ? (
          <p className="text-sm text-slate-400 text-center py-8">暂无待办事项</p>
        ) : (
          todos.map(todo => <TodoItem key={todo.id} todo={todo} />)
        )}
      </div>
    </div>
  );
}
