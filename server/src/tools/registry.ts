import { Router } from 'express';
import type { ToolPackageMeta } from '@shared/types';
import todoSummaryRouter from '../routes/health';

export interface ServerToolPackage {
  meta: ToolPackageMeta;
  apiRouter?: Router;
}

// 待办工具一期只搭壳，复用 health 路由占位
const todoSummaryMeta: ToolPackageMeta = {
  id: 'todo-summary',
  name: '待办 & 总结',
  icon: '📋',
};

export const toolRegistrations: ServerToolPackage[] = [
  { meta: todoSummaryMeta, apiRouter: todoSummaryRouter },
];
