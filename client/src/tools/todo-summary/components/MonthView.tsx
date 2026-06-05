import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import type { SummaryData } from '@shared/types';
import { useApi } from '@/hooks/useApi';
import { useTodoContext } from '../context';
import { PeriodSummaryList } from './PeriodSummaryList';

export function MonthView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);
  const { data: summary, request } = useApi<SummaryData>();
  const { refreshKey } = useTodoContext();

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const selectedMonth = format(currentDate, 'yyyy-MM');

  useEffect(() => {
    const from = format(monthStart, 'yyyy-MM-dd');
    const to = format(monthEnd, 'yyyy-MM-dd');
    request(`/api/todo-summary/summary/data?period=month&from=${from}&to=${to}`);
  }, [refreshKey, currentDate]);

  const prevMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  const goThisMonth = () => setCurrentDate(new Date());

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-warm-border">
        <div className="flex items-center gap-4">
          <button onClick={prevMonth} className="p-2 hover:bg-warm-secondary rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-medium text-sm">{format(currentDate, 'yyyy年M月')}</span>
          <button onClick={nextMonth} className="p-2 hover:bg-warm-secondary rounded-lg transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goThisMonth}
            className="px-3 py-2 border border-warm-border rounded-lg text-xs text-warm-text-secondary hover:bg-warm-secondary transition-colors"
          >
            本月
          </button>
          <input
            type="month"
            value={selectedMonth}
            onChange={e => {
              if (e.target.value) setCurrentDate(new Date(`${e.target.value}-01T00:00:00`));
            }}
            className="px-3 py-2 border border-warm-border rounded-lg text-xs text-warm-text-secondary bg-white outline-none focus:ring-2 focus:ring-warm-primary/20 focus:border-warm-primary"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-4">
        <PeriodSummaryList
          summary={summary}
          selectedTagId={selectedTagId}
          onSelectTag={setSelectedTagId}
          periodLabel="本月任务"
        />
      </div>
    </div>
  );
}
