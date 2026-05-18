import { useState, useEffect } from 'react';
import type { Tag } from '@shared/types';
import { useTodoContext } from '../context';
import { useApi } from '@/hooks/useApi';

const PRESET_COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export function TagManage() {
  const { refreshKey, refresh } = useTodoContext();
  const { data: tags, request } = useApi<Tag[]>();
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');

  useEffect(() => { request('/api/todo-summary/tags'); }, [refreshKey]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    await request('/api/todo-summary/tags', { method: 'POST', body: JSON.stringify({ name: newName, color: newColor }) });
    setNewName('');
    setNewColor(PRESET_COLORS[0]);
    refresh();
  };

  const handleUpdate = async (id: number, name: string, color: string) => {
    await request(`/api/todo-summary/tags/${id}`, { method: 'PUT', body: JSON.stringify({ name, color }) });
    setEditingId(null);
    refresh();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除此标签？关联的待办将不再有此标签。')) return;
    await request(`/api/todo-summary/tags/${id}`, { method: 'DELETE' });
    refresh();
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <h2 className="text-lg font-semibold">🏷 标签管理</h2>

      <form onSubmit={handleCreate} className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="text-sm font-medium text-slate-700">标签名称</label>
          <input value={newName} onChange={e => setNewName(e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm mt-1" placeholder="项目名称" />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">颜色</label>
          <div className="flex gap-1 mt-1">
            {PRESET_COLORS.map(c => (
              <button type="button" key={c} onClick={() => setNewColor(c)}
                className={`w-7 h-7 rounded-full border-2 ${newColor === c ? 'border-slate-800 scale-110' : 'border-transparent'}`}
                style={{ background: c }} />
            ))}
          </div>
        </div>
        <button type="submit" className="px-4 py-2 bg-sky-500 text-white rounded-md text-sm hover:bg-sky-600 h-fit">添加</button>
      </form>

      <div className="space-y-2">
        {(tags || []).map(tag => (
          <div key={tag.id} className="flex items-center gap-3 p-3 bg-white border rounded-md">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ background: tag.color }} />
            {editingId === tag.id ? (
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onBlur={() => handleUpdate(tag.id, editName, tag.color)}
                onKeyDown={e => e.key === 'Enter' && handleUpdate(tag.id, editName, tag.color)}
                className="flex-1 px-2 py-1 border rounded text-sm"
                autoFocus
              />
            ) : (
              <span className="flex-1 text-sm" onDoubleClick={() => { setEditingId(tag.id); setEditName(tag.name); }}>
                {tag.name}
              </span>
            )}
            <span className="text-xs text-slate-400">{tag.todo_count || 0} 个待办</span>
            <button onClick={() => handleDelete(tag.id)} className="text-xs text-slate-400 hover:text-red-500">删除</button>
          </div>
        ))}
      </div>
    </div>
  );
}
