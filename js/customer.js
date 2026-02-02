// customer.js - 客戶端功能

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
        // 如果 LIFF 還沒初始化，先初始化
        if (!liffInitialized) {
            console.log('🔄 初始化 LIFF...');
            await liff.init({ liffId: CONFIG.LIFF_ID });
            liffInitialized = true;
            console.log('✅ LIFF 初始化成功');
        }
        
        if (!liff.isLoggedIn()) {
            console.log('🔄 Redirecting to LINE login...');
            liff.login({ redirectUri: window.location.href });
        } else {
            // 已登入，取得用戶資料
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
        console.error("⚠️ 無法檢查好友狀態", e);
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

// ===== 選項選擇功能 =====

window.selectSingleOption = function(el, price, group, name) {
    document.querySelectorAll(`button[data-group="${group}"]`).forEach(b => b.classList.remove('active'));
    if (group === 'design') {
        document.querySelectorAll('.rule-box').forEach(b => b.classList.add('hidden'));
        document.getElementById('keyword1').value = '';
        document.getElementById('keyword2').value = '';
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

window.updateBigDiamondCount = function(n) {
    if (bigDiamondCount + n >= 0) { 
        bigDiamondCount += n; 
        document.getElementById('big-diamond-count').innerText = bigDiamondCount; 
        window.updateUI(); 
    }
};

window.updateNailPolishRemovalCount = function(n) {
    if (nailPolishRemovalCount + n >= 0) { 
        nailPolishRemovalCount += n; 
        document.getElementById('nail-polish-removal-count').innerText = nailPolishRemovalCount; 
        window.updateUI(); 
    }
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

window.toggleDesignRule = function(id, el) {
    const rule = document.getElementById(id);
    if (el.classList.contains('active')) rule.classList.remove('hidden');
    else rule.classList.add('hidden');
};

window.updateExtensionCount = function(n) {
    if (extensionCount + n >= 0) { 
        extensionCount += n; 
        document.getElementById('ext-count').innerText = extensionCount; 
        window.updateUI(); 
    }
};

window.updateRepairCount = function(n) {
    if (repairCount + n >= 0) { 
        repairCount += n; 
        document.getElementById('repair-count').innerText = repairCount; 
        window.updateUI(); 
    }
};

window.updateUnlimitedJumpCount = function(n) {
    if (unlimitedJumpCount + n >= 0) { 
        unlimitedJumpCount += n; 
        document.getElementById('unlimited-jump-count').innerText = unlimitedJumpCount; 
        window.updateUI(); 
    }
};

window.calculateTotal = function() {
    return priceState.design + priceState.removal + priceState.extras + 
           (unlimitedJumpCount * 100) + (extensionCount * 150) + (repairCount * 50) +
           (bigDiamondCount * 50) + (nailPolishRemovalCount * 50);
};

window.updateUI = function() {
    const total = window.calculateTotal();
    const priceEl = document.getElementById('price-display');
    priceEl.innerText = total;
    if (total === 0) priceEl.classList.add('text-red-500'); 
    else priceEl.classList.remove('text-red-500');
    window.validate();
};

window.validate = function() {
    const check = document.getElementById('term-check').checked;
    const total = window.calculateTotal();
    const btn = document.getElementById('submit-btn');
    const msgEl = document.getElementById('validation-msg');
    
    let errors = [];
    if (!userProfile || !userProfile.userId) errors.push("需 LINE 登入");
    if (total <= 0) errors.push("未選項目");
    
    const needRemovalBtn = document.getElementById('need-removal-yes');
    if (needRemovalBtn && needRemovalBtn.classList.contains('active')) {
        const hasRemovalSelected = Array.from(document.querySelectorAll('button[data-group="removal"]'))
            .some(btn => btn.classList.contains('active'));
        if (!hasRemovalSelected) {
            errors.push("請選擇卸甲方式");
        }
    }
    
    if (bookingDetails.design.name === '任我做') {
        const k1 = document.getElementById('keyword1').value.trim();
        const k2 = document.getElementById('keyword2').value.trim();
        if (!k1 || !k2) errors.push("任我做需填關鍵字");
    }
    
    if (!selectedDate) errors.push("未選日期");
    if (!selectedTime) errors.push("未選時間");
    if (!check) errors.push("未勾選同意");

    const isValid = errors.length === 0;

    if (isValid) {
        btn.classList.remove('opacity-50');
        msgEl.innerText = '';
    } else {
        btn.classList.add('opacity-50');
        msgEl.innerText = errors.join(' / ');
    }
    btn.disabled = false;
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
    
    // ✅ 修改這裡：強制要求是好友
    if (!isFriend) {
        alert("❌ 必須加入 LINE 官方帳號才能預約！\n\n原因：\n• 需要發送預約確認通知\n• 需要接收審核結果\n• 需要接收付款資訊\n\n請點擊下方「立即加入官方帳號」按鈕");
        
        document.getElementById('friend-warning').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
        });
        
        const friendWarning = document.getElementById('friend-warning');
        friendWarning.classList.add('animate-pulse');
        setTimeout(() => {
            friendWarning.classList.remove('animate-pulse');
        }, 2000);
        
        return; // ⛔ 直接阻止，不允許繼續
    }
    
     
    if (total <= 0) { 
        alert("❌ 您尚未選擇任何服務項目！"); 
        return; 
    }
    
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
        // ✅ 組合日期 ID
        const dateId = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(selectedDate.split('/')[1]).padStart(2, '0')}`;
        console.log('📅 查詢日期:', dateId);
        
        // ✅ 查詢現有記錄
        const { data, error: fetchErr } = await supabaseClient
            .from('calendar_slots')
            .select('*')
            .eq('date_id', dateId);
        
        // ✅ 錯誤處理
        if (fetchErr) {
            console.error('❌ 資料庫查詢錯誤:', fetchErr);
            throw fetchErr;
        }
        
        // ✅ 處理查詢結果
        let booked = [];
        if (data && data.length > 0) {
            booked = data[0].booked_slots || [];
            console.log('📋 找到現有記錄，已有', booked.length, '筆預約');
        } else {
            console.log('📝 這是新的日期，將建立記錄');
        }
        
        // ✅ 檢查時段是否被搶
        if (booked.some(s => (typeof s === 'string' ? s : s.time) === selectedTime)) {
            throw new Error("該時段已被預約 😭");
        }
        
        let userName = userProfile.displayName;
        let userId = userProfile.userId;
        
        // ✅ 組合預約詳細資料
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
        
        if (unlimitedJumpCount > 0) details.extras.push({ 
            name: '無限跳純色', 
            count: unlimitedJumpCount, 
            price: unlimitedJumpCount * 100 
        });
        if (extensionCount > 0) details.extras.push({ 
            name: '延甲', 
            count: extensionCount, 
            price: extensionCount * 150 
        });
        if (repairCount > 0) details.extras.push({ 
            name: '補甲', 
            count: repairCount, 
            price: repairCount * 50 
        });
        if (bigDiamondCount > 0) details.extras.push({ 
            name: '大鑽/凹凸', 
            count: bigDiamondCount, 
            price: bigDiamondCount * 50 
        });
        if (nailPolishRemovalCount > 0) details.extras.push({ 
            name: '卸指甲油', 
            count: nailPolishRemovalCount, 
            price: nailPolishRemovalCount * 50 
        });
        
        // ✅ 新增預約
        booked.push({
            time: selectedTime,
            user: userName,
            userId: userId,
            status: 'pending',
            bookingDetails: details,
            totalPrice: window.calculateTotal()
        });

        console.log('💾 準備儲存預約:', booked[booked.length - 1]);

        // ✅ 儲存到資料庫
        const { error: saveErr } = await supabaseClient
            .from('calendar_slots')
            .upsert({ 
                date_id: dateId, 
                booked_slots: booked, 
                status: 'available' 
            });
            
        if (saveErr) {
            console.error('❌ 儲存錯誤:', saveErr);
            throw saveErr;
        }
        
       console.log('✅ 預約儲存成功');
        
        // ✅ 組合確認訊息
        let detailMsg = '';
        if (details.design.name) {
            detailMsg += `\n🎨 造型：${details.design.name}`;
            if (details.design.keywords && details.design.keywords.length > 0) {
                detailMsg += ` (${details.design.keywords.join(', ')})`;
            }
        }
        if (details.removal.name) {
            detailMsg += `\n💅 卸甲：${details.removal.name}`;
        }
        if (details.extras.length > 0) {
            detailMsg += `\n✨ 加購：${details.extras.map(e => {
                if (e.count) return `${e.name} x${e.count}`;
                return e.name;
            }).join(', ')}`;
        }
        
       const successMsg = `【新預約申請】

📋 預約資訊：

👤 顧客：${userName}
📅 日期：${selectedDate}
⏰ 時間：${selectedTime}${detailMsg}
💰 預估金額：$${window.calculateTotal()}

⏳ 等待管理員審核中...
審核通過後我們會立即通知您。

---
LOST.IN.GALLERY_`;

      
        try {
    console.log('📤 準備發送 LINE 訊息...');
    console.log('🔍 liffInitialized:', liffInitialized);
    console.log('🔍 isInClient:', liff.isInClient());
            
    if (liffInitialized && liff.isInClient()) {
        await liff.sendMessages([{
            type: 'text',
            text: successMsg
        }]);
        console.log('✅ LINE 訊息發送成功');
    } else {
        console.warn('⚠️ 不在 LINE App 內，無法自動發送訊息');
    }
} catch (e) {
    console.warn("⚠️ 發送訊息失敗:", e);
}

        alert(`✅ 預約申請已送出！\n\n已發送確認訊息到您的 LINE\n請等待管理員審核通知。`);
        setTimeout(() => window.location.reload(), 2000);

        } catch (e) {
        console.error('❌ 預約失敗:', e);
        alert("❌ 預約失敗：" + e.message);
        btn.innerHTML = originalText;
        btn.disabled = false;
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
            div.onclick = () => {
                alert('🚫 此日期已關閉，無法預約\n\n如有需要請聯繫我們');
            };
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
            clickable = true;
            div.title = '點擊預約';
        }
        
        div.className = className;
        
        if(clickable) {
            div.onclick = () => window.selectDate(div, item.date, item.bookedSlots);
        }
        
        grid.appendChild(div);
    });
};

window.selectDate = function(el, date, slots) {
    document.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('selected'));
    el.classList.add('selected'); 
    selectedDate = `${currentMonth+1}/${date}`;
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
    for (let hour = 10; hour <= 18; hour++) {
        quickSlots.push({ hour: hour, minute: 0 });
    }
    
    quickSlots.forEach(slot => {
        const timeStr = window.formatTime(slot.hour, slot.minute);
        const timeMinutes = slot.hour * 60 + slot.minute;
        const isConflict = window.isTimeConflict(timeMinutes);
        
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
    
    const timeDisplay = document.getElementById('selected-time-display');
    timeDisplay.innerText = window.formatTime(currentTimeHour, currentTimeMinute);
    
    window.updateServiceEndTime();
    window.checkTimeConflict();
};

window.quickSelectTime = function(hour, minute) {
    currentTimeHour = hour;
    currentTimeMinute = minute;
    
    document.querySelectorAll('#quick-time-slots button').forEach(btn => {
        btn.classList.remove('active', 'bg-gray-800', 'text-white');
    });
    event.target.classList.add('active', 'bg-gray-800', 'text-white');
    
    const timeDisplay = document.getElementById('selected-time-display');
    timeDisplay.innerText = window.formatTime(currentTimeHour, currentTimeMinute);
    
    window.updateServiceEndTime();
    window.checkTimeConflict();
    
    timeDisplay.classList.add('scale-110');
    setTimeout(() => {
        timeDisplay.classList.remove('scale-110');
    }, 200);
};

window.updateServiceEndTime = function() {
    const currentTimeMinutes = currentTimeHour * 60 + currentTimeMinute;
    const endTimeMinutes = currentTimeMinutes + CONFIG.SERVICE_DURATION_MINUTES;
    const endTime = window.minutesToTime(endTimeMinutes);
    const endTimeStr = window.formatTime(endTime.hour, endTime.minute);
    
    const serviceEndDisplay = document.getElementById('service-end-time');
    if (serviceEndDisplay) {
        serviceEndDisplay.innerText = `服務至 ${endTimeStr}`;
    }
};

window.isTimeConflict = function(selectedTimeMinutes) {
    const selectedStart = selectedTimeMinutes;
    const selectedEnd = selectedTimeMinutes + CONFIG.SERVICE_DURATION_MINUTES;
    
    for (let bookedTimeStr of currentDateBookedTimes) {
        const bookedStart = window.timeToMinutes(bookedTimeStr);
        const bookedEnd = bookedStart + CONFIG.SERVICE_DURATION_MINUTES;
        
        if (window.checkTimeOverlap(selectedStart, selectedEnd, bookedStart, bookedEnd)) {
            return true;
        }
    }
    
    return false;
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
    
    document.querySelectorAll('#quick-time-slots button').forEach(btn => {
        const btnTime = btn.innerText;
        const currentTime = window.formatTime(currentTimeHour, currentTimeMinute);
        if (btnTime === currentTime) {
            btn.classList.add('active', 'bg-gray-800', 'text-white');
        } else {
            btn.classList.remove('active', 'bg-gray-800', 'text-white');
        }
    });
    
    const timeDisplay = document.getElementById('selected-time-display');
    timeDisplay.innerText = window.formatTime(currentTimeHour, currentTimeMinute);
    
    window.updateServiceEndTime();
    window.checkTimeConflict();
};

window.checkTimeConflict = function() {
    const currentTimeMinutes = currentTimeHour * 60 + currentTimeMinute;
    const hasConflict = window.isTimeConflict(currentTimeMinutes);
    
    const warning = document.getElementById('time-conflict-warning');
    const confirmBtn = document.getElementById('confirm-time-btn');
    
    if (hasConflict) {
        const nextAvailableTime = window.findNextAvailableTime(currentTimeMinutes);
        
        if (nextAvailableTime) {
            const availTime = window.minutesToTime(nextAvailableTime);
            const availTimeStr = window.formatTime(availTime.hour, availTime.minute);
            warning.innerHTML = `⏰ 建議選擇：<strong>${availTimeStr}</strong> 或之後的時間`;
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
    
    for (let bookedTimeStr of currentDateBookedTimes) {
        const bookedStart = window.timeToMinutes(bookedTimeStr);
        const bookedEnd = bookedStart + CONFIG.SERVICE_DURATION_MINUTES;
        const selectedStart = fromTimeMinutes;
        const selectedEnd = fromTimeMinutes + CONFIG.SERVICE_DURATION_MINUTES;
        
        if (window.checkTimeOverlap(selectedStart, selectedEnd, bookedStart, bookedEnd)) {
            if (bookedEnd > latestEndTime) {
                latestEndTime = bookedEnd;
            }
        }
    }
    
    const businessEndMinutes = CONFIG.BUSINESS_HOURS.end.hour * 60 + CONFIG.BUSINESS_HOURS.end.minute;
    
    if (latestEndTime + CONFIG.SERVICE_DURATION_MINUTES <= businessEndMinutes) {
        return latestEndTime;
    }
    
    return null;
};

window.confirmTime = function() {
    const timeStr = window.formatTime(currentTimeHour, currentTimeMinute);
    const currentTimeMinutes = currentTimeHour * 60 + currentTimeMinute;
    
    if (window.isTimeConflict(currentTimeMinutes)) {
        const nextAvailableTime = window.findNextAvailableTime(currentTimeMinutes);
        
        if (nextAvailableTime) {
            const availTime = window.minutesToTime(nextAvailableTime);
            const availTimeStr = window.formatTime(availTime.hour, availTime.minute);
            alert(`❌ 此時段無法預約\n\n💡 建議選擇：${availTimeStr} 或之後的時間`);
        } else {
            alert("❌ 今日已無可用時段\n\n請選擇其他日期");
        }
        return;
    }
    
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

console.log('✅ customer.js loaded');
