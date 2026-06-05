import { Router, Request, Response } from 'express';
import type { ApiResponse, SummaryData, SummaryGroup, SummaryItem } from '@shared/types';
import { getDb } from '../db';

const router = Router();

function getPeriodDates(period: string, from?: string, to?: string): { start: string; end: string; label: string } {
  // 如果前端传了日期范围，转为可比较的 datetime 字符串
  if (from && to) {
    return {
      start: `${from} 00:00:00`,
      end: `${to} 23:59:59`,
      label: `${from} ~ ${to}`,
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
  const startDate = start.slice(0, 10);
  const endDate = end.slice(0, 10);

  const tags = db.prepare('SELECT * FROM tags').all() as any[];
  const groups: SummaryGroup[] = [];

  for (const tag of tags) {
    // 已完成主任务
    const completed = db.prepare(`
      SELECT t.id, t.title, (SELECT COUNT(*) FROM todos c WHERE c.parent_id = t.id AND c.completed = 1) as subCount,
             t.completed_at as completedAt, 0 as isSub, NULL as parentTitle
      FROM todos t
      WHERE t.deleted_at IS NULL AND t.completed = 1 AND t.parent_id IS NULL
        AND t.completed_at >= ? AND t.completed_at <= ?
        AND EXISTS (SELECT 1 FROM todo_tags tt WHERE tt.todo_id = t.id AND tt.tag_id = ?)
    `).all(start, end, tag.id) as SummaryItem[];

    // 已完成的子任务（标记 isSub=1，附父任务标题）
    const completedSubs = db.prepare(`
      SELECT s.id, s.title, 0 as subCount, s.completed_at as completedAt,
             1 as isSub, p.title as parentTitle
      FROM todos s
      JOIN todos p ON s.parent_id = p.id
      WHERE s.deleted_at IS NULL AND s.completed = 1 AND s.parent_id IS NOT NULL
        AND s.completed_at >= ? AND s.completed_at <= ?
        AND EXISTS (SELECT 1 FROM todo_tags tt WHERE tt.todo_id = p.id AND tt.tag_id = ?)
    `).all(start, end, tag.id) as SummaryItem[];

    const allCompleted = [...completed, ...completedSubs];

    const pending = db.prepare(`
      SELECT title, (SELECT COUNT(*) FROM todos c WHERE c.parent_id = t.id) as subCount
      FROM todos t
      WHERE t.deleted_at IS NULL AND t.completed = 0 AND t.parent_id IS NULL
        AND EXISTS (SELECT 1 FROM todo_tags tt WHERE tt.todo_id = t.id AND tt.tag_id = ?)
    `).all(tag.id) as SummaryItem[];

    const risks = db.prepare(`
      SELECT title, 0 as subCount, 1 as isManual, completed_at as completedAt
      FROM todos t
      WHERE t.deleted_at IS NULL AND t.is_risk = 1 AND t.parent_id IS NULL
        AND (
          (t.completed = 1 AND t.completed_at >= ? AND t.completed_at <= ?)
          OR (t.completed = 0 AND COALESCE(t.due_date, t.planned_date) >= ? AND COALESCE(t.due_date, t.planned_date) <= ?)
        )
        AND EXISTS (SELECT 1 FROM todo_tags tt WHERE tt.todo_id = t.id AND tt.tag_id = ?)
    `).all(start, end, startDate, endDate, tag.id) as SummaryItem[];

    const focus = db.prepare(`
      SELECT title, 0 as subCount, 1 as isManual, completed_at as completedAt
      FROM todos t
      WHERE t.deleted_at IS NULL AND t.is_focus = 1 AND t.parent_id IS NULL
        AND (
          (t.completed = 1 AND t.completed_at >= ? AND t.completed_at <= ?)
          OR (t.completed = 0 AND COALESCE(t.due_date, t.planned_date) >= ? AND COALESCE(t.due_date, t.planned_date) <= ?)
        )
        AND EXISTS (SELECT 1 FROM todo_tags tt WHERE tt.todo_id = t.id AND tt.tag_id = ?)
    `).all(start, end, startDate, endDate, tag.id) as SummaryItem[];

    if (allCompleted.length || risks.length || focus.length) {
      groups.push({
        tag: { id: tag.id, name: tag.name, color: tag.color },
        completed: allCompleted,
        pending,
        risks,
        focus,
      } as SummaryGroup);
    }
  }

  // 未分类（无标签）的条目
  const untaggedCompleted = db.prepare(`
    SELECT t.id, t.title, (SELECT COUNT(*) FROM todos c WHERE c.parent_id = t.id AND c.completed = 1) as subCount,
           t.completed_at as completedAt, 0 as isSub, NULL as parentTitle
    FROM todos t
    WHERE t.deleted_at IS NULL AND t.completed = 1 AND t.parent_id IS NULL
      AND t.completed_at >= ? AND t.completed_at <= ?
      AND NOT EXISTS (SELECT 1 FROM todo_tags tt WHERE tt.todo_id = t.id)
  `).all(start, end) as SummaryItem[];

  const untaggedCompletedSubs = db.prepare(`
    SELECT s.id, s.title, 0 as subCount, s.completed_at as completedAt,
           1 as isSub, p.title as parentTitle
    FROM todos s
    JOIN todos p ON s.parent_id = p.id
    WHERE s.deleted_at IS NULL AND s.completed = 1 AND s.parent_id IS NOT NULL
      AND s.completed_at >= ? AND s.completed_at <= ?
      AND NOT EXISTS (SELECT 1 FROM todo_tags tt WHERE tt.todo_id = p.id)
  `).all(start, end) as SummaryItem[];

  const allUntaggedCompleted = [...untaggedCompleted, ...untaggedCompletedSubs];

  const untaggedPending = db.prepare(`
    SELECT title, (SELECT COUNT(*) FROM todos c WHERE c.parent_id = t.id) as subCount
    FROM todos t
    WHERE t.deleted_at IS NULL AND t.completed = 0 AND t.parent_id IS NULL
      AND NOT EXISTS (SELECT 1 FROM todo_tags tt WHERE tt.todo_id = t.id)
  `).all() as SummaryItem[];

  const untaggedRisks = db.prepare(`
    SELECT title, 0 as subCount, 1 as isManual, completed_at as completedAt
    FROM todos t
    WHERE t.deleted_at IS NULL AND t.is_risk = 1 AND t.parent_id IS NULL
      AND (
        (t.completed = 1 AND t.completed_at >= ? AND t.completed_at <= ?)
        OR (t.completed = 0 AND COALESCE(t.due_date, t.planned_date) >= ? AND COALESCE(t.due_date, t.planned_date) <= ?)
      )
      AND NOT EXISTS (SELECT 1 FROM todo_tags tt WHERE tt.todo_id = t.id)
  `).all(start, end, startDate, endDate) as SummaryItem[];

  const untaggedFocus = db.prepare(`
    SELECT title, 0 as subCount, 1 as isManual, completed_at as completedAt
    FROM todos t
    WHERE t.deleted_at IS NULL AND t.is_focus = 1 AND t.parent_id IS NULL
      AND (
        (t.completed = 1 AND t.completed_at >= ? AND t.completed_at <= ?)
        OR (t.completed = 0 AND COALESCE(t.due_date, t.planned_date) >= ? AND COALESCE(t.due_date, t.planned_date) <= ?)
      )
      AND NOT EXISTS (SELECT 1 FROM todo_tags tt WHERE tt.todo_id = t.id)
  `).all(start, end, startDate, endDate) as SummaryItem[];

  if (allUntaggedCompleted.length || untaggedRisks.length || untaggedFocus.length) {
    groups.push({
      tag: { id: 0, name: '未分类', color: '#9CA3AF' },
      completed: allUntaggedCompleted,
      pending: untaggedPending,
      risks: untaggedRisks,
      focus: untaggedFocus,
    } as SummaryGroup);
  }

  res.json({ success: true, data: { period: label, groups } });
});

export default router;
