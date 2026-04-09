// customer.js - 客戶端功能

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
let userProfile = null;
let liffInitialized = false;
let isFriend = false;
let calendarViewMode = 'month'; // 'month' | 'grid'
let isThinking = false;         // 任我做「還在思考」狀態

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
    const total = window.calculateTotal();
    const termCheck = document.getElementById('term-check')?.checked || false;
    const btn = document.getElementById('submit-btn');
    const msg = document.getElementById('validation-msg');
    if (!btn || !msg) return;

    let errors = [];

    if (priceState.design === 0) errors.push('請選擇造型');

    if (bookingDetails.design.name === '任我做') {
        const k1 = document.getElementById('keyword1')?.value?.trim() || '';
        const k2 = document.getElementById('keyword2')?.value?.trim() || '';
        if (!k1) {
            errors.push('任我做至少需填寫一個關鍵字');
        } else if (!isThinking && !k2) {
            errors.push('請填寫關鍵字 2，或點「還在思考」');
        }
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
        // 重置思考中狀態
        isThinking = false;
        const thinkingBtn = document.getElementById('thinking-btn');
        if (thinkingBtn) thinkingBtn.textContent = '💭 還在思考';
        const k2wrap = document.getElementById('keyword2-wrap');
        if (k2wrap) k2wrap.classList.remove('hidden');
        const hint = document.getElementById('thinking-hint');
        if (hint) hint.classList.add('hidden');
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

// ===== 任我做「還在思考」切換 =====

window.toggleThinking = function() {
    isThinking = !isThinking;
    
    const btn    = document.getElementById('thinking-btn');
    const k1Wrap = document.getElementById('keyword1')?.closest('div'); // 取得關鍵字1的容器
    const k2Wrap = document.getElementById('keyword2-wrap');            // 關鍵字2的容器
    const hint   = document.getElementById('thinking-hint');            // 提示文字

    if (isThinking) {
        // --- 狀態：還在思考 (隱藏選單) ---
        btn.textContent = '💭 還在思考 ';
        btn.classList.add('bg-yellow-600', 'border-yellow-500', 'text-white');
        
        // 隱藏所有關鍵字輸入區域
        if (k1Wrap) k1Wrap.classList.add('hidden');
        if (k2Wrap) k2Wrap.classList.add('hidden');
        
        // 顯示提示
        if (hint) {
            hint.innerText = "💡 已選擇「💭 還在思考」，無需填寫關鍵字。";
            hint.classList.remove('hidden');
        }
    } else {
        // --- 狀態：取消思考 (顯示選單) ---
        btn.textContent = '💭 還在思考';
        btn.classList.remove('bg-yellow-600', 'border-yellow-500', 'text-white');
        
        // 重新顯示輸入區域
        if (k1Wrap) k1Wrap.classList.remove('hidden');
        if (k2Wrap) k2Wrap.classList.remove('hidden');
        
        // 隱藏提示
        if (hint) hint.classList.add('hidden');
    }
    
    // 每次切換都要重新驗證表單按鈕狀態
    window.validate();
};

// ===== 月曆 / 時段 切換 =====

window.setCalendarView = function(mode) {
    calendarViewMode = mode;

    const monthBtn  = document.getElementById('view-month-btn');
    const gridBtn   = document.getElementById('view-grid-btn');
    const monthView = document.getElementById('calendar-month-view');
    const gridView  = document.getElementById('calendar-grid-view');

    if (mode === 'month') {
        monthBtn.className = 'text-xs px-4 py-1.5 rounded-full bg-gray-800 text-white font-bold transition';
        gridBtn.className  = 'text-xs px-4 py-1.5 rounded-full bg-gray-100 text-gray-500 font-bold transition';
        monthView.classList.remove('hidden');
        gridView.classList.add('hidden');
    } else {
        gridBtn.className  = 'text-xs px-4 py-1.5 rounded-full bg-gray-800 text-white font-bold transition';
        monthBtn.className = 'text-xs px-4 py-1.5 rounded-full bg-gray-100 text-gray-500 font-bold transition';
        gridView.classList.remove('hidden');
        monthView.classList.add('hidden');
        window.renderTimeGrid();
    }
};

// ===== 渲染 ○/× 時段格 =====

window.renderTimeGrid = function() {
    const table = document.getElementById('time-avail-grid');
    if (!table) return;

    window.calculateBookingRange();

    // 取接下來 7 天
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const days = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(todayDate);
        d.setDate(todayDate.getDate() + i);
        days.push(d);
    }

    const dayNames   = ['日', '一', '二', '三', '四', '五', '六'];
    const dayColors  = ['color:#d1443a;', '', '', '', '', '', 'color:#4585d9;'];
    const hours      = [10, 11, 12, 13, 14, 15, 16, 17, 18];
    const businessEnd = CONFIG.BUSINESS_HOURS.end.hour * 60; // 1140

    // Header
    let html = '<thead><tr><th></th>';
    days.forEach(day => {
        const isToday = day.toDateString() === todayDate.toDateString();
        const col = day.getDay();
        const colorStyle = isToday ? 'color:#2563eb; font-weight:500;' : dayColors[col];
        html += `<th style="${colorStyle}">
            <div>${dayNames[col]}</div>
            <div>${day.getDate()}</div>
        </th>`;
    });
    html += '</tr></thead><tbody>';

    // 每個時段 row
    hours.forEach(hour => {
        html += `<tr><td class="time-lbl">${hour}:00</td>`;
        days.forEach((day, ci) => {
            const y  = day.getFullYear();
            const m  = day.getMonth();
            const dt = day.getDate();

            const dateCheck = window.isDateBookable(y, m, dt);

            // 取當天已預約時段
            let bookedSlots = [];
            if (y === currentYear && m === currentMonth) {
                const item = calendarData.find(c => c.date === dt);
                if (item) bookedSlots = (item.bookedSlots || []).map(s => typeof s === 'string' ? s : s.time);
            }

            const slotStart = hour * 60;
            const slotEnd   = slotStart + CONFIG.SERVICE_DURATION_MINUTES;

            let isConflict = slotEnd > businessEnd;
            if (!isConflict) {
                for (const t of bookedSlots) {
                    const bStart = window.timeToMinutes(t);
                    const bEnd   = bStart + CONFIG.SERVICE_DURATION_MINUTES;
                    if (window.checkTimeOverlap(slotStart, slotEnd, bStart, bEnd)) {
                        isConflict = true;
                        break;
                    }
                }
            }

            if (dateCheck.bookable && !isConflict) {
                html += `<td><span class="slot-ring" id="sg_${ci}_${hour}"
                    onclick="selectFromGrid(${y},${m},${dt},${hour},${ci})"></span></td>`;
            } else {
                html += `<td><span class="slot-x">×</span></td>`;
            }
        });
        html += '</tr>';
    });

    html += '</tbody>';
    table.innerHTML = html;
};

