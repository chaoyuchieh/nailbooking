// customer.js - 客戶端邏輯

console.log('🚀 customer.js 開始載入...');

// === 檢查依賴 ===
if (typeof CONFIG === 'undefined') {
    console.error('❌ CONFIG 未定義');
}

// === 全域變數 ===
let currentYear = today.getFullYear();
let currentMonth = today.getMonth();
let userProfile = null;
let liffInitialized = false;
let isFriend = false;

// 預約資料
let priceState = { design: 0, removal: 0, extras: 0 };
let bookingDetails = {
    design: { name: '', price: 0, keywords: [] },
    removal: { name: '', price: 0 },
    extras: []
};

// 計數器
let extensionCount = 0;
let repairCount = 0;
let unlimitedJumpCount = 0;
let bigDiamondCount = 0;
let nailPolishRemovalCount = 0;

// 選擇的日期時間
let selectedDate = null;
let selectedTime = null;
let currentTimeHour = 10;
let currentTimeMinute = 0;
let currentDateBookedTimes = [];

// === LINE 登入功能 ===
window.loginWithLine = async function() {
    console.log('🔐 loginWithLine called');
    sessionStorage.removeItem('manualLogout');
    
    if (CONFIG.LIFF_ID && CONFIG.LIFF_ID !== 'YOUR_LIFF_ID_HERE') {
        if (!liff.isLoggedIn()) {
            try {
                console.log('🔄 Redirecting to LINE login...');
                liff.login({ redirectUri: window.location.href });
            } catch (err) {
                console.error('❌ LINE login error:', err);
                alert("LINE 登入錯誤：\n" + err.message);
            }
        } else {
            try {
                console.log('✅ Already logged in, getting profile...');
                userProfile = await liff.getProfile();
                await window.checkFriendship();
                
                document.getElementById('login-overlay').classList.add('hidden');
                document.getElementById('main-app').classList.remove('hidden');
                
                window.updateUserStatus();
                await window.fetchCalendarData();
                
                document.getElementById('calendar-title').innerText = `${MONTH_NAMES[currentMonth]} ${currentYear}`;
                window.renderCalendar();
            } catch (e) {
                console.error('❌ Error getting LINE data:', e);
                alert("無法取得 LINE 資料：" + e.message);
            }
        }
    } else {
        alert("請設定 LIFF ID");
    }
};

// === 顯示登入畫面 ===
window.showLoginScreen = function() {
    document.getElementById('main-app').classList.add('hidden');
    document.getElementById('login-overlay').classList.remove('hidden');
};

// === 更新用戶狀態 ===
window.updateUserStatus = function() {
    const warningEl = document.getElementById('line-login-warning');
    const friendWarningEl = document.getElementById('friend-warning');
    const statusEl = document.getElementById('user-status');
    const userNameEl = document.getElementById('user-name');
    
    if (!userProfile || !userProfile.userId) {
        warningEl.classList.remove('hidden');
        friendWarningEl.classList.add('hidden');
        statusEl.innerText = '⚠️ 訪客模式（無法預約）';
        statusEl.classList.add('text-red-500', 'font-bold');
        userNameEl.innerText = '訪客';
    } else if (!isFriend) {
        warningEl.classList.add('hidden');
        friendWarningEl.classList.remove('hidden');
        statusEl.innerText = '⚠️ 建議加入 LINE 官方帳號';
        statusEl.classList.add('text-orange-500', 'font-bold');
        statusEl.classList.remove('text-green-600', 'text-red-500');
        userNameEl.innerText = userProfile.displayName;
    } else {
        warningEl.classList.add('hidden');
        friendWarningEl.classList.add('hidden');
        statusEl.innerText = '✓ LINE 帳號已連結';
        statusEl.classList.remove('text-red-500', 'text-orange-500');
        statusEl.classList.add('text-green-600');
        userNameEl.innerText = userProfile.displayName;
    }
};

