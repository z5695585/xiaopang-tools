import type { TodoDraft } from '@shared/types';

const DASHSCOPE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';

function buildSystemPrompt(): string {
  const today = new Date().toISOString().slice(0, 10);
  return `你是一个待办事项提炼助手。今天的日期是 ${today}。用户会给你一段邮件正文，请你从中提炼出用户需要处理的最主要一件事，只返回如下 JSON，不要有任何其他文字：
{
  "title": "简短的待办标题（祈使句，不超过30字）",
  "description": "相关的背景或细节说明",
  "priority": "高" 或 "中" 或 "低",
  "due_date": "YYYY-MM-DD 或 null（仅当邮件明确提到截止日期或可推算的相对日期，如"本周五"、"下周一"时才填写，请以今天的日期为基准换算成正确年份的绝对日期；邮件未提及时间信息则填 null）",
  "is_risk": 0 或 1（内容显得紧急/有风险时填 1，否则 0）,
  "is_focus": 0 或 1（内容显得重要需要重点关注时填 1，否则 0）
}`;
}

// 调用阿里云百炼（qwen-flash）从邮件正文中提炼一条待办草稿，供前端预填新建待办表单
export async function extractTodoFromEmail(text: string): Promise<TodoDraft> {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    throw new Error('未配置 DASHSCOPE_API_KEY 环境变量');
  }

  const res = await fetch(DASHSCOPE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'qwen-flash',
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user', content: text },
      ],
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    throw new Error(`AI 服务调用失败：${res.status} ${await res.text()}`);
  }

  const json = await res.json() as { choices?: { message: { content: string } }[] };
  const content = json.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('AI 未返回有效内容');
  }

  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('AI 返回的内容不是合法 JSON');
  }

  return {
    title: String(parsed.title || '').trim() || '未命名待办',
    description: String(parsed.description || ''),
    priority: ['高', '中', '低'].includes(parsed.priority) ? parsed.priority : '中',
    due_date: typeof parsed.due_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.due_date) ? parsed.due_date : null,
    is_risk: parsed.is_risk ? 1 : 0,
    is_focus: parsed.is_focus ? 1 : 0,
  };
}
