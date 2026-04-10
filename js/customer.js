// customer.js - 客戶端功能 (最終修正版)

console.log('🚀 customer.js 開始載入...');

// ===== 客戶端全域變數 =====
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
let currentDateBlockedTimes = [];
let userProfile = null;
let liffInitialized = false;
let isFriend = false;

// ===== 價格計算與 UI 更新 =====

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
    const termCheck = document.getElementById('term-check')?.checked || false;
    const btn = document.getElementById('submit-btn');
    const msg = document.getElementById('validation-msg');
    if (!btn || !msg) return;
    
    let errors = [];
    if (priceState.design === 0) errors.push('請選擇造型');
    if (bookingDetails.design.name === '任我做') {
        const k1 = document.getElementById('keyword1')?.value?.trim() || '';
        const k2 = document.getElementById('keyword2')?.value?.trim() || '';
        if (!k1 || !k2) errors.push('任我做需填寫兩個關鍵字');
    }
    const needRemovalBtn = document.getElementById('need-removal-yes');
    if (needRemovalBtn && needRemovalBtn.classList.contains('active')) {
        const hasRemovalSelected = Array.from(document.querySelectorAll('button[data-group="removal"]'))
            .some(btn => btn.classList.contains('active'));
        if (!hasRemovalSelected) errors.push('請選擇卸甲方式');
    }
    if (!selectedDate) errors.push('請選擇預約日期');
    if (!selectedTime) errors.push('請選擇預約時間');
    if (!termCheck) errors.push('請同意規範');
    
    if (errors.length > 0) {
        msg.innerText = errors[0];
        btn.classList.add('opacity-50');
        btn.classList.remove('hover:bg-gray-700');
        btn.disabled = true;
    } else {
        msg.innerText = '';
        btn.classList.remove('opacity-50');
        btn.classList.add('hover:bg-gray-700');
        btn.disabled = false;
    }
};

// ===== 計數器功能 =====

window.updateExtensionCount = function(delta) {
    extensionCount = Math.max(0, Math.min(10, extensionCount + delta));
    document.getElementById('ext-count').innerText = extensionCount;
    window.updateUI();
};
window.updateRepairCount = function(delta) {
    repairCount = Math.max(0, Math.min(10, repairCount + delta));
    document.getElementById('repair-count').innerText = repairCount;
    window.updateUI();
};
window.updateUnlimitedJumpCount = function(delta) {
    unlimitedJumpCount = Math.max(0, Math.min(10, unlimitedJumpCount + delta));
    document.getElementById('unlimited-jump-count').innerText = unlimitedJumpCount;
    window.updateUI();
};
window.updateBigDiamondCount = function(delta) {
    bigDiamondCount = Math.max(0, Math.min(10, bigDiamondCount + delta));
    document.getElementById('big-diamond-count').innerText = bigDiamondCount;
    window.updateUI();
};
window.updateNailPolishRemovalCount = function(delta) {
    nailPolishRemovalCount = Math.max(0, Math.min(10, nailPolishRemovalCount + delta));
    document.getElementById('nail-polish-removal-count').innerText = nailPolishRemovalCount;
    window.updateUI();
};

// ===== 設計規則切換 =====

window.toggleDesignRule = function(ruleId, btnElement) {
    const ruleBox = document.getElementById(ruleId);
    if (!ruleBox) return;
    document.querySelectorAll('.rule-box').forEach(box => {
        if (box.id !== ruleId) box.classList.add('hidden');
    });
    if (btnElement.classList.contains('active')) {
        ruleBox.classList.remove('hidden');
    } else {
        ruleBox.classList.add('hidden');
    }
};

// ===== 選項選擇功能 =====

