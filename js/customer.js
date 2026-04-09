// customer.js - 收藏家預約系統客戶端功能
console.log('🚀 customer.js 開始載入...');

// ===== 0. 全域常數與修正 (解決打不開的問題) =====
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ===== 1. 客戶端全域變數 =====
let priceState = { design: 0, removal: 0, extras: 0 };
let bookingDetails = {
    design: { name: '', price: 0, keywords: [] },
    removal: { name: '', price: 0 },
    extras: []
};
let extensionCount = 0;
let repairCount = 0;
let unlimitedJumpCount = 0;
let bigDiamondCount = 0;
let nailPolishRemovalCount = 0;
let selectedDate = null;
let selectedTime = null;
let currentTimeHour = 10;
let currentTimeMinute = 0;
let currentDateBookedTimes = [];
let userProfile = null;
let liffInitialized = false;
let isFriend = false;
let calendarViewMode = 'month'; 
let isThinking = false;          // 任我做「還在思考」狀態

// ===== 2. 價格計算與 UI 更新 =====

window.calculateTotal = function() {
    let total = priceState.design + priceState.removal + priceState.extras;
    total += extensionCount * 150;
    total += repairCount * 50;
    total += unlimitedJumpCount * 100;
    total += bigDiamondCount * 50;
    total += nailPolishRemovalCount * 50;
    return total;
};

window.updateUI = function() {
    const total = window.calculateTotal();
    const display = document.getElementById('price-display');
    if (display) display.innerText = total;
    window.validate();
};

window.validate = function() {
    const total = window.calculateTotal();
    const termCheck = document.getElementById('term-check')?.checked || false;
    const btn = document.getElementById('submit-btn');
    const msg = document.getElementById('validation-msg');
    if (!btn || !msg) return;

    let errors = [];

    if (priceState.design === 0) errors.push('請選擇造型');

    // 任我做邏輯檢查：如果還在思考，則不擋關鍵字
    if (bookingDetails.design.name === '任我做') {
        const k1 = document.getElementById('keyword1')?.value?.trim() || '';
        if (!isThinking) {
            const k2 = document.getElementById('keyword2')?.value?.trim() || '';
            if (!k1) errors.push('任我做至少需填寫一個關鍵字');
            else if (!k2) errors.push('請填寫關鍵字 2，或點「還在思考」');
        }
    }

    const needRemovalBtn = document.getElementById('need-removal-yes');
    if (needRemovalBtn && needRemovalBtn.classList.contains('active')) {
        const hasRemovalSelected = Array.from(document.querySelectorAll('button[data-group="removal"]'))
            .some(btn => btn.classList.contains('active'));
        if (!hasRemovalSelected) errors.push('請選擇卸甲方式');
    }

    if (!selectedDate) errors.push('請選擇預約日期');
    if (!selectedTime) errors.push('請確認並預約時間');
    if (!termCheck) errors.push('請同意規範');

    if (errors.length > 0) {
        msg.innerText = errors[0];
        btn.classList.add('opacity-50');
        btn.disabled = true;
    } else {
        msg.innerText = '';
        btn.classList.remove('opacity-50');
        btn.disabled = false;
    }
};

// ===== 3. 計數器功能 =====
window.updateExtensionCount = function(delta) { extensionCount = Math.max(0, Math.min(10, extensionCount + delta)); document.getElementById('ext-count').innerText = extensionCount; window.updateUI(); };
window.updateRepairCount = function(delta) { repairCount = Math.max(0, Math.min(10, repairCount + delta)); document.getElementById('repair-count').innerText = repairCount; window.updateUI(); };
window.updateUnlimitedJumpCount = function(delta) { unlimitedJumpCount = Math.max(0, Math.min(10, unlimitedJumpCount + delta)); document.getElementById('unlimited-jump-count').innerText = unlimitedJumpCount; window.updateUI(); };
window.updateBigDiamondCount = function(delta) { bigDiamondCount = Math.max(0, Math.min(10, bigDiamondCount + delta)); document.getElementById('big-diamond-count').innerText = bigDiamondCount; window.updateUI(); };
window.updateNailPolishRemovalCount = function(delta) { nailPolishRemovalCount = Math.max(0, Math.min(10, nailPolishRemovalCount + delta)); document.getElementById('nail-polish-removal-count').innerText = nailPolishRemovalCount; window.updateUI(); };

