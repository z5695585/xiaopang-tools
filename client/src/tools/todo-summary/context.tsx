import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

type View = 'list' | 'weekmonth' | 'tags' | 'templates';

interface TodoContextValue {
  view: View;
  setView: (v: View) => void;
  filter: string;
  setFilter: (f: string) => void;
  selectedTagId: number | null;
  setSelectedTagId: (id: number | null) => void;
  refresh: () => void;
  refreshKey: number;
}

const TodoCtx = createContext<TodoContextValue | null>(null);

export function TodoProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<View>('list');
  const [filter, setFilter] = useState('all');
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  return (
    <TodoCtx.Provider value={{ view, setView, filter, setFilter, selectedTagId, setSelectedTagId, refresh, refreshKey }}>
      {children}
    </TodoCtx.Provider>
  );
}

export function useTodoContext() {
  const ctx = useContext(TodoCtx);
  if (!ctx) throw new Error('useTodoContext must be used within TodoProvider');
  return ctx;
}
