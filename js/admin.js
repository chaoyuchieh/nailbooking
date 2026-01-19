// admin.js - 管理後台邏輯

console.log('🚀 admin.js 開始載入...');

// === 檢查依賴 ===
if (typeof CONFIG === 'undefined') {
    console.error('❌ CONFIG 未定義');
}

if (typeof supabaseClient === 'undefined') {
    console.error('❌ supabaseClient 未定義');
}

// === 全域變數 ===
const today = new Date();
let adminYear = today.getFullYear();
let adminMonth = today.getMonth();
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
        
        window.fetchAdminCalendarData().then(() => {
            window.renderAdminCalendar();
            window.updateCurrentOpenRange();
        });
    } else {
        alert('❌ 帳號或密碼錯誤\n\n正確帳號: admin\n正確密碼: 1234');
    }
};

// === 登出功能 ===
window.adminLogout = function() {
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

// === 初始化年份選擇器 ===
window.initAdminYearSelector = function() {
    const yearSelect = document.getElementById('admin-year-selector');
    const monthSelect = document.getElementById('admin-month-selector');
    const currentYear = today.getFullYear();
    
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
    
    window.fetchAdminCalendarData().then(() => {
        window.renderAdminCalendar();
        window.updateCurrentOpenRange();
    });
};

// === 直接切換月份 ===
window.changeAdminMonthDirect = function() {
    adminYear = parseInt(document.getElementById('admin-year-selector').value);
    adminMonth = parseInt(document.getElementById('admin-month-selector').value);
    
    window.fetchAdminCalendarData().then(() => {
        window.renderAdminCalendar();
        window.updateCurrentOpenRange();
    });
};

// === 儲存設定 ===
window.saveAdminSettings = async function() {
    if (!supabaseClient) {
        alert('❌ 離線模式無法儲存');
        return;
    }
    
    if (!confirm('確定要儲存所有變更嗎？')) {
        return;
    }
    
    window.showLoading(true);
    try {
        const updates = calendarData.map(item => ({
            date_id: `${adminYear}-${adminMonth}-${item.date}`,
            status: item.status,
            booked_slots: item.bookedSlots
        }));
        
        const { error } = await supabaseClient
            .from('calendar_slots')
            .upsert(updates);
            
        if (error) throw error;
        
        await window.saveClosedDates();
        
        alert('✅ 儲存成功！');
        window.adminLogout();
    } catch (e) {
        alert('❌ 儲存失敗：' + e.message);
    } finally {
        window.showLoading(false);
    }
};

// === 載入行事曆資料 ===
window.fetchAdminCalendarData = async function() {
    console.log('📅 載入管理行事曆資料...');
    window.showLoading(true);
    
    try {
        const { data, error } = await supabaseClient
            .from('calendar_slots')
            .select('*');
            
        if (error) throw error;
        
        await window.loadClosedDates();
        
        window.initMockData(true, adminYear, adminMonth);
        
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
    } catch (err) {
        console.log('⚠️ 無法載入資料:', err.message);
        window.initMockData(false, adminYear, adminMonth);
    } finally {
        window.showLoading(false);
    }
};

// === 渲染行事曆 ===
window.renderAdminCalendar = function() {
    console.log('🎨 渲染管理行事曆...');
    const grid = document.getElementById('admin-calendar-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    const firstDay = new Date(adminYear, adminMonth, 1).getDay();
    for (let i = 0; i < firstDay; i++) {
        grid.appendChild(document.createElement('div'));
    }
    
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    
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
                let statusIcon = '';
                
                if (status === 'pending') {
                    barClass = 'bar-pending';
                    statusIcon = '⏳';
                } else if (status === 'pending_payment') {
                    barClass = 'bar-pending-payment';
                    statusIcon = '💰';
                } else if (status === 'confirmed' || status === 'approved') {
                    barClass = 'bar-confirmed';
                    statusIcon = '✓';
                }
                
                let displayUser = user;
                if (user.length > 3) {
                    displayUser = user.substring(0, 3) + '…';
                }
                
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
    
    window.updateClosedDatesList();
    window.updateCurrentOpenRange();
};

// === 其他必要函數的佔位符 ===
window.selectAdminDate = function(index) {
    console.log('選擇日期:', index);
    adminSelectedIndex = index;
    // TODO: 實作詳細功能
};

window.updateCurrentOpenRange = function() {
    console.log('更新開放範圍');
    // TODO: 實作
};

window.updateClosedDatesList = function() {
    console.log('更新關閉日期列表');
    // TODO: 實作
};

window.loadClosedDates = async function() {
    console.log('載入關閉日期');
    // TODO: 實作
};

window.saveClosedDates = async function() {
    console.log('儲存關閉日期');
    // TODO: 實作
};

window.toggleDateClosed = function() {
    console.log('切換日期開關');
    // TODO: 實作
};

console.log('✅ admin.js 載入完成');
console.log('doAdminLogin 類型:', typeof window.doAdminLogin);
```

---

## 3️⃣ 測試步驟

1. **重新整理頁面** (Ctrl+Shift+R 或 Cmd+Shift+R)
2. **打開開發者工具** (F12)
3. **查看 Console** 應該看到:
```
   ✅ config.js loaded
   ✅ Supabase initialized
   ✅ admin.js 載入完成
   doAdminLogin 類型: function