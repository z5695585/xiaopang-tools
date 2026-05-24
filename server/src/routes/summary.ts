import { Router, Request, Response } from 'express';
import type { ApiResponse, SummaryData, SummaryGroup, SummaryItem } from '@shared/types';
import { getDb } from '../db';

const router = Router();

function getPeriodDates(period: string, from?: string, to?: string): { start: string; end: string; label: string } {
  // 如果前端传了日期范围，直接使用
  if (from && to) {
    return {
      start: new Date(from).toISOString(),
      end: new Date(to).toISOString(),
      label: `${from.slice(0, 10)} ~ ${to.slice(0, 10)}`,
    };
  }

  const now = new Date();
  if (period === 'week') {
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return {
      start: monday.toISOString(),
      end: sunday.toISOString(),
      label: `${monday.toISOString().slice(0, 10)} ~ ${sunday.toISOString().slice(0, 10)}`,
    };
  }
  if (period === 'month') {
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    first.setHours(0, 0, 0, 0);
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    last.setHours(23, 59, 59, 999);
    return {
      start: first.toISOString(),
      end: last.toISOString(),
      label: `${first.toISOString().slice(0, 10)} ~ ${last.toISOString().slice(0, 10)}`,
    };
  }
  return {
    start: '',
    end: '',
    label: '',
  };
}

// GET /api/summary/data — week/month view data
router.get('/data', (req: Request, res: Response<ApiResponse<SummaryData>>) => {
  const db = getDb();
  const { period = 'week', from, to } = req.query;
  const { start, end, label } = getPeriodDates(period as string, from as string, to as string);

  const tags = db.prepare('SELECT * FROM tags').all() as any[];
  const groups: SummaryGroup[] = [];

  for (const tag of tags) {
    const completed = db.prepare(`
      SELECT title, (SELECT COUNT(*) FROM todos c WHERE c.parent_id = t.id AND c.completed = 1) as subCount,
             completed_at as completedAt
      FROM todos t
      WHERE t.deleted_at IS NULL AND t.completed = 1 AND t.parent_id IS NULL
        AND t.completed_at >= ? AND t.completed_at <= ?
        AND EXISTS (SELECT 1 FROM todo_tags tt WHERE tt.todo_id = t.id AND tt.tag_id = ?)
    `).all(start, end, tag.id) as SummaryItem[];

    const pending = db.prepare(`
      SELECT title, (SELECT COUNT(*) FROM todos c WHERE c.parent_id = t.id) as subCount
      FROM todos t
      WHERE t.deleted_at IS NULL AND t.completed = 0 AND t.parent_id IS NULL
        AND EXISTS (SELECT 1 FROM todo_tags tt WHERE tt.todo_id = t.id AND tt.tag_id = ?)
    `).all(tag.id) as SummaryItem[];

    const risks = db.prepare(`
      SELECT title, 0 as subCount, 1 as isManual
      FROM todos t
      WHERE t.deleted_at IS NULL AND t.is_risk = 1 AND t.parent_id IS NULL
        AND EXISTS (SELECT 1 FROM todo_tags tt WHERE tt.todo_id = t.id AND tt.tag_id = ?)
    `).all(tag.id) as SummaryItem[];

    const focus = db.prepare(`
      SELECT title, 0 as subCount, 1 as isManual
      FROM todos t
      WHERE t.deleted_at IS NULL AND t.is_focus = 1 AND t.parent_id IS NULL
        AND EXISTS (SELECT 1 FROM todo_tags tt WHERE tt.todo_id = t.id AND tt.tag_id = ?)
    `).all(tag.id) as SummaryItem[];

    if (completed.length || pending.length || risks.length || focus.length) {
      groups.push({
        tag: { id: tag.id, name: tag.name, color: tag.color },
        completed,
        pending,
        risks,
        focus,
      } as SummaryGroup);
    }
  }

  // 未分类（无标签）的条目
  const untaggedCompleted = db.prepare(`
    SELECT title, (SELECT COUNT(*) FROM todos c WHERE c.parent_id = t.id AND c.completed = 1) as subCount,
           completed_at as completedAt
    FROM todos t
    WHERE t.deleted_at IS NULL AND t.completed = 1 AND t.parent_id IS NULL
      AND t.completed_at >= ? AND t.completed_at <= ?
      AND NOT EXISTS (SELECT 1 FROM todo_tags tt WHERE tt.todo_id = t.id)
  `).all(start, end) as SummaryItem[];

  const untaggedPending = db.prepare(`
    SELECT title, (SELECT COUNT(*) FROM todos c WHERE c.parent_id = t.id) as subCount
    FROM todos t
    WHERE t.deleted_at IS NULL AND t.completed = 0 AND t.parent_id IS NULL
      AND NOT EXISTS (SELECT 1 FROM todo_tags tt WHERE tt.todo_id = t.id)
  `).all() as SummaryItem[];

  const untaggedRisks = db.prepare(`
    SELECT title, 0 as subCount, 1 as isManual
    FROM todos t
    WHERE t.deleted_at IS NULL AND t.is_risk = 1 AND t.parent_id IS NULL
      AND NOT EXISTS (SELECT 1 FROM todo_tags tt WHERE tt.todo_id = t.id)
  `).all() as SummaryItem[];

  const untaggedFocus = db.prepare(`
    SELECT title, 0 as subCount, 1 as isManual
    FROM todos t
    WHERE t.deleted_at IS NULL AND t.is_focus = 1 AND t.parent_id IS NULL
      AND NOT EXISTS (SELECT 1 FROM todo_tags tt WHERE tt.todo_id = t.id)
  `).all() as SummaryItem[];

  if (untaggedCompleted.length || untaggedPending.length || untaggedRisks.length || untaggedFocus.length) {
    groups.push({
      tag: { id: 0, name: '未分类', color: '#9CA3AF' },
      completed: untaggedCompleted,
      pending: untaggedPending,
      risks: untaggedRisks,
      focus: untaggedFocus,
    } as SummaryGroup);
  }

  res.json({ success: true, data: { period: label, groups } });
});

