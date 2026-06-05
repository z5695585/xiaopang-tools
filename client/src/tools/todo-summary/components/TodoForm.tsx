import { useState, useEffect } from 'react';
import type { Todo, Tag } from '@shared/types';
import { useTodoContext } from '../context';
import { useApi } from '@/hooks/useApi';

interface Props {
  todo?: Todo | null;
  parentId?: number | null;
  parentTodo?: Todo | null;
  onClose: () => void;
}

export function TodoForm({ todo, parentId, parentTodo, onClose }: Props) {
  const { refresh } = useTodoContext();
  const { data: tags, request: loadTags } = useApi<Tag[]>();
  const { request } = useApi<Todo>();

  const [title, setTitle] = useState(todo?.title || '');
  const [description, setDescription] = useState(todo?.description || '');
  const [priority, setPriority] = useState<string>(todo?.priority || '中');
  const [dueDate, setDueDate] = useState(todo?.due_date?.slice(0, 10) || parentTodo?.due_date?.slice(0, 10) || '');
  const [selectedTags, setSelectedTags] = useState<number[]>(
    todo?.tags?.map(t => t.id) || parentTodo?.tags?.map(t => t.id) || []
  );
  const [isRisk, setIsRisk] = useState(!!todo?.is_risk);
  const [isFocus, setIsFocus] = useState(!!todo?.is_focus);
  const [error, setError] = useState('');

  useEffect(() => { loadTags('/api/todo-summary/tags'); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!title.trim()) {
      setError('请填写标题');
      return;
    }
    if (!dueDate) {
      setError('请选择截止日期');
      return;
    }
    if (selectedTags.length === 0) {
      setError('请至少选择一个标签');
      return;
    }

    const body: any = {
      title: title.trim(),
      description,
      priority,
      due_date: dueDate || null,
      tag_ids: selectedTags,
      is_risk: isRisk ? 1 : 0,
      is_focus: isFocus ? 1 : 0,
    };
    if (parentId) body.parent_id = parentId;

    if (todo) {
      await request(`/api/todo-summary/todos/${todo.id}`, { method: 'PUT', body: JSON.stringify(body) });
    } else {
      await request('/api/todo-summary/todos', { method: 'POST', body: JSON.stringify(body) });
    }
    refresh();
    onClose();
  };

  const toggleTag = (tagId: number) => {
    setSelectedTags(prev => prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]);
  };

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
      <form onSubmit={handleSubmit} className="bg-warm-card rounded-warm-card shadow-warm-hover w-full max-w-lg p-6 space-y-4 max-h-[80vh] overflow-y-auto">
        <h3 className="font-semibold text-lg">{todo ? '编辑待办' : parentId ? '添加子待办' : '新建待办'}</h3>

        {!todo && parentTodo && (
          <div className="px-3 py-2 rounded-md bg-warm-secondary text-xs text-warm-muted">
            已继承父任务的截止日期和标签，可按需调整。
          </div>
        )}

        {error && (
          <div className="px-3 py-2 rounded-md bg-red-50 border border-red-200 text-sm text-red-600">
            {error}
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-warm-text">标题</label>
          <input value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3 py-2 border border-warm-border rounded-warm-btn focus:ring-2 focus:ring-warm-primary/20 focus:border-warm-primary outline-none text-sm mt-1" placeholder="待办标题" required />
        </div>

        <div>
          <label className="text-sm font-medium text-warm-text">描述</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full px-3 py-2 border border-warm-border rounded-warm-btn focus:ring-2 focus:ring-warm-primary/20 focus:border-warm-primary outline-none text-sm mt-1" rows={3} placeholder="详细描述（可选）" />
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium text-warm-text">优先级</label>
            <select value={priority} onChange={e => setPriority(e.target.value)} className="w-full px-3 py-2 border border-warm-border rounded-warm-btn focus:ring-2 focus:ring-warm-primary/20 focus:border-warm-primary outline-none text-sm mt-1">
              <option value="高">高</option>
              <option value="中">中</option>
              <option value="低">低</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium text-warm-text">截止日期</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full px-3 py-2 border border-warm-border rounded-warm-btn focus:ring-2 focus:ring-warm-primary/20 focus:border-warm-primary outline-none text-sm mt-1" required />
          </div>
        </div>


        <div>
          <label className="text-sm font-medium text-warm-text">标签</label>
          <div className="flex gap-1.5 mt-1 flex-wrap">
            {(tags || []).map(tag => (
              <button
                type="button"
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                  selectedTags.includes(tag.id) ? 'text-white' : 'text-warm-text-secondary bg-warm-secondary hover:bg-warm-border'
                }`}
                style={selectedTags.includes(tag.id) ? { background: tag.color } : undefined}
              >
                {tag.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isRisk} onChange={e => setIsRisk(e.target.checked)} /> ⚠ 标记风险
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isFocus} onChange={e => setIsFocus(e.target.checked)} /> ★ 重点关注
          </label>
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-md bg-warm-secondary hover:bg-warm-border text-warm-text">取消</button>
          <button type="submit" className="px-4 py-2 text-sm text-white bg-warm-primary rounded-md hover:bg-warm-primary-hover">{todo ? '保存' : '创建'}</button>
        </div>
      </form>
    </div>
  );
}
