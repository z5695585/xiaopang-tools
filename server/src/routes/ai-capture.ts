import { Router, Request, Response } from 'express';
import type { ApiResponse, TodoDraft } from '@shared/types';
import { extractTodoFromEmail } from '../services/aiCapture';

const router = Router();

// POST /api/todo-summary/ai-capture/email — 从邮件正文提炼一条待办草稿
router.post('/email', async (req: Request, res: Response<ApiResponse<TodoDraft>>) => {
  const { text } = req.body as { text?: string };
  if (!text?.trim()) {
    res.status(400).json({ success: false, error: '请粘贴邮件内容' });
    return;
  }

  try {
    const draft = await extractTodoFromEmail(text.trim());
    res.json({ success: true, data: draft });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : '识别失败，请手动创建' });
  }
});

export default router;
