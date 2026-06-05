import { useRef, useState, useEffect } from 'react';
import { Search, Plus, ChevronDown, ChevronRight, AlertTriangle, Star, Download, Upload } from 'lucide-react';
import type { Todo, Tag } from '@shared/types';
import { useTodoContext } from '../context';
import { useApi } from '@/hooks/useApi';
import { TodoForm } from './TodoForm';
import { TodoRow } from './TodoRow';
import { TagManage } from './TagManage';

type FilterTab = 'active' | 'completed';

interface TodoGroup {
  key: string;
  label: string;
  todos: Todo[];
  defaultOpen?: boolean;
}

interface ArchiveMonth {
  month: string;
  count: number;
}

function dateKey(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : '';
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysFromToday(date: string | null | undefined): number | null {
  if (!date) return null;
  const today = startOfToday();
  const target = new Date(`${date.slice(0, 10)}T00:00:00`);
  return Math.floor((target.getTime() - today.getTime()) / 86400000);
}

function monthLabel(value: string): string {
  const [year, month] = value.split('-');
  return `${year}年${Number(month)}月`;
}

function groupActiveTodos(todos: Todo[]): TodoGroup[] {
  const groups: TodoGroup[] = [
    { key: 'overdue', label: '已逾期', todos: [], defaultOpen: true },
    { key: 'today', label: '今天', todos: [], defaultOpen: true },
    { key: 'week', label: '本周', todos: [], defaultOpen: true },
    { key: 'next-week', label: '下周', todos: [] },
    { key: 'later', label: '更晚', todos: [] },
    { key: 'unscheduled', label: '未排期', todos: [] },
  ];

  for (const todo of todos) {
    const offset = daysFromToday(todo.due_date);
    if (offset === null) groups[5].todos.push(todo);
    else if (offset < 0) groups[0].todos.push(todo);
    else if (offset === 0) groups[1].todos.push(todo);
    else if (offset <= 7) groups[2].todos.push(todo);
    else if (offset <= 14) groups[3].todos.push(todo);
    else groups[4].todos.push(todo);
  }

  return groups
    .map(group => ({
      ...group,
      todos: group.todos.sort((a, b) => dateKey(a.due_date).localeCompare(dateKey(b.due_date))),
    }))
    .filter(group => group.todos.length > 0);
}

function TodoGroupSection({
  group,
  tab,
  onEdit,
  onEditSub,
  onAddSub,
}: {
  group: TodoGroup;
  tab: FilterTab;
  onEdit: (todo: Todo) => void;
  onEditSub: (todo: Todo) => void;
  onAddSub: (todo: Todo) => void;
}) {
  const [open, setOpen] = useState(group.defaultOpen ?? tab === 'active');

  useEffect(() => {
    setOpen(group.defaultOpen ?? tab === 'active');
  }, [group.key, tab]);

  return (
    <section className="border-b border-warm-border last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-6 py-3 bg-warm-page hover:bg-warm-secondary transition-colors text-left"
      >
        {open ? <ChevronDown className="w-4 h-4 text-warm-muted" /> : <ChevronRight className="w-4 h-4 text-warm-muted" />}
        <span className="text-sm font-medium text-warm-text">{group.label}</span>
        <span className="text-xs text-warm-muted">{group.todos.length}</span>
      </button>
      {open && (
        <div>
          {group.todos.map((todo, index) => (
            <TodoRow
              key={todo.id}
              todo={todo}
              index={index}
              onEdit={() => onEdit(todo)}
              onEditSub={onEditSub}
              onAddSub={() => onAddSub(todo)}
              onDragStart={() => undefined}
              onDragEnter={() => undefined}
              onDragEnd={() => undefined}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ActiveAttentionPanel({
  title,
  todos,
  kind,
  onEdit,
}: {
  title: string;
  todos: Todo[];
  kind: 'risk' | 'focus';
  onEdit: (todo: Todo) => void;
}) {
  const Icon = kind === 'risk' ? AlertTriangle : Star;

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-warm-text">
        <Icon className="w-4 h-4 text-warm-primary" />
        <span>{title}</span>
        <span className="text-xs text-warm-muted">{todos.length}</span>
      </div>
      {todos.length === 0 ? (
        <div className="border border-dashed border-warm-border rounded-lg px-4 py-5 text-sm text-warm-muted bg-white">
          暂无内容
        </div>
      ) : (
        <div className="border border-warm-border rounded-lg overflow-hidden bg-white">
          {todos.map(todo => (
            <button
              key={todo.id}
              type="button"
              onClick={() => onEdit(todo)}
              className="w-full flex items-center gap-3 px-4 py-3 border-b border-warm-border last:border-b-0 hover:bg-warm-page transition-colors text-left"
            >
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: todo.tags?.[0]?.color || '#9CA3AF' }} />
              <div className="min-w-0 flex-1">
                <div className="text-sm text-warm-text truncate">{todo.title}</div>
                <div className="text-xs text-warm-muted mt-0.5 truncate">
                  {(todo.tags || []).map(tag => tag.name).join('、') || '无标签'}
                  {todo.due_date ? ` · 截止 ${todo.due_date.slice(5)}` : ''}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function lastDayOfMonth(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  const last = new Date(year, monthNumber, 0).getDate();
  return `${month}-${String(last).padStart(2, '0')}`;
}

function CompletedArchiveSection({
  month,
  count,
  selectedTagId,
  search,
  refreshKey,
  onEdit,
  onEditSub,
  onAddSub,
}: {
  month: string;
  count: number;
  selectedTagId: number | null;
  search: string;
  refreshKey: number;
  onEdit: (todo: Todo) => void;
  onEditSub: (todo: Todo) => void;
  onAddSub: (todo: Todo) => void;
}) {
  const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const [open, setOpen] = useState(month === currentMonth);
  const { data: todos, loading, request } = useApi<Todo[]>();

  useEffect(() => {
    setOpen(month === currentMonth);
  }, [month, currentMonth, selectedTagId, search]);

  useEffect(() => {
    if (!open) return;
    const params = new URLSearchParams();
    params.set('status', 'completed');
    params.set('from', `${month}-01`);
    params.set('to', lastDayOfMonth(month));
    params.set('page_size', '200');
    if (selectedTagId !== null) params.set('tag_id', String(selectedTagId));
    if (search.trim()) params.set('search', search.trim());
    request(`/api/todo-summary/todos?${params}`);
  }, [open, month, selectedTagId, search, refreshKey]);

  return (
    <section className="border-b border-warm-border last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-6 py-3 bg-warm-page hover:bg-warm-secondary transition-colors text-left"
      >
        {open ? <ChevronDown className="w-4 h-4 text-warm-muted" /> : <ChevronRight className="w-4 h-4 text-warm-muted" />}
        <span className="text-sm font-medium text-warm-text">{monthLabel(month)}</span>
        <span className="text-xs text-warm-muted">{count}</span>
      </button>
      {open && (
        <div>
          {loading && (
            <div className="px-6 py-4 text-sm text-warm-muted">加载中...</div>
          )}
          {(todos || []).map((todo, index) => (
            <TodoRow
              key={todo.id}
              todo={todo}
              index={index}
              onEdit={() => onEdit(todo)}
              onEditSub={onEditSub}
              onAddSub={() => onAddSub(todo)}
              onDragStart={() => undefined}
              onDragEnter={() => undefined}
              onDragEnd={() => undefined}
            />
          ))}
          {!loading && (todos || []).length === 0 && (
            <div className="px-6 py-4 text-sm text-warm-muted">暂无内容</div>
          )}
        </div>
      )}
    </section>
  );
}

export function TodoListView() {
  const { refreshKey, refresh } = useTodoContext();
  const { data: todos, request } = useApi<Todo[]>();
  const { data: archiveMonths, request: loadArchiveMonths } = useApi<ArchiveMonth[]>();
  const { data: tags, request: loadTags } = useApi<Tag[]>();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<FilterTab>('active');
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editTodo, setEditTodo] = useState<Todo | null>(null);
  const [addSubFor, setAddSubFor] = useState<Todo | null>(null);
  const [showTagManage, setShowTagManage] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (tab === 'completed') return;
    const params = new URLSearchParams();
    params.set('status', tab);
    if (selectedTagId !== null) params.set('tag_id', String(selectedTagId));
    request(`/api/todo-summary/todos?${params}`);
  }, [refreshKey, tab, selectedTagId]);

  useEffect(() => {
    if (tab !== 'completed') return;
    const params = new URLSearchParams();
    if (selectedTagId !== null) params.set('tag_id', String(selectedTagId));
    if (search.trim()) params.set('search', search.trim());
    loadArchiveMonths(`/api/todo-summary/todos/archive/months?${params}`);
  }, [refreshKey, tab, selectedTagId, search]);

  useEffect(() => {
    loadTags('/api/todo-summary/tags');
  }, [refreshKey]);

  const filtered = (todos || []).filter(t =>
    search ? t.title.toLowerCase().includes(search.toLowerCase()) : true
  );
  const groups = groupActiveTodos(filtered);
  const activeCount = filtered.filter(t => t.completed === 0).length;
  const completedCount = (archiveMonths || []).reduce((sum, month) => sum + month.count, 0);
  const activeRisks = filtered.filter(t => t.is_risk === 1);
  const activeFocus = filtered.filter(t => t.is_focus === 1);

  const handleExport = async () => {
    const password = sessionStorage.getItem('auth_password') || '';
    const res = await fetch('/api/todo-summary/backup/export', {
      headers: { 'x-auth-password': password },
    });
    if (!res.ok) {
      alert('导出失败，请稍后重试');
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    link.href = url;
    link.download = `xiaopang-backup-${stamp}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (file: File) => {
    if (!confirm('导入备份会替换当前所有待办、标签和模板数据，确定继续？')) return;
    const password = sessionStorage.getItem('auth_password') || '';
    const text = await file.text();
    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch {
      alert('备份文件不是有效 JSON');
      return;
    }

    const res = await fetch('/api/todo-summary/backup/import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-password': password,
      },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!json.success) {
      alert(json.error || '导入失败');
      return;
    }
    alert('导入完成');
    refresh();
  };

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'active', label: '待完成' },
    { key: 'completed', label: '已完成' },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col gap-3 px-6 py-4 border-b border-warm-border">
        <div className="flex items-center gap-3">
          <div className="flex bg-warm-secondary rounded-lg p-0.5">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  tab === t.key ? 'bg-warm-primary text-white shadow-sm' : 'text-warm-muted hover:text-warm-text'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-1 bg-white border border-warm-border rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-warm-muted" />
            <input
              type="text"
              placeholder="搜索待办..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm"
            />
          </div>

          <button
            onClick={() => setShowTagManage(true)}
            className="px-3 py-2 border border-warm-border rounded-lg text-xs text-warm-text-secondary hover:bg-warm-secondary transition-colors shrink-0"
          >
            管理标签
          </button>

          <button
            onClick={handleExport}
            className="px-3 py-2 border border-warm-border rounded-lg text-xs text-warm-text-secondary hover:bg-warm-secondary transition-colors shrink-0 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            导出
          </button>

          <button
            onClick={() => importInputRef.current?.click()}
            className="px-3 py-2 border border-warm-border rounded-lg text-xs text-warm-text-secondary hover:bg-warm-secondary transition-colors shrink-0 flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            导入
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0];
              e.currentTarget.value = '';
              if (file) handleImportFile(file);
            }}
          />

          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-warm-primary hover:bg-warm-primary-hover text-white rounded-lg text-sm flex items-center gap-2 transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            添加待办
          </button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedTagId(null)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium border shrink-0 transition-colors ${
              selectedTagId === null ? 'bg-warm-primary text-white border-warm-primary' : 'bg-white text-warm-text-secondary border-warm-border hover:bg-warm-secondary'
            }`}
          >
            全部标签
          </button>
          {(tags || []).map(tag => (
            <button
              key={tag.id}
              onClick={() => setSelectedTagId(tag.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium border shrink-0 flex items-center gap-2 transition-colors ${
                selectedTagId === tag.id ? 'bg-warm-primary text-white border-warm-primary' : 'bg-white text-warm-text-secondary border-warm-border hover:bg-warm-secondary'
              }`}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />
              {tag.name}
              <span className={selectedTagId === tag.id ? 'text-white/80' : 'text-warm-muted'}>
                {tag.todo_count ?? 0}
              </span>
            </button>
          ))}
        </div>

        <div className="text-xs text-warm-muted">
          {tab === 'active'
            ? `当前列表 ${filtered.length} 条，待完成 ${activeCount} 条`
            : `已完成归档 ${(archiveMonths || []).length} 个月，共 ${completedCount} 条`}
        </div>
      </div>

      {tab === 'completed' ? (
        (archiveMonths || []).length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-warm-muted text-sm">
            暂无已完成事项
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            {(archiveMonths || []).map(month => (
              <CompletedArchiveSection
                key={`${month.month}-${selectedTagId ?? 'all'}-${search}-${refreshKey}`}
                month={month.month}
                count={month.count}
                selectedTagId={selectedTagId}
                search={search}
                refreshKey={refreshKey}
                onEdit={setEditTodo}
                onEditSub={setEditTodo}
                onAddSub={setAddSubFor}
              />
            ))}
          </div>
        )
      ) : groups.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-warm-muted text-sm">
          暂无待办事项
        </div>
      ) : (
        <div className="flex-1 overflow-hidden grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <div className="overflow-auto border-r border-warm-border">
            {groups.map(group => (
              <TodoGroupSection
                key={group.key}
                group={group}
                tab={tab}
                onEdit={setEditTodo}
                onEditSub={setEditTodo}
                onAddSub={setAddSubFor}
              />
            ))}
          </div>
          <aside className="overflow-auto px-5 py-4 space-y-5 bg-warm-page">
            <ActiveAttentionPanel title="风险关注" todos={activeRisks} kind="risk" onEdit={setEditTodo} />
            <ActiveAttentionPanel title="重点关注" todos={activeFocus} kind="focus" onEdit={setEditTodo} />
          </aside>
        </div>
      )}

      {showTagManage && <TagManage onClose={() => { setShowTagManage(false); refresh(); }} />}

      {(showForm || editTodo || addSubFor) && (
        <TodoForm
          todo={editTodo || undefined}
          parentId={addSubFor ? addSubFor.id : undefined}
          parentTodo={addSubFor || undefined}
          onClose={() => {
            setShowForm(false);
            setEditTodo(null);
            setAddSubFor(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}
