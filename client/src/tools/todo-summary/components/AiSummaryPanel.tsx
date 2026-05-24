import { useState } from 'react';
import { X } from 'lucide-react';
import { useApi } from '@/hooks/useApi';

interface Props {
  period: string;
  onClose: () => void;
}

export function AiSummaryPanel({ period, onClose }: Props) {
  const { data: result, loading, request } = useApi<{ content: string }>();
  const [content, setContent] = useState('');

  const handleGenerate = async () => {
    const resp = await request('/api/todo-summary/summary/generate', {
      method: 'POST',
      body: JSON.stringify({ templateId: 1, period }),
    });
    if (resp?.data?.content) setContent(resp.data.content);
  };

  const handleCopy = () => navigator.clipboard.writeText(content);

  return (
    <div className="absolute inset-y-0 right-0 w-[380px] bg-warm-card border-l border-warm-border shadow-[-4px_0_12px_rgba(139,115,85,0.08)] flex flex-col z-20">
      <div className="flex items-center justify-between px-6 py-4 border-b border-warm-border">
        <h3 className="font-medium text-sm">AI {period === 'week' ? '周报' : '月报'}总结</h3>
        <button onClick={onClose} className="p-1 hover:bg-warm-secondary rounded">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-auto px-6 py-4 text-sm">
        {!content && !loading && (
          <div className="text-center py-8">
            <p className="text-warm-muted mb-4">点击生成{period === 'week' ? '周报' : '月报'}总结</p>
            <button
              onClick={handleGenerate}
              className="px-6 py-2 bg-warm-primary text-white rounded-lg text-sm font-medium hover:bg-warm-primary-hover"
            >
              🤖 生成总结
            </button>
          </div>
        )}

        {loading && <p className="text-center text-warm-muted py-8">生成中...</p>}

        {content && (
          <div className="whitespace-pre-wrap font-sans text-foreground leading-relaxed">{content}</div>
        )}
      </div>

      {content && (
        <div className="flex gap-3 px-6 py-4 border-t border-warm-border">
          <button onClick={handleCopy} className="flex-1 px-4 py-2 bg-warm-secondary hover:bg-warm-border rounded-lg text-sm transition-colors">
            复制
          </button>
          <button onClick={handleGenerate} className="flex-1 px-4 py-2 bg-warm-primary hover:bg-warm-primary-hover text-white rounded-lg text-sm transition-colors">
            重新生成
          </button>
        </div>
      )}
    </div>
  );
}
