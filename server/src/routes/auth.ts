import { Router, Request, Response } from 'express';
import type { ApiResponse } from '@shared/types';
import { getAccessPassword } from '../middleware/auth';

const router = Router();

router.post('/login', (req: Request, res: Response<ApiResponse<{ token: string }>>) => {
  const { password } = req.body;
  if (password === getAccessPassword()) {
    res.json({ success: true, data: { token: password } });
  } else {
    res.status(401).json({ success: false, error: '密码错误' });
  }
});

export default router;
