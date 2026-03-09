const CONFIG = {
    SUPABASE_URL: 'https://gjuhnggtywwuziqtymmg.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqdWhuZ2d0eXd3dXppcXR5bW1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMDU1NTMsImV4cCI6MjA4Mjg4MTU1M30.3Wv8jfSjYBZ0BMKWn4jh1wEkDuYgiB0j-mXCOpADmQc',
    LIFF_ID: '2009380924-KARfpWqM',
    LINE_MESSAGE_API_URL: '/api/send-line-message',
    LINE_OFFICIAL_ID: '@ydz8706m',
    ADMIN_LINE_USER_ID: 'U509ad7911b7732bd8f0c5a9396c03d6f',
    BUSINESS_HOURS: {
        start: { hour: 10, minute: 0 },
        end: { hour: 19, minute: 0 }
    },
    SERVICE_DURATION_MINUTES: 150
};

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

let supabaseClient = null;
if (typeof supabase !== 'undefined' && CONFIG.SUPABASE_URL.startsWith('http')) {
    supabaseClient = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
    console.log('✅ Supabase initialized');
}

console.log('✅ config.js loaded');
