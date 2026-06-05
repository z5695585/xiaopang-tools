import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays, startOfWeek } from 'date-fns';
import type { SummaryData } from '@shared/types';
import { useApi } from '@/hooks/useApi';
import { useTodoContext } from '../context';
import { PeriodSummaryList } from './PeriodSummaryList';

export function WeekView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);
  const { data: summary, request } = useApi<SummaryData>();
  const { refreshKey } = useTodoContext();

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekLabel = `${format(weekStart, 'yyyy年M月d日')} - ${format(addDays(weekStart, 6), 'M月d日')}`;
  const selectedDate = format(currentDate, 'yyyy-MM-dd');

  useEffect(() => {
    const from = format(weekStart, 'yyyy-MM-dd');
    const to = format(addDays(weekStart, 6), 'yyyy-MM-dd');
    request(`/api/todo-summary/summary/data?period=week&from=${from}&to=${to}`);
  }, [refreshKey, currentDate]);

  const prevWeek = () => setCurrentDate(d => addDays(d, -7));
  const nextWeek = () => setCurrentDate(d => addDays(d, 7));
  const goThisWeek = () => setCurrentDate(new Date());

  return (
    <div className="flex flex-col h-full relative">
      <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-warm-border">
        <div className="flex items-center gap-4">
          <button onClick={prevWeek} className="p-2 hover:bg-warm-secondary rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-medium text-sm">{weekLabel}</span>
          <button onClick={nextWeek} className="p-2 hover:bg-warm-secondary rounded-lg transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goThisWeek}
            className="px-3 py-2 border border-warm-border rounded-lg text-xs text-warm-text-secondary hover:bg-warm-secondary transition-colors"
          >
            本周
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={e => {
              if (e.target.value) setCurrentDate(new Date(`${e.target.value}T00:00:00`));
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
          periodLabel="本周任务"
        />
      </div>
    </div>
  );
}
