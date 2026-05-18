import { useState, useEffect } from 'react';
import type { SummaryData } from '@shared/types';
import { useTodoContext } from '../context';
import { useApi } from '@/hooks/useApi';
import { SummaryModal } from './SummaryModal';

type Period = 'week' | 'month';

export function WeekMonthView() {
  const { setView } = useTodoContext();
  const { data: summaryData, request } = useApi<SummaryData>();
  const [period, setPeriod] = useState<Period>('week');
  const [showSummary, setShowSummary] = useState(false);

  useEffect(() => {
    request(`/api/todo-summary/summary/data?period=${period}`);
  }, [period]);

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      {/* 时间切换 */}
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold">📊 工作总结</h2>
        <div className="flex gap-1 ml-4">
          {(['week', 'month'] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium ${period === p ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
              {p === 'week' ? '本周' : '本月'}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <button onClick={() => setShowSummary(true)}
          className="px-4 py-2 bg-purple-500 text-white rounded-md text-sm font-medium hover:bg-purple-600">
          🤖 生成{period === 'week' ? '周报' : '月报'}
        </button>
      </div>

      {/* 数据展示 */}
      {summaryData ? (
        <div className="space-y-6">
          <p className="text-sm text-slate-500">{summaryData.period}</p>
          {summaryData.groups.map((g, i) => (
            <div key={i}>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: g.tag.color }} />
                <h3 className="font-semibold text-sm">{g.tag.name}</h3>
                <span className="text-xs text-slate-400">完成 {g.completed.length} · 进行中 {g.pending.length}</span>
              </div>
              <div className="ml-4 space-y-1">
                {g.completed.map((item, j) => (
                  <div key={j} className="flex items-center gap-2 text-sm text-slate-600">
                    <span className="text-green-500">✓</span> {item.title}
                    {item.subCount > 0 && <span className="text-xs text-slate-400">含 {item.subCount} 子项</span>}
                    {item.completedAt && <span className="text-xs text-slate-400 ml-auto">{item.completedAt.slice(0, 10)}</span>}
                  </div>
                ))}
                {g.pending.map((item, j) => (
                  <div key={j} className="flex items-center gap-2 text-sm text-slate-500">
                    <span className="text-amber-500">◷</span> {item.title}
                  </div>
                ))}
                {g.risks.map((item, j) => (
                  <div key={j} className="flex items-center gap-2 text-sm text-red-500">
                    ⚠ {item.title}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400 text-center py-8">加载中...</p>
      )}

      <button onClick={() => setView('list')} className="text-sm text-slate-500 hover:text-sky-500">← 返回待办列表</button>

      {showSummary && <SummaryModal period={period} onClose={() => setShowSummary(false)} />}
    </div>
  );
}
