# 本地開發測試指南

## 本地測試 (不需要 Redis)

如果您想在本地測試，可以使用 localStorage 暫時替代：

### 1. 建立本地版本的 API Mock

在 `src` 目錄建立 `api-mock.js`:

```javascript
const STORAGE_KEY = 'kanban-tasks-local';

export const mockApi = {
  async getTasks() {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      const initial = [
        { id: '1', content: '設計看板架構', desc: '定義六個主要流程階段', status: 'done' },
        { id: '2', content: '部署到 Vercel', desc: '建立 Repository 並上傳代碼', status: 'done' },
        { id: '3', content: '整合 Upstash Redis', desc: '完成後台儲存功能', status: 'done' },
      ];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(data);
  },
  
  async saveTasks(tasks) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    return { success: true };
  }
};
```

### 2. 修改 App.jsx（開發模式）

```javascript
// 在 App.jsx 最上方加入
const USE_LOCAL = import.meta.env.DEV; // 開發模式使用本地
```

## Vercel 環境變數檢查

執行以下命令檢查環境變數：

```bash
# 安裝 Vercel CLI
npm i -g vercel

# 登入
vercel login

# 檢查環境變數
vercel env ls
```

應該要看到：
- KV_REST_API_URL (Production, Preview, Development)
- KV_REST_API_TOKEN (Production, Preview, Development)

## 手動測試 Redis 連線

建立測試檔案 `test-redis.js`:

```javascript
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

async function test() {
  try {
    // 測試寫入
    await redis.set('test-key', 'Hello from 龍蝦幫!');
    
    // 測試讀取
    const value = await redis.get('test-key');
    console.log('✅ Redis 連線成功！');
    console.log('讀取值:', value);
    
    // 清理
    await redis.del('test-key');
  } catch (error) {
    console.error('❌ Redis 連線失敗:', error.message);
  }
}

test();
```

執行：
```bash
node test-redis.js
```
