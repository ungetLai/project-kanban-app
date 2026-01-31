# 🦞 專案開發看板 (PARA 擴充版)

一個支援拖放功能的 Kanban 看板專案管理工具，整合 Upstash Redis 儲存。

## ✨ 功能

- ✅ 六個工作流程階段：Backlog → Todo → Ongoing → Pending → Review → Done
- ✅ 拖放式任務管理（支援跨欄位拖曳）
- ✅ 即時自動儲存到雲端（Upstash Redis）
- ✅ 新增任務功能
- ✅ 任務計數顯示
- ✅ 響應式設計

## 🚀 技術棧

- **前端**: React 18 + Vite
- **拖放**: @dnd-kit
- **儲存**: Upstash Redis (Vercel Integration)
- **部署**: Vercel
- **圖示**: Lucide React

## 📦 安裝與開發

```bash
# 安裝依賴
npm install

# 本地開發
npm run dev

# 建置
npm run build
```

## ☁️ Vercel 部署設定

### 1. 部署專案到 Vercel

```bash
# 推送到 GitHub
git push origin main
```

### 2. 在 Vercel Dashboard 啟用 Upstash Redis

1. 前往 [Vercel Dashboard](https://vercel.com/dashboard)
2. 選擇您的專案
3. 點選 **Storage** 或 **Integrations**
4. 搜尋並新增 **Upstash Redis**
5. 點擊 **Create Database** 建立新的 Redis 資料庫
6. 選擇區域（建議選擇離您使用者最近的地區）
7. 環境變數會自動注入到專案中：
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`

### 3. 重新部署

整合完成後，Vercel 會自動重新部署。

## 🔧 API Endpoints

詳細 API 文件請參閱 [API.md](./API.md)。

### GET /api/tasks
取得所有任務 (支援過濾)

### POST /api/tasks
新增任務

### PUT /api/tasks
更新任務

### DELETE /api/tasks
刪除任務

## 📁 專案結構

```
project-kanban-app/
├── api/
│   └── tasks.js          # Serverless API (Upstash Redis)
├── src/
│   ├── App.jsx           # 主應用程式
│   ├── App.css           # 樣式
│   └── main.jsx          # Entry point
├── public/
├── vercel.json           # Vercel 配置
├── .env.example          # 環境變數範例
└── package.json
```

## 🎯 使用說明

1. **新增任務**: 點擊欄位底部的「新增任務」按鈕
2. **移動任務**: 拖曳任務卡片到目標欄位
3. **自動儲存**: 所有變更會自動儲存到雲端
4. **儲存狀態**: 右上角會顯示儲存狀態

## 🔒 安全性

- API 使用 Upstash Redis REST API
- 環境變數由 Vercel 安全管理
- CORS 已設定為允許所有來源（生產環境建議限制）

## 📝 待開發功能

- [ ] 任務編輯功能
- [ ] 任務刪除功能
- [ ] 任務優先級
- [ ] 標籤系統
- [ ] 多人協作
- [ ] 任務搜尋/過濾
- [ ] 匯出功能

## 👨‍💻 開發者

**零缺點 (ungetLai)**  
GitHub: https://github.com/ungetLai

## 📄 授權

MIT License

---

🦞 由龍蝦幫幫主協助開發
