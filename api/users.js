export const ALLOWED_USERS = [
  // 優先使用環境變數設定管理員，避免硬編碼
  { 
    id: process.env.ADMIN_TG_ID || (process.env.TG_BOT_TOKEN ? process.env.TG_BOT_TOKEN.split(':')[0] : '8491288413'), 
    username: process.env.ADMIN_USERNAME || 'ungetLai' 
  }, 
];
