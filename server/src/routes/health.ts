import { Router, Request, Response } from 'express';
import type { ApiResponse } from '@shared/types';

const router = Router();

router.get('/', (_req: Request, res: Response<ApiResponse<{ ok: boolean }>>) => {
  res.json({ success: true, data: { ok: true } });
});

export default router;
