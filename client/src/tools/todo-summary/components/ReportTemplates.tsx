import { useState, useEffect } from 'react';
import { FileText, BarChart3, Calendar } from 'lucide-react';
import type { Template } from '@shared/types';
import { useTodoContext } from '../context';
import { useApi } from '@/hooks/useApi';

const PLACEHOLDER_HELP = [
  { key: '{{week_range}}', desc: '时间范围' },
  { key: '{{completed}}', desc: '已完成项，按项目分组' },
  { key: '{{pending}}', desc: '未完成项，按项目分组' },
  { key: '{{risks}}', desc: '风险项' },
  { key: '{{focus}}', desc: '重点关注项' },
  { key: '{{ai_summary}}', desc: 'AI 综合总结段落' },
];

const templateIcons: Record<number, typeof FileText> = {
  0: FileText,
  1: BarChart3,
  2: Calendar,
};

export function ReportTemplates() {
  const { refreshKey, refresh } = useTodoContext();
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

  const insertPlaceholder = (key: string) => setContent(prev => prev + key);

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="px-6 py-6">
        {/* 模板卡片 */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {(templates || []).map((tpl, i) => {
            const Icon = templateIcons[i % 3] || FileText;
            return (
              <div
                key={tpl.id}
                onClick={() => setSelectedId(tpl.id)}
                className={`bg-warm-card border rounded-xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer ${
                  selectedId === tpl.id ? 'border-warm-primary ring-2 ring-warm-primary/20' : 'border-warm-border'
                }`}
              >
                <div className="w-12 h-12 bg-warm-secondary rounded-lg flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-medium mb-2 text-sm">{tpl.name}</h3>
                <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                  {tpl.is_default ? '系统默认模板，不可删除' : '自定义模板'}
                </p>
                {tpl.is_default ? (
                  <span className="text-xs text-primary font-medium">默认</span>
                ) : (
                  <button
                    onClick={e => { e.stopPropagation(); /* delete logic */ }}
                    className="text-xs text-destructive hover:underline"
                  >
                    删除
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* 编辑区 */}
        {selected && (
          <div className="bg-warm-secondary rounded-xl p-6">
            <h3 className="font-medium mb-4 text-sm">编辑 — {selected.name}</h3>
            <div className="bg-card rounded-lg p-6 space-y-4">
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                className="w-full h-48 px-3 py-2 border border-warm-border rounded-md text-sm font-mono bg-white"
              />
              <div className="flex gap-2">
                <button onClick={handleSave} className="px-4 py-2 bg-warm-primary text-white rounded-lg text-sm hover:bg-warm-primary-hover">保存</button>
                <button onClick={() => setShowHelp(!showHelp)} className="px-4 py-2 bg-warm-secondary hover:bg-warm-border rounded-lg text-sm">
                  {showHelp ? '隐藏' : '显示'}占位符帮助
                </button>
              </div>

              {showHelp && (
                <div className="bg-warm-secondary rounded-lg p-4 mt-3">
                  <h4 className="text-xs font-medium mb-2">可用占位符（点击插入）</h4>
                  <div className="space-y-1.5">
                    {PLACEHOLDER_HELP.map(ph => (
                      <div key={ph.key} className="flex items-center gap-2">
                        <button onClick={() => insertPlaceholder(ph.key)} className="text-xs font-mono bg-warm-primary/10 text-warm-primary px-1.5 py-0.5 rounded hover:bg-warm-primary/20">
                          {ph.key}
                        </button>
                        <span className="text-xs text-muted-foreground">{ph.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
