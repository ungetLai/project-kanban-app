# 🦞 龍蝦幫專案看板 (Lobster Kanban App)

> **「江湖險惡，唯有看板能救你的專案。」**  
> 這是一個為龍蝦幫（Lobster Gang）量身打造的高級專案管理工具，集成了強大的拖放功能、即時同步與 AI 擴展預留。

![License](https://img.shields.io/github/license/ungetLai/project-kanban-app)
![Vercel](https://img.shields.io/badge/deployed-Vercel-black?logo=vercel)
![Redis](https://img.shields.io/badge/database-Upstash_Redis-red?logo=redis)

## ✨ 強大功能 (Feature Highlights)

- 🦞 **六大流程階段**：`BackLog` → `Todo` → `onGoing` → `Pending` → `Review` → `Done` (及歷史存檔區)。
- 🖱️ **極致拖放體驗**：基於 `@dnd-kit` 實作的流暢拖拽，支援跨欄位與排序。
- 📝 **完整 CRUD 操作**：
  - 雙擊卡片快速編輯。
  - 右鍵點擊快速刪除（附帶確認）。
  - 詳細的任務表單：支援專案分類、優先級（P0-P3）、自定義標籤。
- 📜 **操作歷史回溯**：完整記錄任務的變更歷史，透明化協作過程。
- 🌗 **自動暗黑模式**：質感設計，保護長時間盯著看板的眼睛。
- ☁️ **雲端即時儲存**：整合 Upstash Redis，數據變動即時更新。
- 🔒 **身分權限驗證**：專為龍蝦幫成員設計的 URL 參數驗證與自定義密令驗證。

## 🚀 技術棧 (Tech Stack)

- **核心**: [React 18](https://reactjs.org/) + [Vite](https://vitejs.dev/)
- **拖放引擎**: [@dnd-kit](https://dnd-kit.com/)
- **後端 (Serverless)**: [Vercel Functions](https://vercel.com/docs/functions)
- **資料庫**: [Upstash Redis](https://upstash.com/)
- **樣式**: Vanilla CSS (Premium Aesthetics)
- **圖示**: [Lucide React](https://lucide.dev/)

## 📦 快速開始 (Quick Start)

### 1. 本地開發

```bash
# 安裝依賴
npm install

# 複製環境變數範例並設定 (請參考 .env.example)
cp .env.example .env

# 啟動開發伺服器
npm run dev
```

### 2. 環境變數設定

確保您的 Vercel 專案設定了以下環境變數：
- `KV_REST_API_URL`: Upstash Redis URL
- `KV_REST_API_TOKEN`: Upstash Redis Token
- `ADMIN_TG_ID`: 管理員 Telegram ID
- `ADMIN_USERNAME`: 管理員 Telegram 使用者名稱
- `AUTH_SALT`: (選填) 加強驗證安全性的鹽值

## 🎯 使用說明 (Usage)

### 存取方式
系統採參數式驗證，請確保網址帶有正確的 `tid` 與 `uname`：
`https://your-app.vercel.app/?tid=YOUR_ID&uname=YOUR_NAME`

### 操作捷徑
- **新增**: 欄位底部「新增任務」。
- **編輯**: 雙擊卡片。
- **刪除**: 右鍵點擊卡片。
- **查看歷史**: 點擊卡片右上角的時鐘圖示。

## 🗺️ 開發藍圖 (Roadmap)

- [x] **任務 CRUD 功能** (Completed)
- [x] **優先級與標籤系統** (Completed)
- [x] **操作歷史紀錄** (Completed)
- [ ] **AI 智能任務拆解**：自動將 Backlog 拆解為具體步驟。
- [ ] **AI 智能標籤建議**：根據描述內容自動推薦 Tag。
- [ ] **音效回饋 (Haptic/Audio)**：增強拖拽的體感。

## 👨‍💻 開發者 (Creator)

**龍蝦幫幫主 (ungetLai)**  
- GitHub: [ungetLai](https://github.com/ungetLai)
- Telegram: [龍蝦幫](https://t.me/ungetLai)

## 📄 授權 (License)

MIT License - 隨便拿去用，但記得註名出處，這是江湖道義。

---

*由龍蝦幫幫主 Nexora 協助校稿與資安加固。* 🦞
