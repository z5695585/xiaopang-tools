import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, X } from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { zhCN } from 'date-fns/locale/zh-CN';
import type { SummaryData } from '@shared/types';
import { useApi } from '@/hooks/useApi';
import { useTodoContext } from '../context';
import { AiSummaryPanel } from './AiSummaryPanel';

export function WeekView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAI, setShowAI] = useState(false);
  const { data: summary, request } = useApi<SummaryData>();
  const { refreshKey } = useTodoContext();

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekLabel = `${format(weekStart, 'yyyy年M月d日')} - ${format(addDays(weekStart, 6), 'M月d日')}`;

  useEffect(() => {
    const from = weekStart.toISOString();
    const to = addDays(weekStart, 6).toISOString();
    request(`/api/todo-summary/summary/data?period=week&from=${from}&to=${to}`);
  }, [refreshKey, currentDate]);

  const prevWeek = () => setCurrentDate(d => addDays(d, -7));
  const nextWeek = () => setCurrentDate(d => addDays(d, 7));

  const allCompleted = summary?.groups?.reduce((s, g) => s + g.completed.length, 0) || 0;
  const allPending = summary?.groups?.reduce((s, g) => s + g.pending.length, 0) || 0;
  const allTotal = allCompleted + allPending;
  const completionRate = allTotal > 0 ? Math.round((allCompleted / allTotal) * 100) : 0;

  return (
    <div className="flex flex-col h-full relative">
      <div className="flex items-center justify-between px-6 py-4 border-b border-warm-border">
        <div className="flex items-center gap-4">
          <button onClick={prevWeek} className="p-2 hover:bg-warm-secondary rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-medium text-sm">{weekLabel}</span>
          <button onClick={nextWeek} className="p-2 hover:bg-warm-secondary rounded-lg transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <button
          onClick={() => setShowAI(true)}
          className="px-4 py-2 border-2 border-warm-primary text-warm-primary hover:bg-warm-secondary rounded-lg text-sm flex items-center gap-2 transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          AI 总结
        </button>
      </div>

      <div className="flex-1 overflow-auto px-6 py-4">
        {/* 7 天网格 */}
        <div className="grid grid-cols-7 gap-3">
          {weekDays.map((day, i) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={i}
                className={`rounded-lg border border-warm-border p-3 ${isToday ? 'bg-warm-secondary' : 'bg-white'}`}
              >
                <div className="text-center mb-3">
                  <div className="text-xs text-warm-muted mb-1">{format(day, 'EEE', { locale: zhCN })}</div>
                  <div className={`text-lg font-medium ${isToday ? 'text-warm-primary' : ''}`}>{format(day, 'd')}</div>
                </div>
                <div className="space-y-2">
                  {summary?.groups?.flatMap(g =>
                    g.completed.map(c => ({ ...c, tag: g.tag }))
                  ).filter((t: any) => t.completedAt?.startsWith(dateKey)).map((t: any, j: number) => (
                    <div
                      key={j}
                      className={`text-xs p-2 rounded border line-through cursor-default ${
                        t.isSub ? 'bg-warm-secondary/50 border-warm-border/50 text-warm-muted/70' : 'bg-warm-card border-warm-border text-warm-muted'
                      }`}
                      title={`${t.isSub ? '子任务' : '主任务'}：${t.title}\n${t.isSub && t.parentTitle ? `所属: ${t.parentTitle}\n` : ''}标签: ${t.tag.name}\n${t.subCount ? `含 ${t.subCount} 子项完成\n` : ''}完成时间: ${t.completedAt?.slice(0, 16).replace('T', ' ') || '未知'}`}
                    >
                      {t.isSub ? `↳ ${t.title}` : t.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* 统计栏 */}
        <div className="mt-6 p-4 bg-warm-secondary rounded-lg">
          <div className="flex items-center gap-6 text-sm">
            <span>本周任务: <span className="font-medium">{allTotal}</span></span>
            <span>已完成: <span className="font-medium">{allCompleted}</span></span>
            <span>完成率: <span className="font-medium">{completionRate}%</span></span>
            <div className="flex-1 max-w-md">
              <div className="h-2 bg-warm-secondary rounded-full overflow-hidden">
                <div className="h-full bg-warm-primary transition-all" style={{ width: `${completionRate}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {showAI && <AiSummaryPanel period="week" onClose={() => setShowAI(false)} />}
    </div>
  );
}