// === 檢查好友狀態 ===
window.checkFriendship = async function() {
    if (!liffInitialized || !liff.isLoggedIn()) {
        console.warn("⚠️ LIFF 未初始化或未登入，跳過好友檢查");
        isFriend = true;
        return true;
    }
    
    try {
        const friendship = await liff.getFriendship();
        isFriend = friendship.friendFlag;
        console.log(isFriend ? "✅ 用戶已加為好友" : "❌ 用戶尚未加為好友");
        return isFriend;
    } catch (e) {
        console.error("⚠️ 無法檢查好友狀態", e);
        isFriend = true;
        return true;
    }
};

// === 加入好友 ===
window.addFriend = function() {
    if (CONFIG.LINE_OFFICIAL_ID && CONFIG.LINE_OFFICIAL_ID !== '@your_line_id') {
        window.open(`https://line.me/R/ti/p/${CONFIG.LINE_OFFICIAL_ID}`, '_blank');
    } else {
        alert("請先設定 LINE_OFFICIAL_ID");
    }
};

// === 重新檢查好友 ===
window.recheckFriendship = async function() {
    window.showLoading(true);
    await window.checkFriendship();
    window.updateUserStatus();
    window.showLoading(false);
    
    if (isFriend) {
        alert("✅ 已確認您是我們的好友！\n現在可以正常預約了。");
    } else {
        alert("❌ 尚未偵測到好友關係\n\n請確認：\n1. 已在 LINE 中加入我們的官方帳號\n2. 稍等片刻再試一次");
    }
};

// === 登出 ===
window.logout = function() {
    sessionStorage.setItem('manualLogout', 'true');
    try {
        if (typeof liff !== 'undefined' && liff.isLoggedIn()) {
            liff.logout();
        }
    } catch (e) {
        console.error('Logout error:', e);
    }
    location.reload();
};

// === 選擇單一選項 ===
window.selectSingleOption = function(el, price, group, name) {
    document.querySelectorAll(`button[data-group="${group}"]`).forEach(b => b.classList.remove('active'));
    
    if (group === 'design') {
        document.querySelectorAll('.rule-box').forEach(b => b.classList.add('hidden'));
        const k1 = document.getElementById('keyword1');
        const k2 = document.getElementById('keyword2');
        if (k1) k1.value = '';
        if (k2) k2.value = '';
    }
    
    el.classList.add('active');
    priceState[group] = price;
    
    if (group === 'design') {
        bookingDetails.design = { name: name || '', price: price, keywords: [] };
    } else if (group === 'removal') {
        bookingDetails.removal = { name: name || '', price: price };
    }
    
    window.updateUI();
    window.validate();
};

// === 切換卸甲需求 ===
window.toggleRemovalNeed = function(need, el) {
    document.querySelectorAll(`button[data-group="removal-need"]`).forEach(b => b.classList.remove('active'));
    el.classList.add('active');
    
    const removalOptions = document.getElementById('removal-options');
    const removalExtras = document.getElementById('removal-extras');
    
    if (need) {
        removalOptions.classList.remove('hidden');
        removalExtras.classList.remove('hidden');
    } else {
        removalOptions.classList.add('hidden');
        removalExtras.classList.add('hidden');
        document.querySelectorAll(`button[data-group="removal"]`).forEach(b => b.classList.remove('active'));
        priceState.removal = 0;
        bookingDetails.removal = { name: '無須卸甲', price: 0 };
        bigDiamondCount = 0;
        nailPolishRemovalCount = 0;
        const bigDiamondEl = document.getElementById('big-diamond-count');
        const polishEl = document.getElementById('nail-polish-removal-count');
        if (bigDiamondEl) bigDiamondEl.innerText = '0';
        if (polishEl) polishEl.innerText = '0';
        window.updateUI();
    }
    window.validate();
};

// === 更新計數器 ===
window.updateBigDiamondCount = function(n) {
    if (bigDiamondCount + n >= 0) {
        bigDiamondCount += n;
        const el = document.getElementById('big-diamond-count');
        if (el) el.innerText = bigDiamondCount;
        window.updateUI();
    }
};

