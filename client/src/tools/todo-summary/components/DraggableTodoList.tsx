import { useState, useRef } from 'react';
import type { Todo } from '@shared/types';
import { useTodoContext } from '../context';
import { useApi } from '@/hooks/useApi';
import { TodoRow } from './TodoRow';

interface Props {
  todos: Todo[];
  onEdit: (todo: Todo) => void;
  onAddSub: (todo: Todo) => void;
}

export function DraggableTodoList({ todos, onEdit, onAddSub }: Props) {
  const [items, setItems] = useState(todos);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const { refresh } = useTodoContext();
  const { request } = useApi();

  // Sync when external todos change (only if ID order differs)
  if (todos.length > 0 && JSON.stringify(todos.map(t => t.id)) !== JSON.stringify(items.map(t => t.id))) {
    setItems(todos);
  }

  const handleDragStart = (index: number) => {
    dragItem.current = index;
  };

  const handleDragEnter = (index: number) => {
    dragOverItem.current = index;
  };

  const handleDragEnd = async () => {
    const from = dragItem.current;
    const to = dragOverItem.current;
    if (from === null || to === null || from === to) {
      dragItem.current = null;
      dragOverItem.current = null;
      return;
    }

    const newItems = [...items];
    const [moved] = newItems.splice(from, 1);
    newItems.splice(to, 0, moved);
    setItems(newItems);

    const reorderData = newItems.map((item, idx) => ({ id: item.id, sort_order: idx }));
    await request('/api/todo-summary/todos/reorder', {
      method: 'PUT',
      body: JSON.stringify({ items: reorderData }),
    });
    refresh();

    dragItem.current = null;
    dragOverItem.current = null;
  };

  return (
    <div className="flex-1 overflow-auto">
      {items.map((todo, index) => (
        <div
          key={todo.id}
          className={dragItem.current === index ? 'opacity-50' : ''}
        >
          <TodoRow
            todo={todo}
            index={index}
            onEdit={() => onEdit(todo)}
            onAddSub={() => onAddSub(todo)}
            onDragStart={handleDragStart}
            onDragEnter={handleDragEnter}
            onDragEnd={handleDragEnd}
          />
        </div>
      ))}
    </div>
  );
}
