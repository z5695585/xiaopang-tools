import { Router, Request, Response } from 'express';
import type { ApiResponse, BackupSettings } from '@shared/types';
import { getBackupStatus, setBackupEnabled, runBackupNow } from '../services/githubBackup';

const router = Router();

router.get('/backup', (_req: Request, res: Response<ApiResponse<BackupSettings>>) => {
  res.json({ success: true, data: getBackupStatus() });
});

router.put('/backup', (req: Request, res: Response<ApiResponse<BackupSettings>>) => {
  const { enabled } = req.body as { enabled: boolean };
  setBackupEnabled(!!enabled);
  res.json({ success: true, data: getBackupStatus() });
});

router.post('/backup/run', async (_req: Request, res: Response<ApiResponse<BackupSettings>>) => {
  await runBackupNow();
  res.json({ success: true, data: getBackupStatus() });
});

export default router;