window.updateNailPolishRemovalCount = function(n) {
    if (nailPolishRemovalCount + n >= 0) {
        nailPolishRemovalCount += n;
        const el = document.getElementById('nail-polish-removal-count');
        if (el) el.innerText = nailPolishRemovalCount;
        window.updateUI();
    }
};

window.updateUnlimitedJumpCount = function(n) {
    if (unlimitedJumpCount + n >= 0) {
        unlimitedJumpCount += n;
        const el = document.getElementById('unlimited-jump-count');
        if (el) el.innerText = unlimitedJumpCount;
        window.updateUI();
    }
};

window.updateExtensionCount = function(n) {
    if (extensionCount + n >= 0) {
        extensionCount += n;
        const el = document.getElementById('ext-count');
        if (el) el.innerText = extensionCount;
        window.updateUI();
    }
};

window.updateRepairCount = function(n) {
    if (repairCount + n >= 0) {
        repairCount += n;
        const el = document.getElementById('repair-count');
        if (el) el.innerText = repairCount;
        window.updateUI();
    }
};

// === 切換服務 ===
window.toggleService = function(el, price, name) {
    if (el.classList.contains('active')) {
        el.classList.remove('active');
        priceState.extras -= price;
        bookingDetails.extras = bookingDetails.extras.filter(e => e.name !== name);
    } else {
        el.classList.add('active');
        priceState.extras += price;
        bookingDetails.extras.push({ name: name || '加購項目', price: price });
    }
    window.updateUI();
};

// === 切換設計規則顯示 ===
window.toggleDesignRule = function(id, el) {
    const rule = document.getElementById(id);
    if (rule) {
        if (el.classList.contains('active')) {
            rule.classList.remove('hidden');
        } else {
            rule.classList.add('hidden');
        }
    }
};

// === 計算總價 ===
window.calculateTotal = function() {
    return priceState.design + priceState.removal + priceState.extras +
           (unlimitedJumpCount * 100) + (extensionCount * 150) + (repairCount * 50) +
           (bigDiamondCount * 50) + (nailPolishRemovalCount * 50);
};

// === 更新 UI ===
window.updateUI = function() {
    const total = window.calculateTotal();
    const priceEl = document.getElementById('price-display');
    if (priceEl) {
        priceEl.innerText = total;
        if (total === 0) {
            priceEl.classList.add('text-red-500');
        } else {
            priceEl.classList.remove('text-red-500');
        }
    }
    window.validate();
};

// === 驗證 ===
window.validate = function() {
    const check = document.getElementById('term-check')?.checked || false;
    const total = window.calculateTotal();
    const btn = document.getElementById('submit-btn');
    const msgEl = document.getElementById('validation-msg');
    
    let errors = [];
    if (!userProfile || !userProfile.userId) errors.push("需 LINE 登入");
    if (total <= 0) errors.push("未選項目");
    
    const needRemovalBtn = document.getElementById('need-removal-yes');
    if (needRemovalBtn && needRemovalBtn.classList.contains('active')) {
        const hasRemovalSelected = Array.from(document.querySelectorAll('button[data-group="removal"]')).some(btn => btn.classList.contains('active'));
        if (!hasRemovalSelected) {
            errors.push("請選擇卸甲方式");
        }
    }
    
    if (bookingDetails.design.name === '任我做') {
        const k1 = document.getElementById('keyword1')?.value?.trim();
        const k2 = document.getElementById('keyword2')?.value?.trim();
        if (!k1 || !k2) errors.push("任我做需填關鍵字");
    }
    
    if (!selectedDate) errors.push("未選日期");
    if (!selectedTime) errors.push("未選時間");
    if (!check) errors.push("未勾選同意");
    
    const isValid = errors.length === 0;
    
    if (btn) {
        if (isValid) {
            btn.classList.remove('opacity-50');
            btn.disabled = false;
        } else {
            btn.classList.add('opacity-50');
            btn.disabled = false;
        }
    }
    
    if (msgEl) {
        msgEl.innerText = isValid ? '' : errors.join(' / ');
    }
};