window.selectSingleOption = function(el, price, group, name) {
    document.querySelectorAll(`button[data-group="${group}"]`).forEach(b => b.classList.remove('active'));
    el.classList.add('active');
    if (group === 'design') {
        document.querySelectorAll('.rule-box').forEach(b => b.classList.add('hidden'));
        const k1 = document.getElementById('keyword1');
        const k2 = document.getElementById('keyword2');
        if (k1) k1.value = '';
        if (k2) k2.value = '';
    }
    priceState[group] = price;
    if (group === 'design') {
        bookingDetails.design = { name: name || '', price: price, keywords: [] };
    } else if (group === 'removal') {
        bookingDetails.removal = { name: name || '', price: price };
    }
    window.updateUI();
};

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
        document.getElementById('big-diamond-count').innerText = '0';
        document.getElementById('nail-polish-removal-count').innerText = '0';
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

// ===== 登入相關 =====

window.showLoginScreen = function() {
    document.getElementById('main-app').classList.add('hidden');
    document.getElementById('login-overlay').classList.remove('hidden');
};

window.loginWithLine = async function() {
    console.log('🔐 loginWithLine called');
    sessionStorage.removeItem('manualLogout');
    if (!CONFIG.LIFF_ID || CONFIG.LIFF_ID === 'YOUR_LIFF_ID_HERE') {
        alert("請設定 LIFF ID");
        return;
    }
    try {
        if (!liffInitialized) {
            console.log('🔄 初始化 LIFF...');
            await liff.init({ 
                liffId: CONFIG.LIFF_ID,
                withLoginOnExternalBrowser: true
            });
            liffInitialized = true;
            console.log('✅ LIFF 初始化成功');
        }
        if (!liff.isLoggedIn()) {
            console.log('🔄 Redirecting to LINE login...');
            liff.login({ redirectUri: window.location.href });
        } else {
            console.log('✅ Already logged in, getting profile...');
            userProfile = await liff.getProfile();
            await window.checkFriendship();
            document.getElementById('login-overlay').classList.add('hidden');
            document.getElementById('main-app').classList.remove('hidden');
            window.updateUserStatus();
            await window.fetchCalendarData();
            document.getElementById('calendar-title').innerText = `${MONTH_NAMES[currentMonth]} ${currentYear}`;
            window.renderCalendar();
        }
    } catch (err) {
        console.error('❌ LINE login error:', err);
        alert("LINE 登入錯誤：\n" + err.message);
    }
};

window.updateUserStatus = function() {
    const warningEl = document.getElementById('line-login-warning');
    const friendWarningEl = document.getElementById('friend-warning');
    const statusEl = document.getElementById('user-status');
    const userNameEl = document.getElementById('user-name');
    if (!userProfile || !userProfile.userId) {
        warningEl?.classList.remove('hidden');
        friendWarningEl?.classList.add('hidden');
        if (statusEl) {
            statusEl.innerText = '⚠️ 訪客模式（無法預約）';
            statusEl.classList.add('text-red-500', 'font-bold');
        }
        if (userNameEl) userNameEl.innerText = '訪客';
    } else if (!isFriend) {
        warningEl?.classList.add('hidden');
        friendWarningEl?.classList.remove('hidden');
        if (statusEl) {
            statusEl.innerText = '⚠️ 建議加入 LINE 官方帳號';
            statusEl.classList.add('text-orange-500', 'font-bold');
            statusEl.classList.remove('text-green-600', 'text-red-500');
        }
        if (userNameEl) userNameEl.innerText = userProfile.displayName;
    } else {
        warningEl?.classList.add('hidden');
        friendWarningEl?.classList.add('hidden');
        if (statusEl) {
            statusEl.innerText = '✓ LINE 帳號已連結';
            statusEl.classList.remove('text-red-500', 'text-orange-500');
            statusEl.classList.add('text-green-600');
        }
        if (userNameEl) userNameEl.innerText = userProfile.displayName;
    }
};

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
        if (e.message && e.message.includes('no login bot')) {
            console.warn("⚠️ LIFF 尚未綁定 Bot，跳過好友檢查");
        } else {
            console.warn("⚠️ 無法檢查好友狀態:", e.message);
        }
        isFriend = true;
        return true;
    }
};

