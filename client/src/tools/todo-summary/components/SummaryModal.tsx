import { useState } from 'react';
import { useApi } from '@/hooks/useApi';

interface Props {
  period: string;
  onClose: () => void;
}

export function SummaryModal({ period, onClose }: Props) {
  const { data: result, loading, request } = useApi<{ content: string }>();
  const [content, setContent] = useState('');

  const handleGenerate = async () => {
    const resp = await request('/api/todo-summary/summary/generate', {
      method: 'POST',
      body: JSON.stringify({ templateId: 1, period }),
    });
    if (resp?.data?.content) setContent(resp.data.content);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-semibold">🤖 AI {period === 'week' ? '周报' : '月报'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          {!content && !loading && (
            <div className="text-center py-12">
              <p className="text-slate-500 mb-4">点击生成{period === 'week' ? '周报' : '月报'}</p>
              <button onClick={handleGenerate} className="px-6 py-2 bg-purple-500 text-white rounded-md font-medium hover:bg-purple-600">🤖 生成</button>
            </div>
          )}

          {loading && <p className="text-center text-slate-400 py-12">生成中...</p>}

          {content && (
            <pre className="text-sm whitespace-pre-wrap font-sans text-slate-700 leading-relaxed">{content}</pre>
          )}
        </div>

        {content && (
          <div className="flex gap-2 justify-end px-6 py-4 border-t">
            <button onClick={handleCopy} className="px-4 py-2 text-sm text-slate-600 bg-slate-100 rounded-md hover:bg-slate-200">📋 复制</button>
            <button onClick={handleGenerate} className="px-4 py-2 text-sm text-white bg-purple-500 rounded-md hover:bg-purple-600">🔄 重新生成</button>
          </div>
        )}
      </div>
    </div>
  );
}