// POST /api/summary/generate — AI summary generation
router.post('/generate', async (req: Request, res: Response<ApiResponse<{ content: string }>>) => {
  const { templateId, period } = req.body;
  const db = getDb();

  const tpl = db.prepare('SELECT * FROM templates WHERE id = ?').get(templateId) as any;
  if (!tpl) {
    res.status(400).json({ success: false, error: '模板不存在' });
    return;
  }

  const { start, end, label } = getPeriodDates(period || 'week');
  const tags = db.prepare('SELECT * FROM tags').all() as any[];
  let completedText = '';
  let pendingText = '';
  let risksText = '';
  let focusText = '';

  for (const tag of tags) {
    const completed = db.prepare(`
      SELECT t.title, (SELECT COUNT(*) FROM todos c WHERE c.parent_id = t.id AND c.completed = 1) as sub_count
      FROM todos t WHERE t.deleted_at IS NULL AND t.completed = 1 AND t.parent_id IS NULL
        AND t.completed_at >= ? AND t.completed_at <= ?
        AND EXISTS (SELECT 1 FROM todo_tags tt WHERE tt.todo_id = t.id AND tt.tag_id = ?)
    `).all(start, end, tag.id) as any[];

    const pending = db.prepare(`
      SELECT t.title FROM todos t WHERE t.deleted_at IS NULL AND t.completed = 0 AND t.parent_id IS NULL
        AND EXISTS (SELECT 1 FROM todo_tags tt WHERE tt.todo_id = t.id AND tt.tag_id = ?)
    `).all(tag.id) as any[];

    if (completed.length) {
      completedText += `* ${tag.name}：${completed.map((c: any) => c.title + (c.sub_count ? `（含${c.sub_count}子项）` : '')).join('、')}\n`;
    }
    if (pending.length) {
      pendingText += `* ${tag.name}：${pending.map((p: any) => p.title).join('、')}\n`;
    }

    const risks = db.prepare(`
      SELECT title FROM todos WHERE is_risk = 1 AND deleted_at IS NULL AND parent_id IS NULL
        AND EXISTS (SELECT 1 FROM todo_tags tt WHERE tt.todo_id = todos.id AND tt.tag_id = ?)
    `).all(tag.id) as any[];
    if (risks.length) {
      risksText += `* ${tag.name}：${risks.map((r: any) => r.title).join('、')}\n`;
    }
  }

  let draft = tpl.content
    .replace('{{week_range}}', label)
    .replace('{{completed}}', completedText || '暂无')
    .replace('{{pending}}', pendingText || '暂无')
    .replace('{{risks}}', risksText || '暂无')
    .replace('{{focus}}', '')
    .replace('{{ai_summary}}', '{{AI_GENERATED}}');

  const apiKey = process.env.AI_API_KEY || '';
  if (!apiKey) {
    const finalContent = draft.replace('{{AI_GENERATED}}', '（配置 AI API Key 后可自动生成）');
    res.json({ success: true, data: { content: finalContent } });
    return;
  }

  const baseUrl = process.env.AI_API_BASE_URL || 'https://api.deepseek.com/v1';
  const model = process.env.AI_API_MODEL || 'deepseek-chat';
  const temperature = parseFloat(process.env.AI_API_TEMPERATURE || '0.7');

  try {
    const aiResp = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature,
        messages: [
          {
            role: 'system',
            content: '你是项目管理助手。根据提供的周报数据润色和完善，注意：1.检查表述是否通顺 2.分析数据推断潜在风险和关注事项 3.生成本周总结替换{{AI_GENERATED}} 4.保持markdown格式和原结构不变。直接返回完整报告，不要加前缀说明。',
          },
          { role: 'user', content: draft },
        ],
      }),
    });

    if (!aiResp.ok) throw new Error(`AI API error: ${aiResp.status}`);
    const aiJson = await aiResp.json() as any;
    const content = aiJson.choices?.[0]?.message?.content || draft;
    res.json({ success: true, data: { content } });
  } catch (err: any) {
    res.json({ success: true, data: { content: draft.replace('{{AI_GENERATED}}', `（AI 生成失败：${err.message}）`) } });
  }
});

export default router;
