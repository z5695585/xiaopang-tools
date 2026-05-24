import { Request, Response, NextFunction } from 'express';

const AUTH_HEADER = 'x-auth-password';

export function getAccessPassword(): string {
  return process.env.ACCESS_PASSWORD || 'xiaopang';
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
