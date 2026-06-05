import type { ToolPackageMeta } from '@shared/types';
import * as Tabs from '@radix-ui/react-tabs';
import { TodoProvider } from './context';
import { TodoListView } from './components/TodoListView';
import { WeekView } from './components/WeekView';
import { MonthView } from './components/MonthView';

export const todoSummaryMeta: ToolPackageMeta = {
  id: 'todo-summary',
  name: '事项看板',
  icon: '📋',
};

function MainPage() {
  return (
    <Tabs.Root defaultValue="todo" className="flex flex-col h-full">
      <Tabs.List className="flex border-b border-warm-border shrink-0">
        <Tabs.Trigger
          value="todo"
          className="px-4 py-3 text-sm text-warm-muted data-[state=active]:text-warm-primary data-[state=active]:border-b-2 data-[state=active]:border-warm-primary data-[state=active]:-mb-px transition-colors"
        >
          待办
        </Tabs.Trigger>
        <Tabs.Trigger
          value="week"
          className="px-4 py-3 text-sm text-warm-muted data-[state=active]:text-warm-primary data-[state=active]:border-b-2 data-[state=active]:border-warm-primary data-[state=active]:-mb-px transition-colors"
        >
          周视图
        </Tabs.Trigger>
        <Tabs.Trigger
          value="month"
          className="px-4 py-3 text-sm text-warm-muted data-[state=active]:text-warm-primary data-[state=active]:border-b-2 data-[state=active]:border-warm-primary data-[state=active]:-mb-px transition-colors"
        >
          月视图
        </Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content value="todo" className="flex-1 overflow-hidden">
        <TodoListView />
      </Tabs.Content>
      <Tabs.Content value="week" className="flex-1 overflow-hidden">
        <WeekView />
      </Tabs.Content>
      <Tabs.Content value="month" className="flex-1 overflow-hidden">
        <MonthView />
      </Tabs.Content>
    </Tabs.Root>
  );
}

export function TodoSummaryPage() {
  return (
    <TodoProvider>
      <MainPage />
    </TodoProvider>
  );
}
