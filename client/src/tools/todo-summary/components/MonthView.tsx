import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek } from 'date-fns';
import type { SummaryData } from '@shared/types';
import { useApi } from '@/hooks/useApi';
import { useTodoContext } from '../context';
import { AiSummaryPanel } from './AiSummaryPanel';

export function MonthView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAI, setShowAI] = useState(false);
  const { data: summary, request } = useApi<SummaryData>();
  const { refreshKey } = useTodoContext();

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  useEffect(() => {
    const from = format(monthStart, 'yyyy-MM-dd');
    const to = format(monthEnd, 'yyyy-MM-dd');
    request(`/api/todo-summary/summary/data?period=month&from=${from}&to=${to}`);
  }, [refreshKey, currentDate]);

  const prevMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const allCompleted = summary?.groups?.reduce((s, g) => s + g.completed.length, 0) || 0;
  const allPending = summary?.groups?.reduce((s, g) => s + g.pending.length, 0) || 0;
  const allTotal = allCompleted + allPending;
  const completionRate = allTotal > 0 ? Math.round((allCompleted / allTotal) * 100) : 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-warm-border">
        <div className="flex items-center gap-4">
          <button onClick={prevMonth} className="p-2 hover:bg-warm-secondary rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-medium text-sm">{format(currentDate, 'yyyy年M月')}</span>
          <button onClick={nextMonth} className="p-2 hover:bg-warm-secondary rounded-lg transition-colors">
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
        <div className="grid grid-cols-7 gap-2 mb-2">
          {['周一', '周二', '周三', '周四', '周五', '周六', '周日'].map(d => (
            <div key={d} className="text-center text-xs font-medium text-warm-muted py-2">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((day, i) => {
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isToday = isSameDay(day, new Date());
            const dateKey = format(day, 'yyyy-MM-dd');

            return (
              <div
                key={i}
                className={`min-h-[90px] border border-warm-border rounded-lg p-2 ${
                  isCurrentMonth ? 'bg-white' : 'bg-warm-secondary/30'
                } ${isToday ? 'ring-2 ring-warm-primary' : ''}`}
              >
                <div className={`text-sm font-medium mb-1 ${
                  isToday ? 'bg-warm-primary text-white w-6 h-6 rounded-full flex items-center justify-center' :
                  isCurrentMonth ? 'text-warm-text' : 'text-warm-muted'
                }`}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-0.5 text-[10px] text-warm-muted">
                  {summary?.groups?.flatMap(g =>
                    g.completed.map(c => ({ ...c, tag: g.tag }))
                  ).filter((t: any) => t.completedAt?.startsWith(dateKey)).slice(0, 3).map((t: any, j: number) => (
                    <div
                      key={j}
                      className={`px-1.5 py-0.5 rounded border line-through truncate cursor-default ${
                        t.isSub ? 'bg-warm-secondary/50 border-warm-border/50 text-warm-muted/70' : 'bg-warm-card border-warm-border text-warm-muted'
                      }`}
                      title={`${t.isSub ? '子任务' : '主任务'}：${t.title}\n${t.isSub && t.parentTitle ? `所属: ${t.parentTitle}\n` : ''}标签: ${t.tag.name}\n${t.subCount ? `含 ${t.subCount} 子项完成\n` : ''}完成时间: ${t.completedAt?.slice(0, 16).replace('T', ' ') || '未知'}`}
                    >
                      {t.isSub ? `↳ ${t.title}` : t.title}
                    </div>
                  ))}
                  {(() => {
                    const dayItems = summary?.groups?.flatMap(g =>
                      g.completed.map(c => ({ ...c, tag: g.tag }))
                    ).filter((t: any) => t.completedAt?.startsWith(dateKey)) || [];
                    if (dayItems.length > 3) {
                      return <div className="text-[10px] text-warm-muted pl-1">+{dayItems.length - 3} 更多</div>;
                    }
                    return null;
                  })()}
                </div>
              </div>
            );
          })}
        </div>

        {/* 统计栏 */}
        <div className="mt-6 p-4 bg-warm-secondary rounded-lg">
          <div className="flex items-center gap-6 text-sm">
            <span>本月任务: <span className="font-medium">{allTotal}</span></span>
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

      {showAI && <AiSummaryPanel period="month" onClose={() => setShowAI(false)} />}
    </div>
  );
}
