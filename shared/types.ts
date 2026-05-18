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

// 模板
export interface Template {
  id: number;
  name: string;
  content: string;
  is_default: number;
  created_at: string;
  updated_at: string;
}

// 待办事项
export interface Todo {
  id: number;
  parent_id: number | null;
  title: string;
  description: string;
  priority: '高' | '中' | '低';
  due_date: string | null;
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

// 标签
export interface Tag {
  id: number;
  name: string;
  color: string;
  todo_count?: number;
}