window.addFriend = function() {
    if (CONFIG.LINE_OFFICIAL_ID && CONFIG.LINE_OFFICIAL_ID !== '@your_line_id') {
        window.open(`https://line.me/R/ti/p/${CONFIG.LINE_OFFICIAL_ID}`, '_blank');
    } else {
        alert("請先設定 LINE_OFFICIAL_ID");
    }
};

window.recheckFriendship = async function() {
    window.showLoading(true);
    await window.checkFriendship();
    window.updateUserStatus();
    window.showLoading(false);
    if (isFriend) {
        alert("✅ 已確認您是我們的好友！");
    } else {
        alert("❌ 尚未偵測到好友關係");
    }
};

// ===== 行事曆相關 =====

window.fetchCalendarData = async function() {
    window.showLoading(true);
    try {
        const { data, error } = await supabaseClient.from('calendar_slots').select('*');
        if (error) throw error;
        await window.loadClosedDates();
        window.initMockData(true, currentYear, currentMonth);
        data.forEach(row => {
            const parts = row.date_id.split('-');
            if (parseInt(parts[0]) === currentYear && parseInt(parts[1]) === currentMonth + 1) {
                const d = parseInt(parts[2]);
                if (calendarData[d-1]) {
                    calendarData[d-1].status = row.status;
                    calendarData[d-1].bookedSlots = row.booked_slots || [];
                }
            }
        });
    } catch (err) { 
        console.log('⚠️ 無法載入資料，使用預設資料:', err.message);
        window.initMockData(false, currentYear, currentMonth); 
    } finally { 
        window.showLoading(false); 
    }
};

window.changeCustomerMonth = async function(delta) {
    currentMonth += delta;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    else if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    await window.fetchCalendarData();
    document.getElementById('calendar-title').innerText = `${MONTH_NAMES[currentMonth]} ${currentYear}`;
    window.renderCalendar();
};

window.renderCalendar = function() {
    const grid = document.getElementById('calendar-grid'); 
    if (!grid) return;
    grid.innerHTML = '';
    const first = new Date(currentYear, currentMonth, 1).getDay();
    window.calculateBookingRange();
    for(let i=0; i<first; i++) grid.appendChild(document.createElement('div'));
    calendarData.forEach(item => {
        const div = document.createElement('div');
        div.innerText = item.date;
        const dateCheck = window.isDateBookable(currentYear, currentMonth, item.date);
        let className = 'calendar-day';
        let clickable = false;

        if (dateCheck.reason === 'closed') {
            className += ' closed';
            div.title = '此日期已關閉';
            div.onclick = () => window.showToast('🚫 此日期為休假日，無法預約\n\n如有需要請聯繫我們');
        } else if (dateCheck.reason === 'not-open') {
            className += ' not-open';
            div.title = '尚未開放預約';
        } else if (dateCheck.reason === 'past' || item.status === 'past') {
            className += ' booked';
            div.title = '已過期';
        } else if (item.status === 'booked') {
            className += ' booked';
            div.title = '本日公休';
        } else if (dateCheck.bookable && item.status === 'available') {
            // 判斷是否滿檔
            const dow = new Date(currentYear, currentMonth, item.date).getDay();
            const isWeekend = dow === 0 || dow === 6;
            const allSlots = isWeekend
                ? ['11:00', '13:30', '16:00', '18:30']
                : ['12:00', '15:00', '18:00'];
            const bookedOrBlocked = (item.bookedSlots || []).map(s =>
                typeof s === 'string' ? s : s.time
            );
            const isFull = allSlots.every(slot => bookedOrBlocked.includes(slot));

            if (isFull) {
                className += ' booked';
                div.title = '本日時段已額滿';
            } else {
                className += ' bookable';
                clickable = true;
                div.title = '點擊預約';
            }
        }
        div.className = className;
        if(clickable) div.onclick = () => window.selectDate(div, item.date, item.bookedSlots);
        grid.appendChild(div);
    });
    const rangeInfo = document.getElementById('booking-range-info');
    const rangeText = document.getElementById('booking-range-text');
    if (rangeInfo && rangeText && bookingOpenRanges.ranges && bookingOpenRanges.ranges.length > 0) {
        const parts = bookingOpenRanges.ranges.map(r => {
            const s = `${r.start.getMonth() + 1}/${r.start.getDate()}`;
            const e = `${r.end.getMonth() + 1}/${r.end.getDate()}`;
            return `${s} ~ ${e}`;
        });
        rangeText.innerText = parts.join('、');
        rangeInfo.classList.remove('hidden');
    } else if (rangeInfo) {
        rangeInfo.classList.add('hidden');
    }
};

