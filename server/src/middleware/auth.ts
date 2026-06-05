import { Request, Response, NextFunction } from 'express';
import { getDb } from '../db';

const AUTH_HEADER = 'x-auth-password';
const PASSWORD_KEY = 'access_password';

export function getAccessPassword(): string {
  try {
    const row = getDb().prepare('SELECT value FROM app_settings WHERE key = ?').get(PASSWORD_KEY) as { value: string } | undefined;
    if (row?.value) return row.value;
  } catch {
    // Migrations may not have run yet. Fall back to env/default.
  }
  return process.env.ACCESS_PASSWORD || 'xiaopang';
}

export function setAccessPassword(password: string): void {
  getDb().prepare(`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
  `).run(PASSWORD_KEY, password);
}

export function getResetCode(): string {
  return process.env.RESET_PASSWORD_CODE || 'xiaopang-reset';
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  // 跳过登录接口和健康检查
  if (req.path === '/auth/login' || req.path === '/health') {
    next();
    return;
  }

  const provided = req.headers[AUTH_HEADER] as string | undefined;
  if (!provided || provided !== getAccessPassword()) {
    res.status(401).json({ success: false, error: '未授权访问' });
    return;
  }
  next();
}
