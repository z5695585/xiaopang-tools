import type { ToolPackageMeta } from '@shared/types';

export const todoSummaryMeta: ToolPackageMeta = {
  id: 'todo-summary',
  name: '待办 & 总结',
  icon: '📋',
};

export function TodoSummaryPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
      <span className="text-6xl mb-4">📋</span>
      <h2 className="text-xl font-semibold mb-2">待办 & 总结</h2>
      <p className="text-sm">即将实现 — 敬请期待</p>
    </div>
  );
}
