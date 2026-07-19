import { useEffect, useState } from 'react';
import type { BackupSettings } from '@shared/types';
import { useApi } from '@/hooks/useApi';

export function BackupSettingsSection() {
  const { data, request } = useApi<BackupSettings>();
  const [toggling, setToggling] = useState(false);
  const [running, setRunning] = useState(false);

  useEffect(() => { request('/api/settings/backup'); }, []);

  const toggle = async () => {
    if (!data) return;
    setToggling(true);
    await request('/api/settings/backup', { method: 'PUT', body: JSON.stringify({ enabled: !data.enabled }) });
    setToggling(false);
  };

  const runNow = async () => {
    setRunning(true);
    await request('/api/settings/backup/run', { method: 'POST' });
    setRunning(false);
  };

  if (!data) return null;

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-medium text-warm-text">每日备份到 GitHub</h4>
          <p className="text-xs text-warm-muted mt-0.5">
            {data.configured ? `仓库：${data.repo}` : '尚未配置 GITHUB_TOKEN / GITHUB_BACKUP_REPO'}
          </p>
        </div>
        <button
          type="button"
          onClick={toggle}
          disabled={toggling || !data.configured}
          title={data.configured ? undefined : '需要先配置服务器环境变量'}
          className={`w-11 h-6 rounded-full transition-colors relative shrink-0 disabled:opacity-50 ${
            data.enabled ? 'bg-warm-primary' : 'bg-warm-border'
          }`}
        >
          <span
            className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
              data.enabled ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      <div className="flex items-center justify-between gap-3 mt-3 text-xs text-warm-muted">
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
        <p className="text-xs text-red-500 mt-1.5 break-words">{data.last_error}</p>
      )}
    </div>
  );
}
