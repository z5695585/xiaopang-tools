import { useState, useEffect } from 'react';
import type { Template } from '@shared/types';
import { useTodoContext } from '../context';
import { useApi } from '@/hooks/useApi';

const PLACEHOLDER_HELP = [
  { key: '{{week_range}}', desc: '时间范围，如 "2026-05-11 ~ 2026-05-17"' },
  { key: '{{completed}}', desc: '已完成项，按项目分组列出' },
  { key: '{{pending}}', desc: '未完成项，按项目分组列出' },
  { key: '{{risks}}', desc: '风险项（手动标记 + AI 推断）' },
  { key: '{{focus}}', desc: '重点关注项（手动标记 + AI 推断）' },
  { key: '{{ai_summary}}', desc: 'AI 生成的综合总结段落' },
];

export function TemplateSettings() {
  const { setView, refreshKey, refresh } = useTodoContext();
  const { data: templates, request } = useApi<Template[]>();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [content, setContent] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => { request('/api/todo-summary/templates'); }, [refreshKey]);

  const selected = (templates || []).find(t => t.id === selectedId);

  useEffect(() => {
    if (selected) setContent(selected.content);
  }, [selected]);

  const handleSave = async () => {
    if (!selected || !content.trim()) return;
    await request(`/api/todo-summary/templates/${selected.id}`, { method: 'PUT', body: JSON.stringify({ content }) });
    refresh();
  };

  const insertPlaceholder = (key: string) => {
    setContent(prev => prev + key);
  };

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <h2 className="text-lg font-semibold">⚙ 模板设置</h2>

      <div className="flex gap-2 flex-wrap">
        {(templates || []).map(tpl => (
          <button key={tpl.id} onClick={() => setSelectedId(tpl.id)}
            className={`px-3 py-1.5 rounded-md text-sm ${selectedId === tpl.id ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {tpl.name} {tpl.is_default ? '(默认)' : ''}
          </button>
        ))}
      </div>

      {selected && (
        <div className="space-y-3">
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            className="w-full h-64 px-3 py-2 border rounded-md text-sm font-mono"
            placeholder="编辑模板内容..."
          />
          <div className="flex gap-2">
            <button onClick={handleSave} className="px-4 py-2 bg-sky-500 text-white rounded-md text-sm hover:bg-sky-600">保存</button>
            <button onClick={() => setShowHelp(!showHelp)} className="px-4 py-2 text-sm text-slate-600 bg-slate-100 rounded-md hover:bg-slate-200">
              {showHelp ? '隐藏' : '显示'}占位符帮助
            </button>
          </div>
        </div>
      )}

      {showHelp && (
        <div className="bg-slate-50 border rounded-md p-4">
          <h4 className="text-sm font-semibold mb-2">可用占位符</h4>
          <div className="space-y-2">
            {PLACEHOLDER_HELP.map(ph => (
              <div key={ph.key} className="flex items-center gap-2">
                <button onClick={() => insertPlaceholder(ph.key)} className="text-xs font-mono bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded hover:bg-purple-200">
                  {ph.key}
                </button>
                <span className="text-xs text-slate-500">{ph.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button onClick={() => setView('list')} className="text-sm text-slate-500 hover:text-sky-500">← 返回待办列表</button>
    </div>
  );
}