// ===== 4. 選項選擇功能 =====
window.toggleDesignRule = function(ruleId, btnElement) {
    const ruleBox = document.getElementById(ruleId);
    if (!ruleBox) return;
    document.querySelectorAll('.rule-box').forEach(box => { if (box.id !== ruleId) box.classList.add('hidden'); });
    if (btnElement.classList.contains('active')) ruleBox.classList.remove('hidden');
    else ruleBox.classList.add('hidden');
};

window.selectSingleOption = function(el, price, group, name) {
    document.querySelectorAll(`button[data-group="${group}"]`).forEach(b => b.classList.remove('active'));
    el.classList.add('active');
    if (group === 'design') {
        isThinking = false; // 切換造型時重置思考狀態
        const thinkingBtn = document.getElementById('thinking-btn');
        if (thinkingBtn) { thinkingBtn.textContent = '💭 還在思考'; thinkingBtn.classList.remove('bg-yellow-600', 'text-white'); }
        document.getElementById('keyword2-wrap')?.classList.remove('hidden');
        document.getElementById('thinking-hint')?.classList.add('hidden');
        document.getElementById('keyword1').placeholder = "輸入關鍵字 1";
    }
    priceState[group] = price;
    if (group === 'design') bookingDetails.design = { name: name || '', price: price, keywords: [] };
    else if (group === 'removal') bookingDetails.removal = { name: name || '', price: price };
    window.updateUI();
};

window.toggleRemovalNeed = function(need, el) {
    document.querySelectorAll(`button[data-group="removal-need"]`).forEach(b => b.classList.remove('active'));
    el.classList.add('active');
    const options = document.getElementById('removal-options');
    const extras = document.getElementById('removal-extras');
    if (need) { options.classList.remove('hidden'); extras.classList.remove('hidden'); }
    else {
        options.classList.add('hidden'); extras.classList.add('hidden');
        priceState.removal = 0;
        bookingDetails.removal = { name: '無須卸甲', price: 0 };
        window.updateUI();
    }
    window.validate();
};

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

// ===== 5. 任我做「還在思考」切換 =====

window.toggleThinking = function() {
    isThinking = !isThinking;
    const btn    = document.getElementById('thinking-btn');
    const k1     = document.getElementById('keyword1');
    const k2wrap = document.getElementById('keyword2-wrap');
    const hint   = document.getElementById('thinking-hint');

    if (isThinking) {
        btn.textContent = '✏️ 自己填';
        btn.classList.add('bg-yellow-600', 'text-white');
        k2wrap.classList.add('hidden');
        hint.classList.remove('hidden');
        k1.placeholder = '給我一個方向就好～';
    } else {
        btn.textContent = '💭 還在思考';
        btn.classList.remove('bg-yellow-600', 'text-white');
        k2wrap.classList.remove('hidden');
        hint.classList.add('hidden');
        k1.placeholder = '輸入關鍵字 1';
    }
    window.validate();
};

// ===== 6. 日曆渲染 (修正顏色與文字) =====

window.renderCalendar = function() {
    const grid = document.getElementById('calendar-grid');
    if (!grid) return;
    grid.innerHTML = '';
    window.calculateBookingRange();
    
    // 更新標題
    document.getElementById('calendar-title').innerText = `${MONTH_NAMES[currentMonth]} ${currentYear}`;

    const first = new Date(currentYear, currentMonth, 1).getDay();
    for (let i = 0; i < first; i++) grid.appendChild(document.createElement('div'));

    calendarData.forEach(item => {
        const div = document.createElement('div');
        div.innerText = item.date;
        const dateCheck = window.isDateBookable(currentYear, currentMonth, item.date);
        let className = 'calendar-day';

        // 判斷邏輯順序：1.過期 2.公休 3.未開放 4.可預約
        if (dateCheck.reason === 'past') {
            className += ' past'; // 顯示灰色
        } else if (dateCheck.reason === 'closed' || item.status === 'booked') {
            className += ' booked'; // 顯示紅色
            const lbl = document.createElement('span');
            lbl.innerText = '公休';
            lbl.className = 'holiday-label';
            div.appendChild(lbl);
        } else if (dateCheck.reason === 'not-open') {
            className += ' past';
        } else if (dateCheck.bookable && item.status === 'available') {
            className += ' available'; // 顯示外框
            div.onclick = () => window.selectDate(div, item.date, item.bookedSlots);
        }
        div.className = className;
        grid.appendChild(div);
    });

    // 更新目前開放日期區間文字
    const rangeText = document.getElementById('booking-range-text');
    if (rangeText && bookingOpenRanges.ranges?.length > 0) {
        rangeText.innerText = bookingOpenRanges.ranges.map(r => `${r.start.getMonth()+1}/${r.start.getDate()}~${r.end.getMonth()+1}/${r.end.getDate()}`).join('、');
        document.getElementById('booking-range-info')?.classList.remove('hidden');
    }
};

