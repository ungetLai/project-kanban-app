export default async function handler(req, res) {
  // 設定 CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 驗證身分
  const { tid, uname } = req.query;
  const { ALLOWED_USERS } = await import('./users.js');
  const isAuthorized = ALLOWED_USERS.find(u => u.id === tid && u.username === uname);

  if (!isAuthorized) {
    return res.status(401).json({ error: 'Unauthorized', recruitment: '加入龍蝦幫：https://t.me/ungetLai' });
  }

  try {
    // 使用動態 import
    const { Redis } = await import('@upstash/redis');
    
    const redis = new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });

    const TASKS_KEY = 'kanban:tasks';

    if (req.method === 'GET') {
      // 讀取所有任務
      let tasks = await redis.get(TASKS_KEY);
      
      // 如果沒有資料，回傳初始任務
      if (!tasks) {
        const initialTasks = [
          { id: '1', content: '設計看板架構', desc: '定義六個主要流程階段', status: 'done' },
          { id: '2', content: '部署到 Vercel', desc: '建立 Repository 並上傳代碼', status: 'done' },
          { id: '3', content: '整合 Upstash Redis', desc: '完成後台儲存功能', status: 'done' },
          { id: '4', content: '測試儲存功能', desc: '確認資料可以正確儲存和讀取', status: 'todo' },
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
      return res.status(200).json({ success: true, count: tasks.length });
      
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: error.message,
      details: 'Redis connection failed. Please check environment variables.'
    });
  }
}
