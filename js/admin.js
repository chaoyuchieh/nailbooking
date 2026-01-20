// admin.js - 管理後台邏輯

console.log('🚀 admin.js 開始載入...');

// === 檢查依賴 ===
if (typeof CONFIG === 'undefined') {
    console.error('❌ CONFIG 未定義，請確認 config.js 已載入');
}

if (typeof supabaseClient === 'undefined') {
    console.warn('⚠️ supabaseClient 未定義，將使用離線模式');
}

// === 管理後台專用變數 ===
let adminYear = new Date().getFullYear();
let adminMonth = new Date().getMonth();
let adminSelectedIndex = null;

// === 登入功能 ===
window.doAdminLogin = function() {
    console.log('🔐 doAdminLogin 被呼叫');
    
    const adminId = document.getElementById('admin-id')?.value?.trim();
    const adminPwd = document.getElementById('admin-pwd')?.value?.trim();
    
    if (!adminId || !adminPwd) {
        alert('請輸入帳號和密碼');
        return;
    }
    
    if (adminId === 'admin' && adminPwd === '1234') {
        console.log('✅ 登入成功');
        sessionStorage.removeItem('manualLogout');
        
        // 隱藏登入畫面
        document.getElementById('login-overlay').classList.add('hidden');
        
        // 顯示管理面板
        const adminPanel = document.getElementById('admin-panel');
        adminPanel.classList.remove('hidden');
        adminPanel.style.display = 'flex';
        
        // 初始化管理功能
        window.initAdminYearSelector();
        window.fetchAdminCalendarData();
    } else {
        alert('❌ 帳號或密碼錯誤\n\n正確帳號: admin\n正確密碼: 1234');
    }
};

// === 登出功能 ===
window.adminLogout = function() {
    sessionStorage.setItem('manualLogout', 'true');
    location.reload();
};

// === 初始化年份選擇器 ===
window.initAdminYearSelector = function() {
    const yearSelect = document.getElementById('admin-year-selector');
    const monthSelect = document.getElementById('admin-month-selector');
    const currentYear = new Date().getFullYear();
    
    yearSelect.innerHTML = '';
    for (let y = currentYear - 1; y <= currentYear + 2; y++) {
        const option = document.createElement('option');
        option.value = y;
        option.text = `${y}年`;
        yearSelect.appendChild(option);
    }
    
    yearSelect.value = adminYear;
    monthSelect.value = adminMonth;
};

// === 切換月份 ===
window.changeAdminMonth = function(delta) {
    adminMonth += delta;
    if (adminMonth > 11) {
        adminMonth = 0;
        adminYear++;
    } else if (adminMonth < 0) {
        adminMonth = 11;
        adminYear--;
    }
    
    document.getElementById('admin-year-selector').value = adminYear;
    document.getElementById('admin-month-selector').value = adminMonth;
    
    window.fetchAdminCalendarData();
};

// === 直接切換月份 ===
window.changeAdminMonthDirect = function() {
    adminYear = parseInt(document.getElementById('admin-year-selector').value);
    adminMonth = parseInt(document.getElementById('admin-month-selector').value);
    window.fetchAdminCalendarData();
};

// === 載入行事曆資料 ===
window.fetchAdminCalendarData = async function() {
    console.log('📅 載入管理行事曆資料...');
    window.showLoading(true);
    
    try {
        // 先初始化本月資料結構 (使用 common.js 的 initMockData)
        window.initMockData(true, adminYear, adminMonth);
        
        // 如果有 Supabase，載入實際資料
        if (supabaseClient) {
            const { data, error } = await supabaseClient
                .from('calendar_slots')
                .select('*');
                
            if (error) throw error;
            
            // 載入關閉日期 (使用 common.js 的函數)
            await window.loadClosedDates();
            
            // 合併資料
            if (data) {
                data.forEach(row => {
                    const parts = row.date_id.split('-');
                    if (parseInt(parts[0]) === adminYear && parseInt(parts[1]) === adminMonth) {
                        const d = parseInt(parts[2]);
                        if (calendarData[d - 1]) {
                            calendarData[d - 1].status = row.status;
                            calendarData[d - 1].bookedSlots = row.booked_slots || [];
                        }
                    }
                });
            }
        }
    } catch (err) {
        console.log('⚠️ 無法載入資料，使用離線模式:', err.message);
    } finally {
        window.showLoading(false);
        window.renderAdminCalendar();
        window.updateCurrentOpenRange();
        window.updateTodayBookingStats();
    }
};