window.selectDate = function(el, date, slots) {
    document.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('selected'));
    el.classList.add('selected');
    selectedDate = `${currentMonth+1}/${date}`;
    selectedTime = null;
    currentTimeHour = 10;
    currentTimeMinute = 0;

    // Real + manual bookings → full 2.5hr overlap
    currentDateBookedTimes = slots
        .filter(s => typeof s === 'string' || s.status !== 'blocked')
        .map(s => typeof s === 'string' ? s : s.time);

    // Admin grid blocks → exact time only
    currentDateBlockedTimes = slots
        .filter(s => typeof s === 'object' && s.status === 'blocked')
        .map(s => s.time);

    window.renderTimeSelector();
    window.updateServiceEndTime();
    window.validate();
};

// ===== 時間選擇相關 =====

function getAvailableSlots(year, month, day) {
    const dow = new Date(year, month, day).getDay();
    const isWeekend = dow === 0 || dow === 6;
    return isWeekend
        ? ['11:00', '13:30', '16:00', '18:30']
        : ['12:00', '15:00', '18:00'];
}

window.renderTimeSelector = function() {
    const container = document.getElementById('time-slots-container');
    container.classList.remove('hidden');
    const quickSlotsGrid = document.getElementById('quick-time-slots');
    quickSlotsGrid.innerHTML = '';

    const dayNum = parseInt(selectedDate.split('/')[1]);
    const slots = getAvailableSlots(currentYear, currentMonth, dayNum);

    slots.forEach(timeStr => {
        const timeMinutes = window.timeToMinutes(timeStr);
        const isConflict = window.isTimeConflict(timeMinutes);
        const btn = document.createElement('button');
        btn.className = 'btn-toggle p-3 text-sm rounded-custom transition';
        btn.innerText = timeStr;
        if (isConflict) {
            btn.className += ' opacity-50 cursor-not-allowed';
            btn.disabled = true;
            btn.title = '此時段與現有預約衝突';
        } else {
            btn.onclick = (e) => {
                const [h, m] = timeStr.split(':').map(Number);
                window.quickSelectTime(h, m, e);
            };
        }
        quickSlotsGrid.appendChild(btn);
    });

    document.getElementById('selected-time-display').innerText = '';
    window.updateServiceEndTime();
    window.checkTimeConflict();
};

window.quickSelectTime = function(hour, minute, e) {
    currentTimeHour = hour;
    currentTimeMinute = minute;
    document.querySelectorAll('#quick-time-slots button').forEach(btn => btn.classList.remove('active'));
    (e?.target || event?.target)?.classList.add('active');
    const timeDisplay = document.getElementById('selected-time-display');
    timeDisplay.innerText = window.formatTime(currentTimeHour, currentTimeMinute);
    window.updateServiceEndTime();
    window.checkTimeConflict();
    timeDisplay.classList.add('scale-110');
    setTimeout(() => timeDisplay.classList.remove('scale-110'), 200);
};

