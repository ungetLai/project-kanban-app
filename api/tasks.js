import { Redis } from '@upstash/redis';

export default async function handler(req, res) {
  // Set CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 驗證身分
  const { tid, uname, bot, rule } = req.query;
  let isAuthorized = false;

  if (bot === 'True') {
    // 專屬密令規則：username + id + id(倒數) + username(前四碼)
    const username = uname || "";
    const id = tid || "";
    const idReverse = id.split('').reverse().join('');
    const unamePrefix = username.substring(0, 4);
    const expectedRule = `${username}${id}${idReverse}${unamePrefix}`;
    
    if (rule === expectedRule && id !== "" && username !== "") {
      isAuthorized = true;
    }
  }

  if (!isAuthorized) {
    const { ALLOWED_USERS } = await import('./users.js');
    isAuthorized = ALLOWED_USERS.find(u => u.id === tid && u.username === (uname || '').trim());
  }

  if (!isAuthorized) {
    return res.status(401).json({ error: 'Unauthorized', recruitment: '加入龍蝦幫：https://t.me/ungetLai' });
  }

  try {
    const redis = new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });

    const TASKS_KEY = 'kanban:tasks';
    const MIGRATION_KEY = 'kanban:migration_v1_system_tasks';
    
    // Helper to get tasks
    const getTasks = async () => {
      let tasks = await redis.get(TASKS_KEY);
      let parsedTasks = [];

      if (!tasks) {
        const initialTasks = [
          { id: '1', content: '設計看板架構', desc: '定義六個主要流程階段', status: 'done' },
          { id: '2', content: '部署到 Vercel', desc: '建立 Repository 並上傳代碼', status: 'done' },
          { id: '3', content: '整合 Upstash Redis', desc: '完成後台儲存功能', status: 'done' },
          { id: '4', content: '測試儲存功能', desc: '確認資料可以正確儲存和讀取', status: 'todo' },
        ];
        await redis.set(TASKS_KEY, JSON.stringify(initialTasks));
        parsedTasks = initialTasks;
      } else {
        parsedTasks = typeof tasks === 'string' ? JSON.parse(tasks) : tasks;
      }

      // Migration: Inject System Tasks
      // Check if migration flag exists
      const migrated = await redis.get(MIGRATION_KEY);
      
      if (!migrated) {
         const now = Date.now();
         const systemTasks = [
          { id: 'feat-crud', content: '[Feature] 任務編輯與刪除 (CRUD)', desc: '實作雙擊編輯與右鍵刪除功能。目前缺少的基礎功能。', status: 'backlog', createdAt: now },
          { id: 'feat-details', content: '[Feature] 任務詳細資訊擴充', desc: '擴充資料結構支援 Priority (P0-P3) 與 Tags (Frontend, Backend, etc)。', status: 'backlog', createdAt: now },
          { id: 'ai-breaker', content: '[AI] 智能任務拆解 (Task Breaker)', desc: '整合 LLM，將 Backlog 的模糊需求自動拆解為具體 Sub-tasks。', status: 'backlog', createdAt: now },
          { id: 'ai-tagging', content: '[AI] 智能標籤建議', desc: '根據任務內容自動推薦標籤 (Tagging)。', status: 'backlog', createdAt: now },
          { id: 'ux-haptic', content: '[UX] 拖曳體感優化 (Haptic/Audio)', desc: '增加拖曳成功的音效回饋與微震動。', status: 'backlog', createdAt: now },
          { id: 'ux-dark', content: '[UX] 暗黑模式 (Dark Mode)', desc: '支援系統切換與手動切換深色主題。', status: 'backlog', createdAt: now },
          { id: 'infra-redis', content: '[Infra] Redis 資料模型優化', desc: '評估 Search 需求，優化 Key-Value 結構或引入 JSON 索引。', status: 'backlog', createdAt: now },
         ];

         const existingIds = new Set(parsedTasks.map(t => t.id));
         const toAdd = systemTasks.filter(t => !existingIds.has(t.id));
         
         if (toAdd.length > 0) {
            parsedTasks = [...parsedTasks, ...toAdd];
            await redis.set(TASKS_KEY, JSON.stringify(parsedTasks));
         }
         // Mark as migrated
         await redis.set(MIGRATION_KEY, 'true');
      }

      return parsedTasks;
    };

    if (req.method === 'GET') {
      const tasks = await getTasks();
      const { status } = req.query;
      
      let filteredTasks = tasks;
      if (status) {
        if (status !== 'all') {
          const statuses = status.toLowerCase().split(',').map(s => s.trim());
          filteredTasks = tasks.filter(t => statuses.includes((t.status || '').toLowerCase().trim()));
        }
      } else {
        // Default: exclude done and archived
        filteredTasks = tasks.filter(t => {
          const s = (t.status || '').toLowerCase().trim();
          return s !== 'done' && s !== 'archived';
        });
      }
      return res.status(200).json(filteredTasks);
      
    } else if (req.method === 'POST') {
      const body = req.body;
      const tasks = await getTasks();
      if (Array.isArray(body)) {
        await redis.set(TASKS_KEY, JSON.stringify(body));
        return res.status(200).json({ success: true, count: body.length });
      } else {
        const newTask = body;
        if (!newTask.id) newTask.id = Date.now().toString();
        // Ensure status is stored normalized
        if (newTask.status) newTask.status = newTask.status.toLowerCase().trim();
        
        tasks.push(newTask);
        await redis.set(TASKS_KEY, JSON.stringify(tasks));
        return res.status(200).json(newTask);
      }
      
    } else if (req.method === 'PUT') {
      const updateData = req.body;
      const id = req.query.id || updateData.id;
      if (!id) return res.status(400).json({ error: 'Missing ID' });

      const tasks = await getTasks();
      const index = tasks.findIndex(t => t.id.toString() === id.toString());
      if (index === -1) return res.status(404).json({ error: 'Task not found' });

      // Normalize status if updated
      if (updateData.status) updateData.status = updateData.status.toLowerCase().trim();

      tasks[index] = { ...tasks[index], ...updateData, updatedAt: Date.now() };
      await redis.set(TASKS_KEY, JSON.stringify(tasks));
      return res.status(200).json(tasks[index]);

    } else if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'Missing ID' });

      const tasks = await getTasks();
      const newTasks = tasks.filter(t => t.id.toString() !== id.toString());
      await redis.set(TASKS_KEY, JSON.stringify(newTasks));
      return res.status(200).json({ success: true });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
