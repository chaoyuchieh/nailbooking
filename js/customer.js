// customer.js - 收藏家預約系統 (穩定修復版)
console.log('🚀 customer.js 載入中...');

// ===== 0. 必要工具常數與函數 (防止報錯) =====
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// 檢查日期是否可預約的邏輯 (補回可能遺失的函數)
window.isDateBookable = function(year, month, day) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(year, month, day);
    
    // 1. 是否為過去
    if (target < today) return { bookable: false, reason: 'past' };
    
    // 2. 檢查是否在開放範圍內 (依賴 common.js 的 bookingOpenRanges)
    if (typeof bookingOpenRanges !== 'undefined' && bookingOpenRanges.ranges) {
        const inRange = bookingOpenRanges.ranges.some(r => target >= r.start && target <= r.end);
        if (!inRange) return { bookable: false, reason: 'not-open' };
    }
    
    // 3. 檢查是否被管理員關閉 (依賴 common.js 的 closedDates)
    if (typeof closedDates !== 'undefined') {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        if (closedDates.includes(dateStr)) return { bookable: false, reason: 'closed' };
    }
    
    return { bookable: true, reason: '' };
};

// ===== 1. 全域變數 =====
let priceState = { design: 0, removal: 0, extras: 0 };
let bookingDetails = { design: { name: '', price: 0, keywords: [] }, removal: { name: '', price: 0 }, extras: [] };
let extensionCount = 0, repairCount = 0, unlimitedJumpCount = 0, bigDiamondCount = 0, nailPolishRemovalCount = 0;
let selectedDate = null, selectedTime = null;
let currentTimeHour = 10, currentTimeMinute = 0;
let currentDateBookedTimes = [];
let userProfile = null, liffInitialized = false, isFriend = false;
let calendarViewMode = 'month', isThinking = false;

// ===== 2. 核心功能：渲染日曆 (修正顏色與文字) =====

window.renderCalendar = function() {
    const grid = document.getElementById('calendar-grid');
    if (!grid) return;
    grid.innerHTML = '';
    
    if (window.calculateBookingRange) window.calculateBookingRange();
    
    // 設定月份標題
    const titleEl = document.getElementById('calendar-title');
    if (titleEl) titleEl.innerText = `${MONTH_NAMES[currentMonth]} ${currentYear}`;

    // 填充月初空白
    const first = new Date(currentYear, currentMonth, 1).getDay();
    for (let i = 0; i < first; i++) grid.appendChild(document.createElement('div'));

    calendarData.forEach(item => {
        const div = document.createElement('div');
        div.innerText = item.date;
        
        // 呼叫上方補回的判斷函數
        const dateCheck = window.isDateBookable(currentYear, currentMonth, item.date);
        let className = 'calendar-day';

        // --- 視覺邏輯判斷 ---
        if (dateCheck.reason === 'past') {
            className += ' past'; // 灰色
        } else if (dateCheck.reason === 'closed' || item.status === 'booked') {
            className += ' booked'; // 紅色
            const label = document.createElement('span');
            label.innerText = '公休';
            label.style.fontSize = '8px';
            label.style.display = 'block';
            div.appendChild(label);
        } else if (dateCheck.reason === 'not-open') {
            className += ' past'; // 尚未開放顯示灰色
        } else if (dateCheck.bookable && item.status === 'available') {
            className += ' available'; // 顯示外框
            div.onclick = () => window.selectDate(div, item.date, item.bookedSlots);
        }

        div.className = className;
        grid.appendChild(div);
    });

    // 開放範圍文字
    const rangeText = document.getElementById('booking-range-text');
    if (rangeText && typeof bookingOpenRanges !== 'undefined' && bookingOpenRanges.ranges?.length > 0) {
        rangeText.innerText = bookingOpenRanges.ranges.map(r => `${r.start.getMonth()+1}/${r.start.getDate()}~${r.end.getMonth()+1}/${r.end.getDate()}`).join('、');
        document.getElementById('booking-range-info')?.classList.remove('hidden');
    }
};

// ===== 3. 登入與好友檢查 (維持原始穩定邏輯) =====

window.loginWithLine = async function() {
    if (!CONFIG.LIFF_ID || CONFIG.LIFF_ID === 'YOUR_LIFF_ID_HERE') { alert("請設定 LIFF ID"); return; }
    try {
        if (!liffInitialized) { await liff.init({ liffId: CONFIG.LIFF_ID }); liffInitialized = true; }
        if (!liff.isLoggedIn()) {
            liff.login({ redirectUri: window.location.href });
        } else {
            userProfile = await liff.getProfile();
            await window.checkFriendship();
            document.getElementById('login-overlay').classList.add('hidden');
            document.getElementById('main-app').classList.remove('hidden');
            window.updateUserStatus();
            await window.fetchCalendarData();
            window.renderCalendar();
        }
    } catch (err) { alert("LINE 登入錯誤：" + err.message); }
};