window.adjustTime = function(minutes) {
    let totalMinutes = currentTimeHour * 60 + currentTimeMinute + minutes;
    const startMinutes = CONFIG.BUSINESS_HOURS.start.hour * 60 + CONFIG.BUSINESS_HOURS.start.minute;
    const endMinutes = CONFIG.BUSINESS_HOURS.end.hour * 60 + CONFIG.BUSINESS_HOURS.end.minute;
    if (totalMinutes < startMinutes) {
        currentTimeHour = CONFIG.BUSINESS_HOURS.start.hour;
        currentTimeMinute = CONFIG.BUSINESS_HOURS.start.minute;
    } else if (totalMinutes > endMinutes) {
        currentTimeHour = CONFIG.BUSINESS_HOURS.end.hour;
        currentTimeMinute = CONFIG.BUSINESS_HOURS.end.minute;
    } else {
        currentTimeHour = Math.floor(totalMinutes / 60);
        currentTimeMinute = totalMinutes % 60;
    }
    const currentTime = window.formatTime(currentTimeHour, currentTimeMinute);
    document.querySelectorAll('#quick-time-slots button').forEach(btn => {
        btn.classList.toggle('active', btn.innerText === currentTime);
    });
    document.getElementById('selected-time-display').innerText = currentTime;
    window.updateServiceEndTime();
    window.checkTimeConflict();
};

window.updateServiceEndTime = function() {
    const endTimeMinutes = currentTimeHour * 60 + currentTimeMinute + CONFIG.SERVICE_DURATION_MINUTES;
    const endTime = window.minutesToTime(endTimeMinutes);
    const serviceEndDisplay = document.getElementById('service-end-time');
    if (serviceEndDisplay) serviceEndDisplay.innerText = `服務至 ${window.formatTime(endTime.hour, endTime.minute)}`;
};

window.isTimeConflict = function(selectedTimeMinutes) {
    const selectedEnd = selectedTimeMinutes + CONFIG.SERVICE_DURATION_MINUTES;

    // Real/manual bookings — full duration overlap
    for (let t of currentDateBookedTimes) {
        const bookedStart = window.timeToMinutes(t);
        const bookedEnd = bookedStart + CONFIG.SERVICE_DURATION_MINUTES;
        if (window.checkTimeOverlap(selectedTimeMinutes, selectedEnd, bookedStart, bookedEnd)) return true;
    }

    // Admin grid blocks — exact hour match only
    const selectedStr = window.formatTime(
        Math.floor(selectedTimeMinutes / 60),
        selectedTimeMinutes % 60
    );
    if (currentDateBlockedTimes.includes(selectedStr)) return true;

    return false;
};

window.checkTimeConflict = function() {
    const currentTimeMinutes = currentTimeHour * 60 + currentTimeMinute;
    const hasConflict = window.isTimeConflict(currentTimeMinutes);
    const warning = document.getElementById('time-conflict-warning');
    const confirmBtn = document.getElementById('confirm-time-btn');
    if (hasConflict) {
        const nextAvailableTime = window.findNextAvailableTime(currentTimeMinutes);
        if (nextAvailableTime) {
            const t = window.minutesToTime(nextAvailableTime);
            warning.innerHTML = `⏰ 建議選擇：<strong>${window.formatTime(t.hour, t.minute)}</strong> 或之後的時間`;
        } else {
            warning.innerHTML = `⚠️ 今日已無可用時段`;
        }
        warning.classList.remove('hidden');
        confirmBtn.classList.add('opacity-50', 'cursor-not-allowed');
        confirmBtn.disabled = true;
    } else {
        warning.classList.add('hidden');
        confirmBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        confirmBtn.disabled = false;
    }
};

