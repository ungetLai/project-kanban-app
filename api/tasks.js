import { Redis } from '@upstash/redis';

// 初始化 Redis client
// 環境變數會由 Vercel 自動注入
const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const TASKS_KEY = 'kanban:tasks';

export default async function handler(req, res) {
  // 設定 CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      // 讀取所有任務
      const tasks = await redis.get(TASKS_KEY);
      
      // 如果沒有資料，回傳初始任務
      if (!tasks) {
        const initialTasks = [
          { id: '1', content: '設計看板架構', desc: '定義六個主要流程階段', status: 'done' },
          { id: '2', content: '部署到 GitHub', desc: '建立 Repository 並上傳初步代碼', status: 'ongoing' },
          { id: '3', content: '整合 PARA 系統', desc: '讓看板任務可以自動歸類到 Archives', status: 'todo' },
        ];
        await redis.set(TASKS_KEY, JSON.stringify(initialTasks));
        return res.status(200).json(initialTasks);
      }

      const parsedTasks = typeof tasks === 'string' ? JSON.parse(tasks) : tasks;
      return res.status(200).json(parsedTasks);
      
    } else if (req.method === 'POST') {
      // 儲存任務
      const tasks = req.body;
      await redis.set(TASKS_KEY, JSON.stringify(tasks));
      return res.status(200).json({ success: true, tasks });
      
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
