import type { ComponentType } from 'react';
import type { ToolPackageMeta } from '@shared/types';
import { todoSummaryMeta, TodoSummaryPage } from './todo-summary';

export interface ClientToolPackage {
  meta: ToolPackageMeta;
  component: ComponentType;
}

export const toolPackages: ClientToolPackage[] = [
  { meta: todoSummaryMeta, component: TodoSummaryPage },
];