window.findNextAvailableTime = function(fromTimeMinutes) {
    let latestEndTime = fromTimeMinutes;
    const selectedEnd = fromTimeMinutes + CONFIG.SERVICE_DURATION_MINUTES;
    for (let bookedTimeStr of currentDateBookedTimes) {
        const bookedStart = window.timeToMinutes(bookedTimeStr);
        const bookedEnd = bookedStart + CONFIG.SERVICE_DURATION_MINUTES;
        if (window.checkTimeOverlap(fromTimeMinutes, selectedEnd, bookedStart, bookedEnd)) {
            if (bookedEnd > latestEndTime) latestEndTime = bookedEnd;
        }
    }
    const businessEndMinutes = CONFIG.BUSINESS_HOURS.end.hour * 60 + CONFIG.BUSINESS_HOURS.end.minute;
    return (latestEndTime + CONFIG.SERVICE_DURATION_MINUTES <= businessEndMinutes) ? latestEndTime : null;
};

window.confirmTime = function() {
    const currentTimeMinutes = currentTimeHour * 60 + currentTimeMinute;
    if (window.isTimeConflict(currentTimeMinutes)) {
        const nextAvailableTime = window.findNextAvailableTime(currentTimeMinutes);
        if (nextAvailableTime) {
            const t = window.minutesToTime(nextAvailableTime);
            alert(`❌ 此時段無法預約\n\n💡 建議選擇：${window.formatTime(t.hour, t.minute)} 或之後的時間`);
        } else {
            alert("❌ 今日已無可用時段\n\n請選擇其他日期");
        }
        return;
    }
    const timeStr = window.formatTime(currentTimeHour, currentTimeMinute);
    selectedTime = timeStr;
    const endTimeMinutes = currentTimeMinutes + CONFIG.SERVICE_DURATION_MINUTES;
    const endTime = window.minutesToTime(endTimeMinutes);
    const endTimeStr = window.formatTime(endTime.hour, endTime.minute);
    const timeDisplay = document.getElementById('selected-time-display');
    const confirmBtn = document.getElementById('confirm-time-btn');
    timeDisplay.classList.add('text-green-600');
    confirmBtn.innerHTML = `✓ 已確認 (${timeStr}-${endTimeStr})`;
    confirmBtn.classList.add('bg-green-600');
    confirmBtn.classList.remove('bg-gray-800');
    setTimeout(() => {
        timeDisplay.classList.remove('text-green-600');
        confirmBtn.innerHTML = '✓ 確認此時間';
        confirmBtn.classList.remove('bg-green-600');
        confirmBtn.classList.add('bg-gray-800');
    }, 2000);
    window.validate();
};

// ===== 預約提交 =====

window.checkAndSubmit = async function() {
    const check = document.getElementById('term-check').checked;
    const total = window.calculateTotal();
    if (!userProfile || !userProfile.userId) {
        alert("❌ 請先使用 LINE 登入才能預約！");
        window.showLoginScreen();
        return;
    }
    if (!isFriend) {
        alert("❌ 必須加入 LINE 官方帳號才能預約！\n\n原因：\n• 需要發送預約確認通知\n• 需要接收審核結果\n• 需要接收付款資訊\n\n請點擊下方「立即加入官方帳號」按鈕");
        const friendWarning = document.getElementById('friend-warning');
        friendWarning.scrollIntoView({ behavior: 'smooth', block: 'center' });
        friendWarning.classList.add('animate-pulse');
        setTimeout(() => friendWarning.classList.remove('animate-pulse'), 2000);
        return;
    }
    if (total <= 0) { alert("❌ 您尚未選擇任何服務項目！"); return; }
    const needRemovalBtn = document.getElementById('need-removal-yes');
    if (needRemovalBtn && needRemovalBtn.classList.contains('active')) {
        const hasRemovalSelected = Array.from(document.querySelectorAll('button[data-group="removal"]'))
            .some(btn => btn.classList.contains('active'));
        if (!hasRemovalSelected) {
            alert("❌ 您選擇了需要卸甲，請選擇卸甲方式！");
            document.getElementById('removal-options').scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }
    }
    if (bookingDetails.design.name === '任我做') {
        const k1 = document.getElementById('keyword1').value.trim();
        const k2 = document.getElementById('keyword2').value.trim();
        if (!k1 || !k2) {
            alert("❌ 任我做需要填寫兩個關鍵字！");
            document.getElementById('keyword1').focus();
            return;
        }
    }
    if (!selectedDate) { alert("❌ 請選擇預約日期"); return; }
    if (!selectedTime) { alert("❌ 請選擇預約時段"); return; }
    if (!check) { alert("❌ 請先勾選同意規範"); return; }
    try {
        await window.finalSubmit();
    } catch (e) {
        alert("發生錯誤：" + e.message);
    }
};

