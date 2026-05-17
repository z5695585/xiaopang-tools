import { Request, Response, NextFunction } from 'express';
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
  _req: Request,
  res: Response<ApiResponse<never>>
): void {
  res.status(404).json({ success: false, error: 'Not found' });
}
