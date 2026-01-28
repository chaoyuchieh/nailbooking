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
                    if (parseInt(parts[0]) === adminYear && parseInt(parts[1]) === adminMonth + 1) {
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
        // 排序預約
        const sorted = [...item.bookedSlots].sort((a, b) => {
            const ta = (typeof a === 'string' ? a : a.time);
            const tb = (typeof b === 'string' ? b : b.time);
            return ta.localeCompare(tb);
        });
        
        sorted.forEach((booking, bookingIndex) => {
            const time = typeof booking === 'string' ? booking : booking.time;
            const userName = typeof booking === 'object' ? booking.user : 'Admin';
            const userId = typeof booking === 'object' ? booking.userId : '';
            const status = typeof booking === 'object' ? booking.status : 'confirmed';
            const details = typeof booking === 'object' ? booking.bookingDetails : null;
            const totalPrice = typeof booking === 'object' ? booking.totalPrice : 0;
            
            const row = document.createElement('div');
            row.className = 'bg-white border-2 rounded-lg overflow-hidden mb-3 shadow-sm';
            
            // 狀態樣式
            let statusBgClass = 'bg-gray-100';
            let statusTextClass = 'text-gray-700';
            let statusText = '已確認';
            let statusIcon = '✓';
            
            if (status === 'pending') {
                statusBgClass = 'bg-orange-50';
                statusTextClass = 'text-orange-700';
                statusText = '待審核';
                statusIcon = '⏳';
            } else if (status === 'pending_payment') {
                statusBgClass = 'bg-blue-50';
                statusTextClass = 'text-blue-700';
                statusText = '等待付款';
                statusIcon = '💰';
            } else if (status === 'confirmed') {
                statusBgClass = 'bg-green-50';
                statusTextClass = 'text-green-700';
                statusText = '已確認';
                statusIcon = '✓';
            } else if (status === 'rejected') {
                statusBgClass = 'bg-red-50';
                statusTextClass = 'text-red-700';
                statusText = '已拒絕';
                statusIcon = '✗';
            }
            
            // 組合詳細資訊
            let detailsHtml = '';
            if (details) {
                if (details.design && details.design.name) {
                    detailsHtml += `<div class="text-xs text-gray-600">🎨 ${details.design.name}`;
                    if (details.design.keywords && details.design.keywords.length > 0) {
                        detailsHtml += ` (${details.design.keywords.join(', ')})`;
                    }
                    detailsHtml += `</div>`;
                }
                if (details.removal && details.removal.name) {
                    detailsHtml += `<div class="text-xs text-gray-600">💅 ${details.removal.name}</div>`;
                }
                if (details.extras && details.extras.length > 0) {
                    const extrasStr = details.extras.map(e => {
                        if (e.count) return `${e.name} x${e.count}`;
                        return e.name;
                    }).join(', ');
                    detailsHtml += `<div class="text-xs text-gray-600">✨ ${extrasStr}</div>`;
                }
            }
            
            row.innerHTML = `
                <!-- 狀態標籤 -->
                <div class="${statusBgClass} px-3 py-2 flex justify-between items-center">
                    <span class="${statusTextClass} text-xs font-bold">${statusIcon} ${statusText}</span>
                    <span class="text-xs text-gray-500">${time}</span>
                </div>
                
                <!-- 預約資訊 -->
                <div class="p-3">
                    <div class="font-bold text-sm mb-1">${userName}</div>
                    ${detailsHtml}
                    <div class="text-xs font-bold text-gray-800 mt-2">預估金額：$${totalPrice}</div>
                </div>
                
                <!-- 審核按鈕區 -->
                <div id="booking-actions-${bookingIndex}" class="p-3 bg-gray-50 border-t border-gray-200">
                    ${status === 'pending' ? `
                        <div class="grid grid-cols-2 gap-2 mb-2">
                            <button onclick="approveBookingWithDeposit('${dateStr}', ${bookingIndex}, '${userId}')" 
                                    class="bg-blue-600 text-white px-3 py-2 rounded text-xs font-bold hover:bg-blue-700 transition">
                                💰 需要訂金
                            </button>
                            <button onclick="approveBookingDirectly('${dateStr}', ${bookingIndex}, '${userId}')" 
                                    class="bg-green-600 text-white px-3 py-2 rounded text-xs font-bold hover:bg-green-700 transition">
                                ✓ 直接確認
                            </button>
                        </div>
                        <button onclick="rejectBooking('${dateStr}', ${bookingIndex}, '${userId}')" 
                                class="w-full bg-red-100 text-red-600 px-3 py-2 rounded text-xs font-bold hover:bg-red-200 transition">
                            ✗ 拒絕預約
                        </button>
                    ` : status === 'pending_payment' ? `
                        <button onclick="confirmPayment('${dateStr}', ${bookingIndex}, '${userId}')" 
                                class="w-full bg-green-600 text-white px-3 py-2 rounded text-xs font-bold hover:bg-green-700 transition">
                            ✓ 確認已付款
                        </button>
                        <button onclick="cancelBooking('${dateStr}', ${bookingIndex}, '${userId}')" 
                                class="w-full bg-red-100 text-red-600 px-3 py-2 rounded text-xs font-bold hover:bg-red-200 transition mt-2">
                            ✗ 取消預約
                        </button>
                    ` : status === 'confirmed' ? `
                        <div class="text-center text-xs text-green-600 font-bold py-2">✓ 預約已確認</div>
                        <button onclick="cancelBooking('${dateStr}', ${bookingIndex}, '${userId}')" 
                                class="w-full bg-red-100 text-red-600 px-3 py-2 rounded text-xs font-bold hover:bg-red-200 transition mt-2">
                            取消此預約
                        </button>
                    ` : `
                        <div class="text-center text-xs text-gray-500 py-2">此預約已${statusText}</div>
                    `}
                </div>
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
    const dateStr = `${adminYear}-${adminMonth+ 1}-${item.date}`;
    
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

// ===== 審核功能 =====

// 需要訂金 - 發送付款資訊
window.approveBookingWithDeposit = async function(dateStr, bookingIndex, userId) {
    if (!confirm('確定此預約需要訂金嗎？\n\n將發送付款資訊給顧客')) return;
    
    window.showLoading(true);
    try {
        // 更新狀態為等待付款
        await updateBookingStatus(dateStr, bookingIndex, 'pending_payment');
        
        // 發送付款資訊
        const booking = getBookingByDateAndIndex(dateStr, bookingIndex);
        await sendLineMessage(userId, `【需要支付訂金】

您好 ${booking.user}，
您的預約已審核通過！

📅 預約日期：${dateStr}
⏰ 預約時間：${booking.time}
💰 預估金額：$${booking.totalPrice}

💳 請支付訂金 $500
匯款資訊：
銀行代碼：XXX
帳號：XXXXXXXXXXXX
戶名：XXX

完成匯款後請回覆「已匯款」
我們確認後會立即通知您

---
LOST.IN.GALLERY_`);
        
        alert('✅ 已發送付款資訊給顧客');
        await window.fetchAdminCalendarData();
        window.selectAdminDate(adminSelectedIndex);
    } catch (e) {
        alert('❌ 操作失敗：' + e.message);
    } finally {
        window.showLoading(false);
    }
};

// 直接確認
window.approveBookingDirectly = async function(dateStr, bookingIndex, userId) {
    if (!confirm('確定直接確認此預約嗎？')) return;
    
    window.showLoading(true);
    try {
        // 更新狀態為已確認
        await updateBookingStatus(dateStr, bookingIndex, 'confirmed');
        
        // 發送確認訊息
        const booking = getBookingByDateAndIndex(dateStr, bookingIndex);
        await sendLineMessage(userId, `【預約確認成功】✅

您好 ${booking.user}，
您的預約已確認完成！

📅 預約日期：${dateStr}
⏰ 預約時間：${booking.time}
💰 預估金額：$${booking.totalPrice}

期待您的到來！
如需變更請提前告知

---
LOST.IN.GALLERY_`);
        
        alert('✅ 預約已確認');
        await window.fetchAdminCalendarData();
        window.selectAdminDate(adminSelectedIndex);
    } catch (e) {
        alert('❌ 操作失敗：' + e.message);
    } finally {
        window.showLoading(false);
    }
};

// 拒絕預約
window.rejectBooking = async function(dateStr, bookingIndex, userId) {
    const reason = prompt('請輸入拒絕原因（選填）：');
    if (reason === null) return; // 取消
    
    window.showLoading(true);
    try {
        // 先取得預約資料（在刪除前）
        const booking = getBookingByDateAndIndex(dateStr, bookingIndex);
        
        // 刪除預約
        await removeBooking(dateStr, bookingIndex);
        
        // 發送通知
        let message = `【預約未通過】

您好 ${booking.user}，
很抱歉，您的預約無法受理

📅 預約日期：${dateStr}
⏰ 預約時間：${booking.time}`;

        if (reason && reason.trim()) {
            message += `\n\n原因：${reason}`;
        }
        
        message += `\n\n如有疑問請聯繫我們\n感謝您的理解

---
LOST.IN.GALLERY_`;

        await sendLineMessage(userId, message);
        
        alert('✅ 已拒絕預約並通知顧客');
        await window.fetchAdminCalendarData();
        window.selectAdminDate(adminSelectedIndex);
    } catch (e) {
        alert('❌ 操作失敗：' + e.message);
    } finally {
        window.showLoading(false);
    }
};

// 確認付款
window.confirmPayment = async function(dateStr, bookingIndex, userId) {
    if (!confirm('確認顧客已完成付款嗎？')) return;
    
    window.showLoading(true);
    try {
        await updateBookingStatus(dateStr, bookingIndex, 'confirmed');
        
        const booking = getBookingByDateAndIndex(dateStr, bookingIndex);
        await sendLineMessage(userId, `【付款確認成功】✅

您好 ${booking.user}，
我們已確認收到您的訂金！

📅 預約日期：${dateStr}
⏰ 預約時間：${booking.time}
💰 預估金額：$${booking.totalPrice}

預約已完成確認
期待您的到來！

---
LOST.IN.GALLERY_`);
        
        alert('✅ 付款已確認');
        await window.fetchAdminCalendarData();
        window.selectAdminDate(adminSelectedIndex);
    } catch (e) {
        alert('❌ 操作失敗：' + e.message);
    } finally {
        window.showLoading(false);
    }
};

// 取消預約
window.cancelBooking = async function(dateStr, bookingIndex, userId) {
    const reason = prompt('請輸入取消原因：');
    if (!reason || !reason.trim()) {
        alert('請輸入取消原因');
        return;
    }
    
    window.showLoading(true);
    try {
        // 先取得預約資料（在刪除前）
        const booking = getBookingByDateAndIndex(dateStr, bookingIndex);
        
        await removeBooking(dateStr, bookingIndex);
        
        await sendLineMessage(userId, `【預約已取消】

您好 ${booking.user}，
您的預約已被取消

📅 預約日期：${dateStr}
⏰ 預約時間：${booking.time}

取消原因：${reason}

如需重新預約請聯繫我們
造成不便敬請見諒

---
LOST.IN.GALLERY_`);
        
        alert('✅ 已取消預約');
        await window.fetchAdminCalendarData();
        window.selectAdminDate(adminSelectedIndex);
    } catch (e) {
        alert('❌ 操作失敗：' + e.message);
    } finally {
        window.showLoading(false);
    }
};

// ===== 輔助函數 =====

// 更新預約狀態
async function updateBookingStatus(dateStr, bookingIndex, newStatus) {
    const parts = dateStr.split('-');
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    const day = parseInt(parts[2]);
    
    const dateId = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    const { data, error: fetchErr } = await supabaseClient
        .from('calendar_slots')
        .select('*')
        .eq('date_id', dateId)
        .single();
    
    if (fetchErr) throw fetchErr;
    
    let bookedSlots = data.booked_slots || [];
    if (bookedSlots[bookingIndex]) {
        bookedSlots[bookingIndex].status = newStatus;
    }
    
    const { error: updateErr } = await supabaseClient
        .from('calendar_slots')
        .update({ booked_slots: bookedSlots })
        .eq('date_id', dateId);
    
    if (updateErr) throw updateErr;
}

// 刪除預約
async function removeBooking(dateStr, bookingIndex) {
    const parts = dateStr.split('-');
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    const day = parseInt(parts[2]);
    
    const dateId = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    const { data, error: fetchErr } = await supabaseClient
        .from('calendar_slots')
        .select('*')
        .eq('date_id', dateId)
        .single();
    
    if (fetchErr) throw fetchErr;
    
    let bookedSlots = data.booked_slots || [];
    bookedSlots.splice(bookingIndex, 1);
    
    const { error: updateErr } = await supabaseClient
        .from('calendar_slots')
        .update({ booked_slots: bookedSlots })
        .eq('date_id', dateId);
    
    if (updateErr) throw updateErr;
}

// 取得預約資料
function getBookingByDateAndIndex(dateStr, bookingIndex) {
    const parts = dateStr.split('-');
    const month = parseInt(parts[1]);
    const day = parseInt(parts[2]);
    
    const dayData = calendarData.find(d => d.date === day);
    if (dayData && dayData.bookedSlots && dayData.bookedSlots[bookingIndex]) {
        return dayData.bookedSlots[bookingIndex];
    }
    return null;
}

// 發送 LINE 訊息
async function sendLineMessage(userId, message) {
    // 改用 Vercel API
    const response = await fetch('/api/send-line-message', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            userId: userId,
            message: message
        })
    });
    
    if (!response.ok) {
        const error = await response.json();
        console.error('發送訊息失敗:', error);
        throw new Error('發送訊息失敗');
    }
    
    return await response.json();
}
