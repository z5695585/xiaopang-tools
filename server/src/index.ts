import express from 'express';
import cors from 'cors';
import path from 'path';
import { getDb } from './db';
import { runMigrations } from './migrate';
import { toolRegistrations } from './tools/registry';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import authRouter from './routes/auth';
import { authMiddleware } from './middleware/auth';

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());

// 静态文件（生产环境托管前端构建产物）
app.use(express.static(path.join(__dirname, '..', 'public')));

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { ok: true } });
});

// 鉴权
app.use('/api/auth', authRouter);
app.use('/api', authMiddleware);

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