// ===== 從時段格點擊選取 =====

window.selectFromGrid = function(year, month, day, hour, ci) {
    // 清除前一個選取
    document.querySelectorAll('.slot-ring.sel').forEach(s => s.classList.remove('sel'));
    const el = document.getElementById(`sg_${ci}_${hour}`);
    if (el) el.classList.add('sel');

    // 設定選取的日期與時間
    selectedDate      = `${month + 1}/${day}`;
    currentTimeHour   = hour;
    currentTimeMinute = 0;
    selectedTime      = window.formatTime(hour, 0);

    // 更新衝突檢查用的 booked 清單
    if (year === currentYear && month === currentMonth) {
        const item = calendarData.find(c => c.date === day);
        currentDateBookedTimes = item
            ? (item.bookedSlots || []).map(s => typeof s === 'string' ? s : s.time)
            : [];
    } else {
        currentDateBookedTimes = [];
    }

    // 計算結束時間
    const endMin = hour * 60 + CONFIG.SERVICE_DURATION_MINUTES;
    const endStr = window.formatTime(Math.floor(endMin / 60), endMin % 60);

    // 顯示選取資訊
    const info = document.getElementById('grid-selected-info');
    if (info) {
        info.textContent = `✅ 已選取：${month + 1}/${day}（${window.formatTime(hour, 0)} – ${endStr}）`;
        info.classList.remove('hidden');
    }

    // 同步時間選擇器顯示
    const timeDisplay = document.getElementById('selected-time-display');
    if (timeDisplay) timeDisplay.innerText = window.formatTime(hour, 0);
    window.updateServiceEndTime();
    window.validate();
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
            await liff.init({ liffId: CONFIG.LIFF_ID });
            liffInitialized = true;
        }
        if (!liff.isLoggedIn()) {
            liff.login({ redirectUri: window.location.href });
        } else {
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
    const warningEl      = document.getElementById('line-login-warning');
    const friendWarningEl = document.getElementById('friend-warning');
    const statusEl       = document.getElementById('user-status');
    const userNameEl     = document.getElementById('user-name');

    if (!userProfile || !userProfile.userId) {
        warningEl?.classList.remove('hidden');
        friendWarningEl?.classList.add('hidden');
        if (statusEl) { statusEl.innerText = '⚠️ 訪客模式（無法預約）'; statusEl.classList.add('text-red-500', 'font-bold'); }
        if (userNameEl) userNameEl.innerText = '訪客';
    } else if (!isFriend) {
        warningEl?.classList.add('hidden');
        friendWarningEl?.classList.remove('hidden');
        if (statusEl) { statusEl.innerText = '⚠️ 建議加入 LINE 官方帳號'; statusEl.classList.add('text-orange-500', 'font-bold'); statusEl.classList.remove('text-green-600', 'text-red-500'); }
        if (userNameEl) userNameEl.innerText = userProfile.displayName;
    } else {
        warningEl?.classList.add('hidden');
        friendWarningEl?.classList.add('hidden');
        if (statusEl) { statusEl.innerText = '✓ LINE 帳號已連結'; statusEl.classList.remove('text-red-500', 'text-orange-500'); statusEl.classList.add('text-green-600'); }
        if (userNameEl) userNameEl.innerText = userProfile.displayName;
    }
};

