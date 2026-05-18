import { Router } from 'express';
import type { ToolPackageMeta } from '@shared/types';
import tagsRouter from '../routes/tags';

export interface ServerToolPackage {
  meta: ToolPackageMeta;
  apiRouter?: Router;
}

const todoSummaryMeta: ToolPackageMeta = {
  id: 'todo-summary',
  name: '待办 & 总结',
  icon: '📋',
};

// 合并子路由到同一个工具包下（后续任务会添加更多子路由）
const mainRouter = Router();
mainRouter.use('/tags', tagsRouter);

export const toolRegistrations: ServerToolPackage[] = [
  { meta: todoSummaryMeta, apiRouter: mainRouter },
];
