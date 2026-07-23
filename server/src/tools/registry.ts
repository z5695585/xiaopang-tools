import { Router } from 'express';
import type { ToolPackageMeta } from '@shared/types';
import tagsRouter from '../routes/tags';
import todosRouter from '../routes/todos';
import summaryRouter from '../routes/summary';
import backupRouter from '../routes/backup';
import aiCaptureRouter from '../routes/ai-capture';

export interface ServerToolPackage {
  meta: ToolPackageMeta;
  apiRouter?: Router;
}

const todoSummaryMeta: ToolPackageMeta = {
  id: 'todo-summary',
  name: '事项看板',
  icon: '📋',
};

// 合并子路由到同一个工具包下（后续任务会添加更多子路由）
const mainRouter = Router();
mainRouter.use('/tags', tagsRouter);
mainRouter.use('/todos', todosRouter);
mainRouter.use('/summary', summaryRouter);
mainRouter.use('/backup', backupRouter);
mainRouter.use('/ai-capture', aiCaptureRouter);

export const toolRegistrations: ServerToolPackage[] = [
  { meta: todoSummaryMeta, apiRouter: mainRouter },
];