window.checkFriendship = async function() {
    if (!liffInitialized || !liff.isLoggedIn()) { isFriend = true; return true; }
    try {
        const friendship = await liff.getFriendship();
        isFriend = friendship.friendFlag;
        return isFriend;
    } catch (e) {
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
    if (isFriend) { alert("✅ 已確認您是我們的好友！"); }
    else { alert("❌ 尚未偵測到好友關係"); }
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
                if (calendarData[d - 1]) {
                    calendarData[d - 1].status = row.status;
                    calendarData[d - 1].bookedSlots = row.booked_slots || [];
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
    // 如果在 grid view，也重新渲染
    if (calendarViewMode === 'grid') window.renderTimeGrid();
};

window.renderCalendar = function() {
    const grid = document.getElementById('calendar-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const first = new Date(currentYear, currentMonth, 1).getDay();
    window.calculateBookingRange();
    for (let i = 0; i < first; i++) grid.appendChild(document.createElement('div'));

    calendarData.forEach(item => {
        const div = document.createElement('div');
        div.innerText = item.date;
        const dateCheck = window.isDateBookable(currentYear, currentMonth, item.date);
        let className = 'calendar-day';

        if (dateCheck.reason === 'closed') {
            className += ' closed';
            div.title = '此日期已關閉';
            div.onclick = () => alert('🚫 此日期已關閉，無法預約\n\n如有需要請聯繫我們');
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
            div.title = '點擊預約';
            div.onclick = () => window.selectDate(div, item.date, item.bookedSlots);
        }

        div.className = className;
        grid.appendChild(div);
    });

    // 顯示可預約範圍
    const rangeInfo = document.getElementById('booking-range-info');
    const rangeText = document.getElementById('booking-range-text');
    if (rangeInfo && rangeText && bookingOpenRanges.ranges?.length > 0) {
        const parts = bookingOpenRanges.ranges.map(r => {
            return `${r.start.getMonth() + 1}/${r.start.getDate()} ~ ${r.end.getMonth() + 1}/${r.end.getDate()}`;
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
    selectedDate = `${currentMonth + 1}/${date}`;
    selectedTime = null;
    currentTimeHour = 10;
    currentTimeMinute = 0;
    currentDateBookedTimes = slots.map(s => typeof s === 'string' ? s : s.time);
    window.renderTimeSelector();
    window.updateServiceEndTime();
    window.validate();
};

// ===== 時間選擇相關 =====

window.renderTimeSelector = function() {
    const container = document.getElementById('time-slots-container');
    container.classList.remove('hidden');
    const quickSlotsGrid = document.getElementById('quick-time-slots');
    quickSlotsGrid.innerHTML = '';
    const quickSlots = [];
    for (let hour = 10; hour <= 18; hour++) quickSlots.push({ hour, minute: 0 });

    quickSlots.forEach(slot => {
        const timeStr = window.formatTime(slot.hour, slot.minute);
        const isConflict = window.isTimeConflict(slot.hour * 60);
        const btn = document.createElement('button');
        btn.className = 'btn-toggle p-3 text-sm rounded-custom transition';
        btn.innerText = timeStr;
        if (isConflict) {
            btn.className += ' opacity-50 cursor-not-allowed';
            btn.disabled = true;
            btn.title = '此時段與現有預約衝突';
        } else {
            btn.onclick = () => window.quickSelectTime(slot.hour, slot.minute);
        }
        quickSlotsGrid.appendChild(btn);
    });

    document.getElementById('selected-time-display').innerText = window.formatTime(currentTimeHour, currentTimeMinute);
    window.updateServiceEndTime();
    window.checkTimeConflict();
};

window.quickSelectTime = function(hour, minute) {
    currentTimeHour = hour;
    currentTimeMinute = minute;
    document.querySelectorAll('#quick-time-slots button').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById('selected-time-display').innerText = window.formatTime(currentTimeHour, currentTimeMinute);
    window.updateServiceEndTime();
    window.checkTimeConflict();
};

window.adjustTime = function(minutes) {
    let totalMinutes = currentTimeHour * 60 + currentTimeMinute + minutes;
    const startMinutes = CONFIG.BUSINESS_HOURS.start.hour * 60 + CONFIG.BUSINESS_HOURS.start.minute;
    const endMinutes   = CONFIG.BUSINESS_HOURS.end.hour * 60   + CONFIG.BUSINESS_HOURS.end.minute;
    if (totalMinutes < startMinutes) { currentTimeHour = CONFIG.BUSINESS_HOURS.start.hour; currentTimeMinute = CONFIG.BUSINESS_HOURS.start.minute; }
    else if (totalMinutes > endMinutes) { currentTimeHour = CONFIG.BUSINESS_HOURS.end.hour; currentTimeMinute = CONFIG.BUSINESS_HOURS.end.minute; }
    else { currentTimeHour = Math.floor(totalMinutes / 60); currentTimeMinute = totalMinutes % 60; }

    document.querySelectorAll('#quick-time-slots button').forEach(btn => {
        btn.classList.toggle('active', btn.innerText === window.formatTime(currentTimeHour, currentTimeMinute));
    });
    document.getElementById('selected-time-display').innerText = window.formatTime(currentTimeHour, currentTimeMinute);
    window.updateServiceEndTime();
    window.checkTimeConflict();
};

window.updateServiceEndTime = function() {
    const endMin = currentTimeHour * 60 + currentTimeMinute + CONFIG.SERVICE_DURATION_MINUTES;
    const end = window.minutesToTime(endMin);
    const el = document.getElementById('service-end-time');
    if (el) el.innerText = `服務至 ${window.formatTime(end.hour, end.minute)}`;
};

window.isTimeConflict = function(selectedTimeMinutes) {
    const selectedStart = selectedTimeMinutes;
    const selectedEnd   = selectedTimeMinutes + CONFIG.SERVICE_DURATION_MINUTES;
    for (const bookedTimeStr of currentDateBookedTimes) {
        const bookedStart = window.timeToMinutes(bookedTimeStr);
        const bookedEnd   = bookedStart + CONFIG.SERVICE_DURATION_MINUTES;
        if (window.checkTimeOverlap(selectedStart, selectedEnd, bookedStart, bookedEnd)) return true;
    }
    return false;
};

window.checkTimeConflict = function() {
    const currentTimeMinutes = currentTimeHour * 60 + currentTimeMinute;
    const hasConflict = window.isTimeConflict(currentTimeMinutes);
    const warning    = document.getElementById('time-conflict-warning');
    const confirmBtn = document.getElementById('confirm-time-btn');

    if (hasConflict) {
        const next = window.findNextAvailableTime(currentTimeMinutes);
        if (next) {
            const t = window.minutesToTime(next);
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
    for (const bookedTimeStr of currentDateBookedTimes) {
        const bookedStart = window.timeToMinutes(bookedTimeStr);
        const bookedEnd   = bookedStart + CONFIG.SERVICE_DURATION_MINUTES;
        if (window.checkTimeOverlap(fromTimeMinutes, fromTimeMinutes + CONFIG.SERVICE_DURATION_MINUTES, bookedStart, bookedEnd)) {
            if (bookedEnd > latestEndTime) latestEndTime = bookedEnd;
        }
    }
    const businessEnd = CONFIG.BUSINESS_HOURS.end.hour * 60 + CONFIG.BUSINESS_HOURS.end.minute;
    return latestEndTime + CONFIG.SERVICE_DURATION_MINUTES <= businessEnd ? latestEndTime : null;
};

window.confirmTime = function() {
    const timeStr = window.formatTime(currentTimeHour, currentTimeMinute);
    if (window.isTimeConflict(currentTimeHour * 60 + currentTimeMinute)) {
        const next = window.findNextAvailableTime(currentTimeHour * 60 + currentTimeMinute);
        if (next) { const t = window.minutesToTime(next); alert(`❌ 此時段無法預約\n\n💡 建議選擇：${window.formatTime(t.hour, t.minute)} 或之後的時間`); }
        else { alert("❌ 今日已無可用時段\n\n請選擇其他日期"); }
        return;
    }
    selectedTime = timeStr;
    const endMin = currentTimeHour * 60 + currentTimeMinute + CONFIG.SERVICE_DURATION_MINUTES;
    const endStr = window.formatTime(Math.floor(endMin / 60), endMin % 60);
    const timeDisplay = document.getElementById('selected-time-display');
    const confirmBtn  = document.getElementById('confirm-time-btn');
    timeDisplay.classList.add('text-green-600');
    confirmBtn.innerHTML = `✓ 已確認 (${timeStr}-${endStr})`;
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
    if (!userProfile || !userProfile.userId) { alert("❌ 請先使用 LINE 登入才能預約！"); window.showLoginScreen(); return; }
    if (!isFriend) {
        alert("❌ 必須加入 LINE 官方帳號才能預約！");
        document.getElementById('friend-warning').scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
    }
    if (window.calculateTotal() <= 0) { alert("❌ 您尚未選擇任何服務項目！"); return; }

    const needRemovalBtn = document.getElementById('need-removal-yes');
    if (needRemovalBtn?.classList.contains('active')) {
        const hasRemovalSelected = Array.from(document.querySelectorAll('button[data-group="removal"]')).some(btn => btn.classList.contains('active'));
        if (!hasRemovalSelected) { alert("❌ 您選擇了需要卸甲，請選擇卸甲方式！"); document.getElementById('removal-options').scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    }

    // 在 window.checkAndSubmit 內找到這段
if (bookingDetails.design.name === '任我做') {
    // 只有在「沒有點擊還在思考」的情況下，才執行攔截檢查
    if (!isThinking) {
        const k1 = document.getElementById('keyword1').value.trim();
        if (!k1) { 
            alert("❌ 任我做需要填寫至少一個關鍵字！"); 
            document.getElementById('keyword1').focus(); 
            return; 
        }
        
        const k2 = document.getElementById('keyword2').value.trim();
        if (!k2) { 
            alert("❌ 請填寫關鍵字 2，或點「還在思考」！"); 
            document.getElementById('keyword2').focus(); 
            return; 
        }
    }
}
    

    if (!selectedDate) { alert("❌ 請選擇預約日期"); return; }
    if (!selectedTime) { alert("❌ 請選擇預約時段"); return; }
    if (!document.getElementById('term-check').checked) { alert("❌ 請先勾選同意規範"); return; }

    try { await window.finalSubmit(); } catch (e) { alert("發生錯誤：" + e.message); }
};

window.finalSubmit = async function() {
    if (!userProfile?.userId) { alert("❌ 安全驗證失敗"); window.showLoginScreen(); return; }
    if (!supabaseClient) { alert("❌ 資料庫未連線"); return; }

    const btn = document.getElementById('submit-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 處理中...';
    btn.disabled = true;

    try {
        const dateId = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(selectedDate.split('/')[1]).padStart(2, '0')}`;
        const { data, error: fetchErr } = await supabaseClient.from('calendar_slots').select('*').eq('date_id', dateId).maybeSingle();
        if (fetchErr) throw fetchErr;

        let booked = data ? (data.booked_slots || []) : [];
        if (booked.some(s => (typeof s === 'string' ? s : s.time) === selectedTime)) throw new Error("該時段已被預約 😭");

        let details = {
            design:  { ...bookingDetails.design },
            removal: { ...bookingDetails.removal },
            extras:  [...bookingDetails.extras]
        };

        if (bookingDetails.design.name === '任我做') {
            const k1 = document.getElementById('keyword1').value.trim();
            const k2 = isThinking ? '（讓我發揮）' : document.getElementById('keyword2').value.trim();
            details.design.keywords = [k1, k2];
        }

        if (unlimitedJumpCount > 0) details.extras.push({ name: '無限跳純色', count: unlimitedJumpCount, price: unlimitedJumpCount * 100 });
        if (extensionCount > 0)     details.extras.push({ name: '延甲', count: extensionCount, price: extensionCount * 150 });
        if (repairCount > 0)        details.extras.push({ name: '補甲', count: repairCount, price: repairCount * 50 });
        if (bigDiamondCount > 0)    details.extras.push({ name: '大鑽/凹凸', count: bigDiamondCount, price: bigDiamondCount * 50 });
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

        const { error: saveErr } = await supabaseClient.from('calendar_slots').upsert({ date_id: dateId, booked_slots: booked, status: 'available' });
        if (saveErr) throw saveErr;

        let detailMsg = '';
        if (details.design.name) { detailMsg += `\n🎨 造型：${details.design.name}`; if (details.design.keywords?.length > 0) detailMsg += ` (${details.design.keywords.join(', ')})`; }
        if (details.removal.name) detailMsg += `\n💅 卸甲：${details.removal.name}`;
        if (details.extras.length > 0) detailMsg += `\n✨ 加購：${details.extras.map(e => e.count ? `${e.name} x${e.count}` : e.name).join(', ')}`;

        const successMsg = `【新預約申請】\n\n📋 預約資訊：\n\n👤 顧客：${userProfile.displayName}\n📅 日期：${selectedDate}\n⏰ 時間：${selectedTime}${detailMsg}\n💰 預估金額：$${window.calculateTotal()}\n\n⏳ 等待管理員審核中...\n審核通過後我們會立即通知您。\n\n---\nLOST.IN.GALLERY`;

        try {
            await fetch('/api/send-line-message', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: CONFIG.ADMIN_LINE_USER_ID, message: successMsg }) });
        } catch (e) { console.warn("⚠️ 管理員通知發送失敗:", e); }

        try {
            if (liffInitialized && liff.isInClient()) await liff.sendMessages([{ type: 'text', text: successMsg }]);
        } catch (e) { console.warn("⚠️ 用戶端訊息發送失敗:", e); }

        btn.innerHTML = '✅ 預約已提交';
        btn.classList.add('bg-green-600');
        btn.classList.remove('bg-gray-800');

        setTimeout(() => {
            alert("✅ 預約已提交！\n\n我們已收到您的預約申請，請稍候管理員審核。\n\n審核通知將透過 LINE 傳送給您。");
            window.resetBookingForm();
            btn.innerHTML = originalText;
            btn.classList.add('bg-gray-800');
            btn.classList.remove('bg-green-600');
            btn.disabled = false;
        }, 1500);

    } catch (error) {
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

    // 重置思考中狀態
    isThinking = false;
    const thinkingBtn = document.getElementById('thinking-btn');
    if (thinkingBtn) { thinkingBtn.textContent = '💭 還在思考'; thinkingBtn.classList.remove('bg-yellow-600', 'border-yellow-500', 'text-white'); }
    document.getElementById('keyword2-wrap')?.classList.remove('hidden');
    document.getElementById('thinking-hint')?.classList.add('hidden');
    document.getElementById('grid-selected-info')?.classList.add('hidden');

    document.querySelectorAll('button[data-group]').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.rule-box').forEach(box => box.classList.add('hidden'));
    document.querySelectorAll('.calendar-day').forEach(day => day.classList.remove('selected'));
    document.querySelectorAll('.slot-ring.sel').forEach(s => s.classList.remove('sel'));

    const k1 = document.getElementById('keyword1'); if (k1) k1.value = '';
    const k2 = document.getElementById('keyword2'); if (k2) k2.value = '';
    document.getElementById('time-slots-container')?.classList.add('hidden');
    const termCheck = document.getElementById('term-check'); if (termCheck) termCheck.checked = false;

    ['ext-count','repair-count','unlimited-jump-count','big-diamond-count','nail-polish-removal-count'].forEach(id => {
        const el = document.getElementById(id); if (el) el.innerText = '0';
    });

    window.updateUI();
    window.validate();
};

// ===== 輔助函數 =====

window.showLoading = function(show) {
    const el = document.getElementById('global-loading');
    if (el) el.style.display = show ? 'flex' : 'none';
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
