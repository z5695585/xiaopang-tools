import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { BackupSettings } from '@shared/types';
import { useApi } from '@/hooks/useApi';

interface Props {
  onClose: () => void;
}

// 事项看板专属的 GitHub 每日备份设置：仅备份本工具的待办/标签数据，因此挂在事项看板内，不放进全局设置
export function BackupSettingsModal({ onClose }: Props) {
  const { data, request } = useApi<BackupSettings>();
  const [toggling, setToggling] = useState(false);
  const [running, setRunning] = useState(false);

  useEffect(() => { request('/api/todo-summary/backup/settings'); }, []);

  const toggle = async () => {
    if (!data) return;
    setToggling(true);
    await request('/api/todo-summary/backup/settings', { method: 'PUT', body: JSON.stringify({ enabled: !data.enabled }) });
    setToggling(false);
  };

  const runNow = async () => {
    setRunning(true);
    await request('/api/todo-summary/backup/settings/run', { method: 'POST' });
    setRunning(false);
  };

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
      <div className="bg-warm-card rounded-warm-card shadow-warm-hover w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-warm-text">GitHub 每日备份</h3>
          <button onClick={onClose} className="p-1 hover:bg-warm-secondary rounded">
            <X className="w-4 h-4 text-warm-muted" />
          </button>
        </div>

        {!data ? (
          <p className="text-xs text-warm-muted text-center py-4">加载中…</p>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-warm-text">每日自动备份</p>
                <p className="text-xs text-warm-muted mt-0.5">
                  {data.configured ? `仓库：${data.repo}` : '尚未配置 GITHUB_TOKEN / GITHUB_BACKUP_REPO'}
                </p>
              </div>
              <button
                type="button"
                onClick={toggle}
                disabled={toggling || !data.configured}
                title={data.configured ? undefined : '需要先配置服务器环境变量'}
                className={`w-11 h-6 rounded-full transition-colors shrink-0 disabled:opacity-50 inline-flex items-center px-0.5 ${
                  data.enabled ? 'bg-warm-primary' : 'bg-warm-border'
                }`}
              >
                <span
                  className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    data.enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between gap-3 text-xs text-warm-muted">
              <span>
                {data.last_run_at
                  ? `上次备份：${new Date(data.last_run_at).toLocaleString()} · ${data.last_status === 'success' ? '成功' : '失败'}`
                  : '尚未备份过'}
              </span>
              <button
                type="button"
                onClick={runNow}
                disabled={running || !data.configured}
                className="px-2.5 py-1 rounded-md bg-warm-secondary hover:bg-warm-border text-warm-text disabled:opacity-50 shrink-0"
              >
                {running ? '备份中…' : '立即备份'}
              </button>
            </div>

            {data.last_status === 'error' && data.last_error && (
              <p className="text-xs text-red-500 break-words">{data.last_error}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
