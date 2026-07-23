import { useState } from 'react';
import { X } from 'lucide-react';
import type { TodoDraft } from '@shared/types';
import { useApi } from '@/hooks/useApi';

interface Props {
  onClose: () => void;
  onDraftReady: (draft: TodoDraft) => void;
}

// 粘贴邮件正文，调用 AI 提炼出一条待办草稿，交给外层预填新建待办表单
export function EmailCaptureModal({ onClose, onDraftReady }: Props) {
  const { request, loading, error: apiError } = useApi<TodoDraft>();
  const [text, setText] = useState('');
  const [validationError, setValidationError] = useState('');

  const handleRecognize = async () => {
    if (!text.trim()) {
      setValidationError('请先粘贴邮件内容');
      return;
    }
    setValidationError('');
    const result = await request('/api/todo-summary/ai-capture/email', {
      method: 'POST',
      body: JSON.stringify({ text: text.trim() }),
    });
    if (result?.data) {
      onDraftReady(result.data);
    }
  };

  const error = validationError || apiError;

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 px-6">
      <div className="bg-warm-card rounded-warm-card shadow-warm-hover w-full max-w-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-warm-text">邮件识别待办</h3>
          <button onClick={onClose} className="p-1 hover:bg-warm-secondary rounded">
            <X className="w-4 h-4 text-warm-muted" />
          </button>
        </div>

        <p className="text-xs text-warm-muted">
          粘贴邮件正文，AI 会提炼出需要办理的事项并预填到新建待办表单，日期和标签仍需你手动确认。
        </p>

        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={10}
          placeholder="粘贴邮件内容..."
          className="w-full px-3 py-2 border border-warm-border rounded-warm-btn text-sm bg-white outline-none focus:ring-2 focus:ring-warm-primary/20 focus:border-warm-primary"
        />

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-md bg-warm-secondary hover:bg-warm-border text-warm-text">
            取消
          </button>
          <button
            type="button"
            onClick={handleRecognize}
            disabled={loading}
            className="px-4 py-2 text-sm text-white bg-warm-primary rounded-md hover:bg-warm-primary-hover disabled:opacity-50"
          >
            {loading ? '识别中…' : '识别'}
          </button>
        </div>
      </div>
    </div>
  );
}
