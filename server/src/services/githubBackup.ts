import type { BackupSettings } from '@shared/types';
import { getDb } from '../db';
import { buildBackupPayload, type BackupPayload } from './backupPayload';

function getSetting(key: string): string | null {
  const row = getDb().prepare('SELECT value FROM app_settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

function setSetting(key: string, value: string): void {
  getDb().prepare(`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
  `).run(key, value);
}

function isConfigured(): boolean {
  return !!(process.env.GITHUB_TOKEN && process.env.GITHUB_BACKUP_REPO);
}

// 把当天的备份 JSON 写入 GitHub 仓库的 backups/xiaopang-YYYY-MM-DD.json
async function pushBackupToGitHub(payload: BackupPayload, dateStr: string): Promise<void> {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_BACKUP_REPO;
  if (!token || !repo) {
    throw new Error('未配置 GITHUB_TOKEN / GITHUB_BACKUP_REPO 环境变量');
  }
  const branch = process.env.GITHUB_BACKUP_BRANCH || 'main';
  const path = `backups/xiaopang-${dateStr}.json`;
  const apiUrl = `https://api.github.com/repos/${repo}/contents/${path}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'xiaopang-tools-backup',
  };

  // 同一天可能重复执行（手动 + 定时），先查是否已存在同名文件以便带上 sha 覆盖更新
  let sha: string | undefined;
  const existing = await fetch(`${apiUrl}?ref=${branch}`, { headers });
  if (existing.status === 200) {
    const json = await existing.json() as { sha: string };
    sha = json.sha;
  } else if (existing.status !== 404) {
    throw new Error(`读取备份文件失败：${existing.status} ${await existing.text()}`);
  }

  const content = Buffer.from(JSON.stringify(payload, null, 2)).toString('base64');
  const put = await fetch(apiUrl, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `chore: daily backup ${dateStr}`,
      content,
      branch,
      ...(sha ? { sha } : {}),
    }),
  });
  if (!put.ok) {
    throw new Error(`写入备份文件失败：${put.status} ${await put.text()}`);
  }
}

export function getBackupStatus(): BackupSettings {
  return {
    enabled: getSetting('backup_enabled') === '1',
    configured: isConfigured(),
    repo: process.env.GITHUB_BACKUP_REPO || null,
    last_run_at: getSetting('backup_last_run_at'),
    last_status: (getSetting('backup_last_status') as 'success' | 'error' | null) || null,
    last_error: getSetting('backup_last_error') || null,
  };
}

export function setBackupEnabled(enabled: boolean): void {
  setSetting('backup_enabled', enabled ? '1' : '0');
}

// 立即执行一次备份，不管今天是否已经备份过（供设置面板"立即备份"按钮调用）
export async function runBackupNow(): Promise<void> {
  const dateStr = new Date().toISOString().slice(0, 10);
  try {
    const payload = buildBackupPayload();
    await pushBackupToGitHub(payload, dateStr);
    setSetting('backup_last_run_date', dateStr);
    setSetting('backup_last_run_at', new Date().toISOString());
    setSetting('backup_last_status', 'success');
    setSetting('backup_last_error', '');
  } catch (err) {
    setSetting('backup_last_run_at', new Date().toISOString());
    setSetting('backup_last_status', 'error');
    setSetting('backup_last_error', err instanceof Error ? err.message : String(err));
  }
}

// 定时任务调用：开关关闭、未配置、或今天已经成功备份过则跳过；失败不会更新 last_run_date，下次检查会重试
export async function runDailyBackupIfDue(): Promise<void> {
  if (getSetting('backup_enabled') !== '1') return;
  if (!isConfigured()) return;
  const today = new Date().toISOString().slice(0, 10);
  if (getSetting('backup_last_run_date') === today) return;
  await runBackupNow();
}
