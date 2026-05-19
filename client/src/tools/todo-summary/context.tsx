import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface TodoContextValue {
  refresh: () => void;
  refreshKey: number;
}

const TodoCtx = createContext<TodoContextValue | null>(null);

export function TodoProvider({ children }: { children: ReactNode }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  return (
    <TodoCtx.Provider value={{ refresh, refreshKey }}>
      {children}
    </TodoCtx.Provider>
  );
}

export function useTodoContext() {
  const ctx = useContext(TodoCtx);
  if (!ctx) throw new Error('useTodoContext must be used within TodoProvider');
  return ctx;
}
