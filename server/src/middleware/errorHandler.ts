import { Request, Response, NextFunction } from 'express';
import path from 'path';
import type { ApiResponse } from '@shared/types';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response<ApiResponse<never>>,
  _next: NextFunction
): void {
  console.error('[error]', err.message);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
}

export function notFoundHandler(
  req: Request,
  res: Response<ApiResponse<never>>,
  _next: NextFunction
): void {
  // API 路由返回 404 JSON
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ success: false, error: 'Not found' });
    return;
  }
  // 非 API 请求返回 index.html（SPA 回退）
  res.sendFile('index.html', { root: path.join(__dirname, '..', 'public') });
}
