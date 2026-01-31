export const ALLOWED_USERS = [
  // 從環境變數 TG_BOT_TOKEN 取得 Bot ID (Token 前綴即為 ID)
  // 這樣避免將 ID 硬編碼在程式中，提升安全性
  { 
    id: process.env.TG_BOT_TOKEN ? process.env.TG_BOT_TOKEN.split(':')[0] : '8491288413', 
    username: 'ungetLai' 
  }, 
];