// === 渲染行事曆 ===
window.renderAdminCalendar = function() {
    console.log('🎨 渲染管理行事曆...');
    const grid = document.getElementById('admin-calendar-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    // 月初空白
    const firstDay = new Date(adminYear, adminMonth, 1).getDay();
    for (let i = 0; i < firstDay; i++) {
        grid.appendChild(document.createElement('div'));
    }
    
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    
    // 渲染每一天
    calendarData.forEach((item, index) => {
        const div = document.createElement('div');
        
        const itemDate = new Date(adminYear, adminMonth, item.date);
        itemDate.setHours(0, 0, 0, 0);
        const isPastDate = itemDate < todayDate;
        
        const isHoliday = item.status === 'booked';
        const dateColor = isHoliday ? 'text-gray-300' : (isPastDate ? 'text-gray-400' : 'text-gray-700');
        
        let dayText = `<div class="text-[11px] font-bold mb-1 ${dateColor}">${item.date}</div>`;
        
        if (isHoliday) {
            dayText += `<div class="text-[9px] text-gray-400 text-center mt-2">🚫 公休</div>`;
        } else if (item.bookedSlots && item.bookedSlots.length > 0) {
            const sorted = [...item.bookedSlots].sort((a, b) => {
                const ta = (typeof a === 'string' ? a : a.time);
                const tb = (typeof b === 'string' ? b : b.time);
                return ta.localeCompare(tb);
            });
            
            dayText += `<div class="w-full flex flex-col gap-[2px] overflow-hidden">`;
            sorted.forEach(booking => {
                const time = (typeof booking === 'string') ? booking : booking.time;
                const user = (typeof booking === 'object' && booking.user) ? booking.user : 'Admin';
                const status = (typeof booking === 'object' && booking.status) ? booking.status : 'approved';
                
                let barClass = 'bar-confirmed';
                let statusIcon = '✓';
                
                if (status === 'pending') {
                    barClass = 'bar-pending';
                    statusIcon = '⏳';
                } else if (status === 'pending_payment') {
                    barClass = 'bar-pending-payment';
                    statusIcon = '💰';
                }
                
                const displayUser = user.length > 3 ? user.substring(0, 3) + '…' : user;
                dayText += `<div class="booking-bar ${barClass}" title="${time} ${user}">${statusIcon}${time} ${displayUser}</div>`;
            });
            dayText += `</div>`;
        }
        
        div.innerHTML = dayText;
        div.className = `admin-day ${isPastDate ? 'status-past' : ''} ${index === adminSelectedIndex ? 'selected' : ''}`;
        
        if (isHoliday) {
            div.className += ' status-off';
        }
        
        div.onclick = () => window.selectAdminDate(index);
        grid.appendChild(div);
    });
};

// === 選擇日期 ===
window.selectAdminDate = function(index) {
    console.log('選擇日期:', index);
    adminSelectedIndex = index;
    window.renderAdminCalendar();
    
    const item = calendarData[index];
    document.getElementById('admin-edit-area').classList.remove('hidden');
    document.getElementById('admin-edit-date-title').innerText = `${adminMonth + 1} / ${item.date}`;
    
    // 更新關閉按鈕狀態
    const closeBtn = document.getElementById('admin-close-date-btn');
    const dateStr = `${adminYear}-${adminMonth}-${item.date}`;
    const isClosed = closedDates.includes(dateStr) || item.status === 'booked';
    
    if (isClosed) {
        closeBtn.textContent = '✓ 已關閉此日期（點擊重新開放）';
        closeBtn.className = 'w-full px-3 py-2 rounded-lg text-xs font-bold transition-colors border-2 border-red-300 bg-red-50 text-red-600';
    } else {
        closeBtn.textContent = '手動關閉此日期';
        closeBtn.className = 'w-full px-3 py-2 rounded-lg text-xs font-bold transition-colors border-2 border-gray-300 text-gray-600 hover:bg-gray-50';
    }
    
    // 顯示預約清單
    const listContainer = document.getElementById('admin-schedule-list');
    listContainer.innerHTML = '';
    
    if (item.status === 'booked' || closedDates.includes(dateStr)) {
        listContainer.innerHTML = `<div class="text-center p-4 bg-gray-100 rounded text-gray-500">🚫 本日已設為公休</div>`;
    } else if (item.bookedSlots && item.bookedSlots.length > 0) {
        item.bookedSlots.forEach(booking => {
            const time = typeof booking === 'string' ? booking : booking.time;
            const userName = typeof booking === 'object' ? booking.user : 'Admin';
            const status = typeof booking === 'object' ? booking.status : 'approved';
            
            const row = document.createElement('div');
            row.className = 'bg-gray-50 p-3 rounded-lg text-sm';
            row.innerHTML = `
                <div class="font-bold">${time}</div>
                <div class="text-gray-600 text-xs">預約人：${userName}</div>
                <div class="text-gray-400 text-xs">狀態：${status}</div>
            `;
            listContainer.appendChild(row);
        });
    } else {
        listContainer.innerHTML = `<div class="text-center p-4 bg-gray-50 rounded text-gray-400 text-sm">📅 本日尚無預約</div>`;
    }
};

// === 關閉編輯區 ===
window.closeEditArea = function() {
    document.getElementById('admin-edit-area').classList.add('hidden');
    adminSelectedIndex = null;
    window.renderAdminCalendar();
};

// === 切換日期開關 ===
window.toggleDateClosed = function() {
    if (adminSelectedIndex === null) return;
    
    const item = calendarData[adminSelectedIndex];
    const dateStr = `${adminYear}-${adminMonth}-${item.date}`;
    
    const idx = closedDates.indexOf(dateStr);
    if (idx > -1) {
        closedDates.splice(idx, 1);
        console.log('✅ 重新開放日期:', dateStr);
    } else {
        closedDates.push(dateStr);
        console.log('🚫 關閉日期:', dateStr);
    }
    
    // 重新選擇以更新 UI
    window.selectAdminDate(adminSelectedIndex);
};

// === 更新開放範圍顯示 ===
window.updateCurrentOpenRange = function() {
    const rangeEl = document.getElementById('open-range-dates');
    if (!rangeEl) return;
    
    window.calculateBookingRange();
    
    if (bookingOpenRanges.ranges && bookingOpenRanges.ranges.length > 0) {
        let html = '';
        bookingOpenRanges.ranges.forEach(range => {
            const startStr = `${range.start.getMonth() + 1}/${range.start.getDate()}`;
            const endStr = `${range.end.getMonth() + 1}/${range.end.getDate()}`;
            html += `<div>• ${startStr} ~ ${endStr}</div>`;
        });
        rangeEl.innerHTML = html;
    } else {
        rangeEl.innerHTML = '目前無開放預約';
    }
};

// === 更新統計資訊 ===
window.updateTodayBookingStats = function() {
    const statsEl = document.getElementById('today-booking-stats');
    if (!statsEl) return;
    
    let totalBookings = 0;
    let pendingCount = 0;
    let confirmedCount = 0;
    
    calendarData.forEach(item => {
        if (item.bookedSlots) {
            item.bookedSlots.forEach(booking => {
                totalBookings++;
                const status = typeof booking === 'object' ? booking.status : 'approved';
                if (status === 'pending' || status === 'pending_payment') {
                    pendingCount++;
                } else {
                    confirmedCount++;
                }
            });
        }
    });
    
    statsEl.innerHTML = `
        <div class="flex justify-between items-center text-xs">
            <span class="text-gray-600">本月預約總數</span>
            <span class="font-bold text-gray-800">${totalBookings} 筆</span>
        </div>
        <div class="flex justify-between items-center text-xs">
            <span class="text-gray-600">待審核</span>
            <span class="font-bold text-orange-600">${pendingCount} 筆</span>
        </div>
        <div class="flex justify-between items-center text-xs">
            <span class="text-gray-600">已確認</span>
            <span class="font-bold text-green-600">${confirmedCount} 筆</span>
        </div>
    `;
};

// === 統計詳情切換 ===
window.toggleStatsDetail = function() {
    const detail = document.getElementById('stats-detail');
    const toggleText = document.getElementById('stats-toggle-text');
    if (detail) {
        detail.classList.toggle('hidden');
        if (toggleText) {
            toggleText.textContent = detail.classList.contains('hidden') ? '詳細 ▼' : '收起 ▲';
        }
    }
};

// === 儲存設定 ===
window.saveAdminSettings = async function() {
    if (!supabaseClient) {
        alert('❌ 離線模式無法儲存到資料庫\n\n變更只會在本次瀏覽有效');
        return;
    }
    
    if (!confirm('確定要儲存所有變更嗎？')) {
        return;
    }
    
    window.showLoading(true);
    try {
        // 儲存關閉日期 (使用 common.js 的函數)
        await window.saveClosedDates();
        
        alert('✅ 儲存成功！');
    } catch (e) {
        alert('❌ 儲存失敗：' + e.message);
    } finally {
        window.showLoading(false);
    }
};

console.log('✅ admin.js 載入完成');
console.log('doAdminLogin 類型:', typeof window.doAdminLogin);