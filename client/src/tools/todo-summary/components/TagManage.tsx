import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import type { Tag } from '@shared/types';
import { useApi } from '@/hooks/useApi';

interface Props {
  onClose: () => void;
}

const PRESET_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#6366f1',
];

export function TagManage({ onClose }: Props) {
  const { data: tags, request } = useApi<Tag[]>();
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);

  const loadTags = () => request('/api/todo-summary/tags');

  useEffect(() => { loadTags(); }, []);

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    'x-auth-password': sessionStorage.getItem('auth_password') || '',
  });

  const handleAdd = async () => {
    if (!newName.trim()) return;
    // 用原生 fetch 做 POST，避免 response（单个 Tag 对象）污染 useApi 中 Tag[] 类型的 state
    await fetch('/api/todo-summary/tags', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ name: newName.trim(), color: newColor }),
    });
    setNewName('');
    loadTags();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除此标签？已有待办不受影响。')) return;
    await fetch(`/api/todo-summary/tags/${id}`, { method: 'DELETE', headers: authHeaders() });
    loadTags();
  };

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
      <div className="bg-warm-card rounded-warm-card shadow-warm-hover w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-warm-text">标签管理</h3>
          <button onClick={onClose} className="p-1 hover:bg-warm-secondary rounded">
            <X className="w-4 h-4 text-warm-muted" />
          </button>
        </div>

        {/* 新建标签 */}
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="标签名称"
            className="flex-1 px-3 py-2 border border-warm-border rounded-warm-btn text-sm bg-white outline-none focus:ring-2 focus:ring-warm-primary/20 focus:border-warm-primary"
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <button
            onClick={handleAdd}
            disabled={!newName.trim()}
            className="px-3 py-2 bg-warm-primary text-white rounded-warm-btn text-sm hover:bg-warm-primary-hover disabled:opacity-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* 预设颜色 */}
        <div className="flex gap-1.5 flex-wrap">
          {PRESET_COLORS.map(c => (
            <button
              key={c}
              onClick={() => setNewColor(c)}
              className={`w-6 h-6 rounded-full transition-transform ${newColor === c ? 'ring-2 ring-offset-1 ring-warm-primary scale-110' : ''}`}
              style={{ background: c }}
            />
          ))}
        </div>

        {/* 现有标签列表 */}
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {(!tags || tags.length === 0) && (
            <p className="text-xs text-warm-muted text-center py-4">暂无标签</p>
          )}
          {(tags || []).map(tag => (
            <div key={tag.id} className="flex items-center gap-3 px-3 py-2 bg-warm-secondary rounded-lg">
              <div className="w-4 h-4 rounded-full shrink-0" style={{ background: tag.color }} />
              <span className="flex-1 text-sm text-warm-text">{tag.name}</span>
              <span className="text-xs text-warm-muted">{tag.todo_count || 0}</span>
              <button
                onClick={() => handleDelete(tag.id)}
                className="p-1 hover:bg-red-100 rounded text-warm-muted hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
