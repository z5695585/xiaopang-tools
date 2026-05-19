import { useState } from 'react';
import { GripVertical, ChevronDown, ChevronRight, Plus, Trash2, Pencil } from 'lucide-react';
import * as Checkbox from '@radix-ui/react-checkbox';
import type { Todo } from '@shared/types';
import { useTodoContext } from '../context';
import { useApi } from '@/hooks/useApi';

const priorityColors: Record<string, string> = { '高': 'bg-[#DC2626]', '中': 'bg-[#EAB308]', '低': 'bg-[#9CA3AF]' };

interface Props {
  todo: Todo;
  onEdit: () => void;
  onAddSub: () => void;
}

export function TodoRow({ todo, onEdit, onAddSub }: Props) {
  const { refresh } = useTodoContext();
  const { request } = useApi();
  const [expanded, setExpanded] = useState(false);
  const hasChildren = !!todo.children?.length;

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

  const handleDelete = async () => {
    if (!confirm('确定删除此待办？')) return;
    await request(`/api/todo-summary/todos/${todo.id}`, { method: 'DELETE' });
    refresh();
  };

  return (
    <div>
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors border-b border-border group">
        <div className="cursor-grab text-muted-foreground shrink-0 drag-handle">
          <GripVertical className="w-4 h-4" />
        </div>

        <Checkbox.Root
          checked={todo.completed === 1}
          onCheckedChange={toggleComplete}
          className="w-5 h-5 rounded-full border-[1.5px] border-slate-400 hover:border-primary flex items-center justify-center data-[state=checked]:bg-primary data-[state=checked]:border-primary shrink-0 transition-colors"
        >
          <Checkbox.Indicator forceMount className="data-[state=unchecked]:hidden">
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Checkbox.Indicator>
        </Checkbox.Root>

        <button onClick={() => setExpanded(!expanded)} className="p-1 hover:bg-accent rounded shrink-0">
          {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </button>

        <button onClick={() => setExpanded(!expanded)} className="flex-1 text-left">
          <span className={`text-sm ${todo.completed ? 'line-through text-muted-foreground' : ''}`}>
            {todo.title}
          </span>
        </button>

        {!!todo.tags?.length && todo.tags.map(t => (
          <span key={t.id} className="px-2.5 py-0.5 rounded-full text-xs text-white shrink-0" style={{ background: t.color }}>
            {t.name}
          </span>
        ))}

        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${priorityColors[todo.priority] || 'bg-slate-400'}`} title={todo.priority} />

        {todo.due_date && (
          <span className="text-xs text-muted-foreground min-w-[60px] text-right shrink-0">
            {todo.due_date.slice(5)}
          </span>
        )}

        {hasChildren && (
          <span className="text-xs text-muted-foreground shrink-0">{todo.children!.length}子项</span>
        )}

        <button onClick={onAddSub} className="shrink-0 opacity-0 group-hover:opacity-100 p-1 hover:bg-accent rounded text-muted-foreground" title="添加子待办">
          <Plus className="w-3.5 h-3.5" />
        </button>
        <button onClick={onEdit} className="shrink-0 opacity-0 group-hover:opacity-100 p-1 hover:bg-accent rounded text-muted-foreground" title="编辑">
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button onClick={handleDelete} className="shrink-0 opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded text-muted-foreground hover:text-red-500" title="删除">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {expanded && (
        <div className="ml-14 border-l-2 border-primary/20 bg-secondary/20 px-4 py-2 space-y-1">
          {todo.description && (
            <p className="text-sm text-muted-foreground py-1">{todo.description}</p>
          )}
          {hasChildren && todo.children!.map(child => (
            <div key={child.id} className="flex items-center gap-3 py-1.5">
              <Checkbox.Root
                checked={child.completed === 1}
                onCheckedChange={() => toggleSubComplete(child.id, child.completed)}
                className="w-4 h-4 rounded-full border-[1.5px] border-slate-400 hover:border-primary flex items-center justify-center data-[state=checked]:bg-primary data-[state=checked]:border-primary shrink-0 transition-colors"
              >
                <Checkbox.Indicator forceMount className="data-[state=unchecked]:hidden">
                  <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                    <path d="M8 2.5L4 6.5L2 4.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Checkbox.Indicator>
              </Checkbox.Root>
              <span className={`text-sm ${child.completed ? 'line-through text-muted-foreground' : ''}`}>
                {child.title}
              </span>
              {child.priority && <div className={`w-2 h-2 rounded-full ${priorityColors[child.priority] || 'bg-slate-400'}`} />}
            </div>
          ))}
          <button onClick={onAddSub} className="text-xs text-primary hover:underline flex items-center gap-1 py-1">
            <Plus className="w-3 h-3" />添加子待办
          </button>
        </div>
      )}
    </div>
  );
}
