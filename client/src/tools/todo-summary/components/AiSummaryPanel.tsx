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
    <div className="absolute inset-y-0 right-0 w-[380px] bg-card border-l border-border shadow-[-4px_0_12px_rgba(0,0,0,0.08)] flex flex-col z-20">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h3 className="font-medium text-sm">AI {period === 'week' ? '周报' : '月报'}总结</h3>
        <button onClick={onClose} className="p-1 hover:bg-secondary rounded">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-auto px-6 py-4 text-sm">
        {!content && !loading && (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">点击生成{period === 'week' ? '周报' : '月报'}总结</p>
            <button
              onClick={handleGenerate}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary-hover"
            >
              🤖 生成总结
            </button>
          </div>
        )}

        {loading && <p className="text-center text-muted-foreground py-8">生成中...</p>}

        {content && (
          <pre className="whitespace-pre-wrap font-sans text-foreground leading-relaxed">{content}</pre>
        )}
      </div>

      {content && (
        <div className="flex gap-3 px-6 py-4 border-t border-border">
          <button onClick={handleCopy} className="flex-1 px-4 py-2 bg-secondary hover:bg-accent rounded-lg text-sm transition-colors">
            复制
          </button>
          <button onClick={handleGenerate} className="flex-1 px-4 py-2 bg-primary hover:bg-primary-hover text-primary-foreground rounded-lg text-sm transition-colors">
            重新生成
          </button>
        </div>
      )}
    </div>
  );
}