window.selectDate = function(el, date, slots) {
    document.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('selected'));
    el.classList.add('selected');
    selectedDate = `${currentMonth + 1}/${date}`;
    selectedTime = null;
    currentDateBookedTimes = slots.map(s => typeof s === 'string' ? s : s.time);
    window.renderTimeSelector();
    window.validate();
};

// ===== 7. 時間與提交功能 =====

window.confirmTime = function() {
    selectedTime = window.formatTime(currentTimeHour, currentTimeMinute);
    const confirmBtn = document.getElementById('confirm-time-btn');
    confirmBtn.innerHTML = `✓ 已確認 (${selectedTime})`;
    confirmBtn.classList.add('bg-green-600');
    setTimeout(() => {
        confirmBtn.innerHTML = '✓ 確認此時間';
        confirmBtn.classList.remove('bg-green-600');
    }, 2000);
    window.validate();
};

window.checkAndSubmit = async function() {
    if (!userProfile) { alert("❌ 請先使用 LINE 登入"); window.showLoginScreen(); return; }
    if (!isFriend) { alert("❌ 請先加入 LINE 官方帳號"); return; }
    if (window.calculateTotal() <= 0) { alert("❌ 未選擇服務"); return; }
    if (!selectedDate || !selectedTime) { alert("❌ 未選擇日期或時間"); return; }
    if (!document.getElementById('term-check').checked) { alert("❌ 請同意規範"); return; }
    await window.finalSubmit();
};

window.finalSubmit = async function() {
    const btn = document.getElementById('submit-btn');
    btn.disabled = true;
    btn.innerText = "處理中...";
    try {
        const dateId = `${currentYear}-${String(currentMonth+1).padStart(2,'0')}-${String(selectedDate.split('/')[1]).padStart(2,'0')}`;
        const { data } = await supabaseClient.from('calendar_slots').select('*').eq('date_id', dateId).maybeSingle();
        let booked = data ? (data.booked_slots || []) : [];
        
        let details = { design: {...bookingDetails.design}, removal: {...bookingDetails.removal}, extras: [...bookingDetails.extras] };
        if (details.design.name === '任我做') {
            details.design.keywords = [document.getElementById('keyword1').value, isThinking ? '由美甲師發揮' : document.getElementById('keyword2').value];
        }

        booked.push({
            time: selectedTime,
            user: userProfile.displayName,
            userId: userProfile.userId,
            status: 'pending',
            bookingDetails: details,
            totalPrice: window.calculateTotal(),
            createdAt: new Date().toISOString()
        });

        await supabaseClient.from('calendar_slots').upsert({ date_id: dateId, booked_slots: booked, status: 'available' });
        alert("✅ 預約申請已送出！請等待審核。");
        window.resetBookingForm();
    } catch (e) { alert("錯誤：" + e.message); }
    btn.disabled = false;
    btn.innerText = "送出預約";
};

// ===== 8. LINE 登入與好友檢查 =====

window.loginWithLine = async function() {
    if (!CONFIG.LIFF_ID || CONFIG.LIFF_ID === 'YOUR_LIFF_ID_HERE') { alert("請設定 LIFF ID"); return; }
    try {
        if (!liffInitialized) { await liff.init({ liffId: CONFIG.LIFF_ID }); liffInitialized = true; }
        if (!liff.isLoggedIn()) liff.login({ redirectUri: window.location.href });
        else {
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

// 輔助函數保持原樣...
window.formatTime = (h, m) => `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
window.timeToMinutes = (s) => { const [h,m] = s.split(':').map(Number); return h*60+m; };
window.minutesToTime = (m) => ({ hour: Math.floor(m/60), minute: m%60 });
window.checkTimeOverlap = (s1, e1, s2, e2) => s1 < e2 && s2 < e1;
window.showLoading = (s) => document.getElementById('global-loading').style.display = s ? 'flex' : 'none';
window.updateUserStatus = function() {
    const s = document.getElementById('user-status'), n = document.getElementById('user-name');
    if(n && userProfile) n.innerText = userProfile.displayName;
    if(s) { s.innerText = isFriend ? '✓ LINE 已連結' : '⚠️ 請加入好友'; s.className = isFriend ? 'text-green-600' : 'text-orange-500'; }
};

console.log('✅ customer.js 修改完成');