// === 送出預約 ===
window.checkAndSubmit = async function() {
    console.log('📤 checkAndSubmit called');
    // TODO: 實作送出邏輯
    alert('此功能開發中...');
};

// === 載入行事曆資料 ===
window.fetchCalendarData = async function() {
    console.log('📅 載入客戶行事曆資料...');
    window.showLoading(true);
    
    try {
        const { data, error } = await supabaseClient
            .from('calendar_slots')
            .select('*');
            
        if (error) throw error;
        
        await window.loadClosedDates();
        window.initMockData(true, currentYear, currentMonth);
        
        data.forEach(row => {
            const parts = row.date_id.split('-');
            if (parseInt(parts[0]) === currentYear && parseInt(parts[1]) === currentMonth) {
                const d = parseInt(parts[2]);
                if (calendarData[d - 1]) {
                    calendarData[d - 1].status = row.status;
                    calendarData[d - 1].bookedSlots = row.booked_slots || [];
                }
            }
        });
    } catch (err) {
        console.log('⚠️ 無法載入資料:', err.message);
        window.initMockData(false, currentYear, currentMonth);
    } finally {
        window.showLoading(false);
    }
};

// === 渲染行事曆 ===
window.renderCalendar = function() {
    console.log('🎨 渲染客戶行事曆...');
    const grid = document.getElementById('calendar-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    const first = new Date(currentYear, currentMonth, 1).getDay();
    
    window.calculateBookingRange();
    
    for (let i = 0; i < first; i++) {
        grid.appendChild(document.createElement('div'));
    }
    
    calendarData.forEach(item => {
        const div = document.createElement('div');
        div.innerText = item.date;
        div.className = 'calendar-day';
        
        // TODO: 加上可預約判斷邏輯
        
        grid.appendChild(div);
    });
};

// === 選擇日期 ===
window.selectDate = function(el, date, slots) {
    console.log('選擇日期:', date);
    // TODO: 實作選擇日期邏輯
};

// === 調整時間 ===
window.adjustTime = function(minutes) {
    console.log('調整時間:', minutes);
    // TODO: 實作時間調整
};

// === 確認時間 ===
window.confirmTime = function() {
    console.log('確認時間');
    // TODO: 實作時間確認
};

// === LIFF 初始化 ===
(async function initLIFF() {
    console.log('🎬 LIFF 初始化開始...');
    
    if (CONFIG.LIFF_ID && CONFIG.LIFF_ID !== 'YOUR_LIFF_ID_HERE') {
        try {
            console.log('🔄 Initializing LIFF...');
            await liff.init({ liffId: CONFIG.LIFF_ID });
            liffInitialized = true;
            console.log('✅ LIFF initialized successfully');
            
            if (!sessionStorage.getItem('manualLogout')) {
                if (liff.isLoggedIn()) {
                    console.log('✅ User is logged in, auto-login...');
                    document.getElementById('auto-login-hint')?.classList.remove('hidden');
                    
                    userProfile = await liff.getProfile();
                    await window.checkFriendship();
                    
                    document.getElementById('login-overlay').classList.add('hidden');
                    document.getElementById('main-app').classList.remove('hidden');
                    window.updateUserStatus();
                    
                    await window.fetchCalendarData();
                    document.getElementById('calendar-title').innerText = `${MONTH_NAMES[currentMonth]} ${currentYear}`;
                    window.renderCalendar();
                }
            }
        } catch (e) {
            console.error("❌ LIFF Init Failed:", e);
        }
    }
    console.log('🏁 LIFF 初始化完成');
})();

console.log('✅ customer.js 載入完成');
console.log('loginWithLine 類型:', typeof window.loginWithLine);
```

---

## ✅ 現在測試

1. **重新整理頁面** (Ctrl+Shift+R)
2. **檢查 Console** 應該看到:
```
   ✅ config.js loaded
   ✅ Supabase initialized
   ✅ customer.js 載入完成
   loginWithLine 類型: function
