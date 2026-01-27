// config.js - 配置檔案

const CONFIG = {
    SUPABASE_URL: 'https://alkuncpbqslksxeorndz.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsa3VuY3BicXNsa3N4ZW9ybmR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMzg0MjIsImV4cCI6MjA4MjkxNDQyMn0.Q-HxirPEavixO-tW6hRp6Rz6fFLrWMqfCU3kEKcrRAg',
    LIFF_ID: '2008856015-4bLaPE5n',
    LINE_MESSAGE_API_URL: '/api/send-line-message',  // ← 加這行
    LINE_OFFICIAL_ID: '@229lgsmd',
    BUSINESS_HOURS: {
        start: { hour: 10, minute: 0 },
        end: { hour: 19, minute: 0 }
    },
    SERVICE_DURATION_MINUTES: 150
};

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// 初始化 Supabase Client
let supabaseClient = null;
if (typeof supabase !== 'undefined' && CONFIG.SUPABASE_URL.startsWith('http')) {
    supabaseClient = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
    console.log('✅ Supabase initialized');
}

console.log('✅ config.js loaded');