window.finalSubmit = async function() {
    if (!userProfile || !userProfile.userId) {
        alert("❌ 安全驗證失敗");
        window.showLoginScreen();
        return;
    }
    if (!supabaseClient) {
        alert("❌ 資料庫未連線");
        return;
    }
    const btn = document.getElementById('submit-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 處理中...';
    btn.disabled = true;
    try {
        const dateId = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(selectedDate.split('/')[1]).padStart(2, '0')}`;
        console.log('📅 查詢日期:', dateId);
        const { data, error: fetchErr } = await supabaseClient
            .from('calendar_slots')
            .select('*')
            .eq('date_id', dateId)
            .maybeSingle();
        if (fetchErr) throw fetchErr;
        let booked = data ? (data.booked_slots || []) : [];
        if (booked.some(s => (typeof s === 'string' ? s : s.time) === selectedTime)) {
            throw new Error("該時段已被預約 😭");
        }
        let details = {
            design: { ...bookingDetails.design },
            removal: { ...bookingDetails.removal },
            extras: [...bookingDetails.extras]
        };
        if (bookingDetails.design.name === '任我做') {
            details.design.keywords = [
                document.getElementById('keyword1').value.trim(),
                document.getElementById('keyword2').value.trim()
            ];
        }
        if (unlimitedJumpCount > 0) details.extras.push({ name: '無限跳純色', count: unlimitedJumpCount, price: unlimitedJumpCount * 100 });
        if (extensionCount > 0) details.extras.push({ name: '延甲', count: extensionCount, price: extensionCount * 150 });
        if (repairCount > 0) details.extras.push({ name: '補甲', count: repairCount, price: repairCount * 50 });
        if (bigDiamondCount > 0) details.extras.push({ name: '大鑽/凹凸', count: bigDiamondCount, price: bigDiamondCount * 50 });
        if (nailPolishRemovalCount > 0) details.extras.push({ name: '卸指甲油', count: nailPolishRemovalCount, price: nailPolishRemovalCount * 50 });
        
        booked.push({
            time: selectedTime,
            user: userProfile.displayName,
            userId: userProfile.userId,
            status: 'pending',
            bookingDetails: details,
            totalPrice: window.calculateTotal(),
            createdAt: new Date().toISOString()
        });
        
        console.log('💾 準備儲存預約:', booked[booked.length - 1]);
        const { error: saveErr } = await supabaseClient
            .from('calendar_slots')
            .upsert({ date_id: dateId, booked_slots: booked, status: 'available' });
        if (saveErr) throw saveErr;
        console.log('✅ 預約儲存成功');

        // 組合訊息內容
        let detailMsg = '';
        if (details.design.name) {
            detailMsg += `\n🎨 造型：${details.design.name}`;
            if (details.design.keywords?.length > 0) detailMsg += ` (${details.design.keywords.join(', ')})`;
        }
        if (details.removal.name) detailMsg += `\n💅 卸甲：${details.removal.name}`;
        if (details.extras.length > 0) {
            detailMsg += `\n✨ 加購：${details.extras.map(e => e.count ? `${e.name} x${e.count}` : e.name).join(', ')}`;
        }
        const successMsg = `【新預約申請】\n\n👤 顧客：${userProfile.displayName}\n📅 日期：${selectedDate}\n⏰ 時間：${selectedTime}${detailMsg}\n💰 預估金額：$${window.calculateTotal()}\n\n⏳ 等待管理員審核中...\n審核通過後我們會立即通知您。\n\n---\nLOST.IN.GALLERY`;

        // 1. 發通知給管理員（任何環境都會執行）
        try {
            console.log('📤 發送通知給管理員...');
            await fetch('/api/send-line-message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: CONFIG.ADMIN_LINE_USER_ID,
                    message: successMsg
                })
            });
            console.log('✅ 管理員通知發送成功');
        } catch (e) {
            console.warn("⚠️ 管理員通知發送失敗:", e);
        }

        // 2. 如果在 LINE App 內，也發一份給客人
        try {
            if (liffInitialized && liff.isInClient()) {
                await liff.sendMessages([{ type: 'text', text: successMsg }]);
                console.log('✅ 客人訊息發送成功');
            }
        } catch (e) {
            console.warn("⚠️ 客人訊息發送失敗:", e.message);
        }

        setTimeout(() => {
    window.showToast("✅ 預約已提交！\n\n我們已收到您的預約申請\n請稍候管理員審核。\n\n審核通知將透過 LINE 傳送給您。");
    window.resetBookingForm();
    btn.innerHTML = originalText;
    btn.classList.add('bg-gray-800');
    btn.classList.remove('bg-green-600');
    btn.disabled = false;
}, 1500);
        
    } catch (error) {
        console.error('❌ 預約失敗:', error);
        btn.innerHTML = originalText;
        btn.disabled = false;
        if (error.message?.includes('該時段已被預約')) {
            alert("❌ 該時段已被其他用戶預約\n\n請選擇其他時間");
            await window.fetchCalendarData();
            window.renderCalendar();
        } else {
            alert("❌ 預約失敗，請稍後重試\n\n錯誤：" + (error.message || '未知錯誤'));
        }
    }
};

window.resetBookingForm = function() {
    priceState = { design: 0, removal: 0, extras: 0 };
    bookingDetails = { design: { name: '', price: 0, keywords: [] }, removal: { name: '', price: 0 }, extras: [] };
    extensionCount = repairCount = unlimitedJumpCount = bigDiamondCount = nailPolishRemovalCount = 0;
    selectedDate = selectedTime = null;
    currentTimeHour = 10;
    currentTimeMinute = 0;
    document.querySelectorAll('button[data-group]').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.rule-box').forEach(box => box.classList.add('hidden'));
    document.querySelectorAll('.calendar-day').forEach(day => day.classList.remove('selected'));
    const k1 = document.getElementById('keyword1');
    const k2 = document.getElementById('keyword2');
    if (k1) k1.value = '';
    if (k2) k2.value = '';
    const timeContainer = document.getElementById('time-slots-container');
    if (timeContainer) timeContainer.classList.add('hidden');
    const termCheck = document.getElementById('term-check');
    if (termCheck) termCheck.checked = false;
    window.updateUI();
    window.validate();
};

// ===== 輔助函數 =====

window.showLoading = function(show) {
    const loadingEl = document.getElementById('loading');
    if (loadingEl) loadingEl.classList.toggle('hidden', !show);
};

window.formatTime = function(hour, minute) {
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};

window.timeToMinutes = function(timeStr) {
    const [hour, minute] = timeStr.split(':').map(Number);
    return hour * 60 + minute;
};

window.minutesToTime = function(minutes) {
    return { hour: Math.floor(minutes / 60), minute: minutes % 60 };
};

window.checkTimeOverlap = function(start1, end1, start2, end2) {
    return start1 < end2 && start2 < end1;
};

console.log('✅ customer.js 加載完成');
