import { Router, Request, Response } from 'express';
import type { ApiResponse } from '@shared/types';
import { getAccessPassword, getResetCode, setAccessPassword } from '../middleware/auth';

const router = Router();

router.post('/login', (req: Request, res: Response<ApiResponse<{ token: string }>>) => {
  const { password } = req.body;
  if (password === getAccessPassword()) {
    res.json({ success: true, data: { token: password } });
  } else {
    res.status(401).json({ success: false, error: '密码错误' });
  }
});

router.post('/change', (req: Request, res: Response<ApiResponse<{ token: string }>>) => {
  const { currentPassword, newPassword } = req.body;
  if (currentPassword !== getAccessPassword()) {
    res.status(401).json({ success: false, error: '当前密码不正确' });
    return;
  }
  if (!newPassword || String(newPassword).trim().length < 4) {
    res.status(400).json({ success: false, error: '新密码至少 4 位' });
    return;
  }
  setAccessPassword(String(newPassword).trim());
  res.json({ success: true, data: { token: String(newPassword).trim() } });
});

router.post('/reset', (req: Request, res: Response<ApiResponse<{ token: string }>>) => {
  const { resetCode, newPassword } = req.body;
  if (resetCode !== getResetCode()) {
    res.status(401).json({ success: false, error: '重置码不正确' });
    return;
  }
  if (!newPassword || String(newPassword).trim().length < 4) {
    res.status(400).json({ success: false, error: '新密码至少 4 位' });
    return;
  }
  setAccessPassword(String(newPassword).trim());
  res.json({ success: true, data: { token: String(newPassword).trim() } });
});

export default router;
