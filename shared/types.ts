// 工具包元信息 —— 前后端共享的纯类型
export interface ToolPackageMeta {
  id: string;
  name: string;
  icon: string;
}

// 统一 API 响应格式
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// === 二期：事项看板工具包 ===

export interface Todo {
  id: number;
  parent_id: number | null;
  title: string;
  description: string;
  priority: '高' | '中' | '低';
  due_date: string | null;
  planned_date: string | null;
  completed: number;
  completed_at: string | null;
  sort_order: number;
  is_risk: number;
  is_focus: number;
  created_at: string;
  updated_at: string;
  tags?: Tag[];
  children?: Todo[];
}

export interface Tag {
  id: number;
  name: string;
  color: string;
  todo_count?: number;
}

export interface SummaryGroup {
  tag: Tag;
  completed: SummaryItem[];
  pending: SummaryItem[];
  risks: SummaryItem[];
  focus: SummaryItem[];
}

export interface SummaryItem {
  title: string;
  subCount: number;
  completedAt?: string;
  isManual?: boolean;
  isSub?: boolean;
  parentTitle?: string;
}

export interface SummaryData {
  period: string;
  groups: SummaryGroup[];
}

export interface CreateTodoInput {
  parent_id?: number | null;
  title: string;
  description?: string;
  priority?: '高' | '中' | '低';
  due_date?: string | null;
  planned_date?: string | null;
  tag_ids?: number[];
  is_risk?: number;
  is_focus?: number;
}

export interface UpdateTodoInput {
  title?: string;
  description?: string;
  priority?: '高' | '中' | '低';
  due_date?: string | null;
  planned_date?: string | null;
  completed?: number;
  is_risk?: number;
  is_focus?: number;
  tag_ids?: number[];
}

export interface ReorderInput {
  items: { id: number; sort_order: number }[];
}

// === GitHub 每日备份 ===

export interface BackupSettings {
  enabled: boolean;
  configured: boolean;
  repo: string | null;
  last_run_at: string | null;
  last_status: 'success' | 'error' | null;
  last_error: string | null;
}

// === AI 智能添加待办 ===

export interface TodoDraft {
  title: string;
  description: string;
  priority: '高' | '中' | '低';
  due_date: string | null;
  is_risk: number;
  is_focus: number;
}