window.checkFriendship = async function() {
    if (!liffInitialized || !liff.isLoggedIn()) { isFriend = true; return true; }
    try {
        const friendship = await liff.getFriendship();
        isFriend = friendship.friendFlag;
        return isFriend;
    } catch (e) { isFriend = true; return true; }
};

// ===== 4. 其他 UI 邏輯 (計數器、驗證等) =====

window.validate = function() {
    const total = window.calculateTotal();
    const termCheck = document.getElementById('term-check')?.checked || false;
    const btn = document.getElementById('submit-btn');
    if (!btn) return;

    let errors = [];
    if (priceState.design === 0) errors.push('請選擇造型');
    if (bookingDetails.design.name === '任我做' && !isThinking) {
        const k1 = document.getElementById('keyword1')?.value?.trim();
        if (!k1) errors.push('請填寫關鍵字');
    }
    if (!selectedDate || !selectedTime) errors.push('請選擇時間');
    if (!termCheck) errors.push('請同意規範');

    btn.disabled = errors.length > 0;
    btn.classList.toggle('opacity-50', errors.length > 0);
    const msg = document.getElementById('validation-msg');
    if (msg) msg.innerText = errors.length > 0 ? errors[0] : '';
};

window.toggleThinking = function() {
    isThinking = !isThinking;
    const btn = document.getElementById('thinking-btn');
    const k2wrap = document.getElementById('keyword2-wrap');
    if (isThinking) {
        btn.textContent = '✏️ 自己填';
        btn.classList.add('bg-yellow-600', 'text-white');
        if (k2wrap) k2wrap.classList.add('hidden');
    } else {
        btn.textContent = '💭 還在思考';
        btn.classList.remove('bg-yellow-600', 'text-white');
        if (k2wrap) k2wrap.classList.remove('hidden');
    }
    window.validate();
};

// ===== 其餘輔助函數 (補全以防崩潰) =====
window.calculateTotal = function() { 
    return priceState.design + priceState.removal + priceState.extras + (extensionCount*150) + (repairCount*50) + (unlimitedJumpCount*100) + (bigDiamondCount*50) + (nailPolishRemovalCount*50); 
};
window.updateUI = function() { const t = window.calculateTotal(); if(document.getElementById('price-display')) document.getElementById('price-display').innerText = t; window.validate(); };
window.selectSingleOption = function(el, price, group, name) {
    document.querySelectorAll(`button[data-group="${group}"]`).forEach(b => b.classList.remove('active'));
    el.classList.add('active');
    priceState[group] = price;
    if (group === 'design') bookingDetails.design = { name: name || '', price: price, keywords: [] };
    window.updateUI();
};
window.selectDate = function(el, date, slots) {
    document.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('selected'));
    el.classList.add('selected');
    selectedDate = `${currentMonth + 1}/${date}`;
    currentDateBookedTimes = slots.map(s => typeof s === 'string' ? s : s.time);
    const container = document.getElementById('time-slots-container');
    if (container) container.classList.remove('hidden');
    window.renderTimeSelector();
    window.validate();
};
window.formatTime = (h, m) => `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
window.confirmTime = function() { 
    selectedTime = window.formatTime(currentTimeHour, currentTimeMinute); 
    alert("已確認時間：" + selectedDate + " " + selectedTime);
    window.validate(); 
};
window.updateUserStatus = function() {
    const s = document.getElementById('user-status');
    if(s) s.innerText = isFriend ? '✓ LINE 已連結' : '⚠️ 請加入好友';
};
window.fetchCalendarData = async function() {
    window.showLoading(true);
    try {
        const { data, error } = await supabaseClient.from('calendar_slots').select('*');
        if (data) {
            data.forEach(row => {
                const parts = row.date_id.split('-');
                if (parseInt(parts[0]) === currentYear && parseInt(parts[1]) === currentMonth + 1) {
                    const d = parseInt(parts[2]);
                    if (calendarData[d - 1]) {
                        calendarData[d - 1].status = row.status;
                        calendarData[d - 1].bookedSlots = row.booked_slots || [];
                    }
                }
            });
        }
    } catch (e) {} finally { window.showLoading(false); }
};
window.showLoading = (s) => { const el = document.getElementById('global-loading'); if(el) el.style.display = s ? 'flex' : 'none'; };

// 初始化
console.log('✅ customer.js 穩定版加載完成');
