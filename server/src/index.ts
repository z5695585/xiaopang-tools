import express from 'express';
import cors from 'cors';
import path from 'path';
import { getDb } from './db';
import { runMigrations } from './migrate';
import { toolRegistrations } from './tools/registry';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import authRouter from './routes/auth';
import settingsRouter from './routes/settings';
import { authMiddleware } from './middleware/auth';
import { runDailyBackupIfDue } from './services/githubBackup';

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json({ limit: '20mb' }));

// 静态文件（生产环境托管前端构建产物）
app.use(express.static(path.join(__dirname, '..', 'public')));

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { ok: true } });
});

// 鉴权
app.use('/api/auth', authRouter);
app.use('/api', authMiddleware);
app.use('/api/settings', settingsRouter);

// 注册工具包 API 路由
for (const tool of toolRegistrations) {
  if (tool.apiRouter) {
    app.use(`/api/${tool.meta.id}`, tool.apiRouter);
  }
}

// 错误处理（必须在路由之后）
app.use(notFoundHandler);
app.use(errorHandler);

// 启动数据库并运行迁移
const db = getDb();
runMigrations(db);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// GitHub 每日备份：启动后延迟检查一次，之后每小时检查一次是否需要补跑
setTimeout(() => { runDailyBackupIfDue().catch(err => console.error('[backup] check failed:', err)); }, 10_000);
setInterval(() => { runDailyBackupIfDue().catch(err => console.error('[backup] check failed:', err)); }, 60 * 60 * 1000);
