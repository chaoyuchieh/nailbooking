// admin.js - 管理後台邏輯 (最終修正版)

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

// === 登入相關 ===
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
        
        document.getElementById('login-overlay').classList.add('hidden');
        
        const adminPanel = document.getElementById('admin-panel');
        adminPanel.classList.remove('hidden');
        adminPanel.style.display = 'flex';
        
        window.initAdminYearSelector();
        window.fetchAdminCalendarData();
    } else {
        alert('❌ 帳號或密碼錯誤\n\n正確帳號: admin\n正確密碼: 1234');
    }
};

window.adminLogout = function() {
    sessionStorage.setItem('manualLogout', 'true');
    location.reload();
};

// === 年份/月份選擇器 ===
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

window.changeAdminMonthDirect = function() {
    adminYear = parseInt(document.getElementById('admin-year-selector').value);
    adminMonth = parseInt(document.getElementById('admin-month-selector').value);
    window.fetchAdminCalendarData();
};

// === 載入資料 ===
window.fetchAdminCalendarData = async function() {
    console.log(`📅 載入 ${adminYear}/${adminMonth + 1} 資料...`);
    window.showLoading(true);
    
    try {
        // 1. 先初始化空白月份結構
        window.initMockData(true, adminYear, adminMonth);
        console.log('✅ 月份結構初始化完成，共', calendarData.length, '天');
        
        // 2. 載入關閉日期
        if (supabaseClient) {
            await window.loadClosedDates();
        }
        
        // 3. 從 Supabase 載入預約資料
        if (supabaseClient) {
            const { data, error } = await supabaseClient
                .from('calendar_slots')
                .select('*');
                
            if (error) {
                console.warn('⚠️ Supabase 查詢錯誤:', error);
            } else if (data && data.length > 0) {
                console.log('📦 從資料庫載入', data.length, '筆記錄');
                
                // 合併資料到 calendarData
                data.forEach(row => {
                    const parts = row.date_id.split('-');
                    const year = parseInt(parts[0]);
                    const month = parseInt(parts[1]);
                    const day = parseInt(parts[2]);
                    
                    if (year === adminYear && month === adminMonth + 1) {
                        const index = day - 1;
                        if (calendarData[index]) {
                            calendarData[index].status = row.status || 'available';
                            calendarData[index].bookedSlots = row.booked_slots || [];
                        }
                    }
                });
                
                console.log('✅ 資料合併完成');
            }
        }
        
    } catch (err) {
        console.error('❌ 載入資料失敗:', err);
        alert('載入資料時發生錯誤: ' + err.message);
    } finally {
        window.showLoading(false);
        window.renderAdminCalendar();
        window.updateCurrentOpenRange();
        window.updateTodayBookingStats();
    }
};

// === ✅ 核心渲染函數 (最終修正版) ===
window.renderAdminCalendar = function() {
    console.log('🎨 開始渲染行事曆...');
    
    const grid = document.getElementById('admin-calendar-grid');
    if (!grid) {
        console.error('❌ 找不到 admin-calendar-grid');
        return;
    }
    
    if (!calendarData || calendarData.length === 0) {
        console.error('❌ calendarData 為空');
        grid.innerHTML = '<div class="col-span-7 p-4 text-center text-gray-500">無法載入資料</div>';
        return;
    }
    
    // 清空
    grid.innerHTML = '';
    
    // 月初空白格
    const firstDay = new Date(adminYear, adminMonth, 1).getDay();
    for (let i = 0; i < firstDay; i++) {
        const empty = document.createElement('div');
        empty.className = 'admin-day';
        grid.appendChild(empty);
    }
    
    // 今天
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // 渲染每一天
    calendarData.forEach((item, index) => {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'admin-day';
        
        // 判斷狀態
        const itemDate = new Date(adminYear, adminMonth, item.date);
        itemDate.setHours(0, 0, 0, 0);
        const isPast = itemDate < today;
        
        const dateStr = `${adminYear}-${String(adminMonth + 1).padStart(2, '0')}-${String(item.date).padStart(2, '0')}`;
        const isClosed = item.status === 'booked' || (closedDates && closedDates.includes(dateStr));
        const hasBooking = item.bookedSlots && item.bookedSlots.length > 0;
        
        // 構建 HTML
        let html = `<div class="date-number">${item.date}</div>`;
        
        if (isClosed) {
            dayDiv.classList.add('status-off');
            html += `<div class="holiday-label">🚫 公休</div>`;
        } else if (hasBooking) {
            // 排序預約
            const sorted = [...item.bookedSlots].sort((a, b) => {
                const timeA = typeof a === 'string' ? a : a.time;
                const timeB = typeof b === 'string' ? b : b.time;
                return timeA.localeCompare(timeB);
            });
            
            html += `<div class="booking-info">`;
            sorted.forEach(booking => {
                const time = typeof booking === 'string' ? booking : booking.time;
                const user = typeof booking === 'object' && booking.user ? booking.user : 'Admin';
                const status = typeof booking === 'object' && booking.status ? booking.status : 'confirmed';
                
                let statusClass = 'status-confirmed';
                if (status === 'pending') statusClass = 'status-pending';
                else if (status === 'pending_payment') statusClass = 'status-pending-payment';
                else if (status === 'rejected') statusClass = 'status-rejected';
                
                // ✅ 智慧顯示：短名字顯示全部，長名字顯示前3字
                let displayText;
                if (user.length <= 3) {
                    displayText = `${time} ${user}`;
                } else if (user.length <= 5) {
                    displayText = `${time} ${user.substring(0, 3)}`;
                } else {
                    displayText = `${time} ${user.substring(0, 2)}`;
                }
                
                html += `<div class="booking-tag ${statusClass}" title="👤 ${user}\n⏰ ${time}\n📊 ${status}">${displayText}</div>`;
            });
            html += `</div>`;
        }
        
        if (isPast) {
            dayDiv.classList.add('status-past');
        }
        
        if (index === adminSelectedIndex) {
            dayDiv.classList.add('selected');
        }
        
        dayDiv.innerHTML = html;
        
        // 點擊事件
        dayDiv.onclick = () => {
            window.selectAdminDate(index);
            window.renderAdminCalendar();
        };
        
        grid.appendChild(dayDiv);
    });
    
    console.log('✅ 行事曆渲染完成');
};

// === 選擇日期 ===
window.selectAdminDate = function(index) {
    console.log('📌 選擇日期:', index);
    adminSelectedIndex = index;
    
    const item = calendarData[index];
    const dateStr = `${adminYear}-${String(adminMonth + 1).padStart(2, '0')}-${String(item.date).padStart(2, '0')}`;
    
    // 顯示編輯區
    document.getElementById('admin-edit-area').classList.remove('hidden');
    document.getElementById('admin-edit-date-title').innerText = `${adminMonth + 1} / ${item.date}`;
    
    // 更新關閉按鈕
    const closeBtn = document.getElementById('admin-close-date-btn');
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
    
    if (isClosed) {
        listContainer.innerHTML = `<div class="text-center p-4 bg-gray-100 rounded text-gray-500">🚫 本日已設為公休</div>`;
    } else if (item.bookedSlots && item.bookedSlots.length > 0) {
        const sorted = [...item.bookedSlots].sort((a, b) => {
            const ta = typeof a === 'string' ? a : a.time;
            const tb = typeof b === 'string' ? b : b.time;
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
            
            let statusBg = 'bg-gray-100';
            let statusText = 'text-gray-700';
            let statusLabel = '已確認';
            let statusIcon = '✓';
            
            if (status === 'pending') {
                statusBg = 'bg-orange-50';
                statusText = 'text-orange-700';
                statusLabel = '待審核';
                statusIcon = '⏳';
            } else if (status === 'pending_payment') {
                statusBg = 'bg-blue-50';
                statusText = 'text-blue-700';
                statusLabel = '等待付款';
                statusIcon = '💰';
            } else if (status === 'confirmed') {
                statusBg = 'bg-green-50';
                statusText = 'text-green-700';
                statusLabel = '已確認';
                statusIcon = '✓';
            } else if (status === 'rejected') {
                statusBg = 'bg-red-50';
                statusText = 'text-red-700';
                statusLabel = '已拒絕';
                statusIcon = '✗';
            }
            
            let detailsHtml = '';
            if (details) {
                if (details.design?.name) {
                    detailsHtml += `<div class="text-xs text-gray-600">🎨 ${details.design.name}`;
                    if (details.design.keywords?.length > 0) {
                        detailsHtml += ` (${details.design.keywords.join(', ')})`;
                    }
                    detailsHtml += `</div>`;
                }
                if (details.removal?.name) {
                    detailsHtml += `<div class="text-xs text-gray-600">💅 ${details.removal.name}</div>`;
                }
                if (details.extras?.length > 0) {
                    const extrasStr = details.extras.map(e => e.count ? `${e.name} x${e.count}` : e.name).join(', ');
                    detailsHtml += `<div class="text-xs text-gray-600">✨ ${extrasStr}</div>`;
                }
            }
            
            row.innerHTML = `
                <div class="${statusBg} px-3 py-2 flex justify-between items-center">
                    <span class="${statusText} text-xs font-bold">${statusIcon} ${statusLabel}</span>
                    <span class="text-xs text-gray-500">${time}</span>
                </div>
                <div class="p-3">
                    <div class="font-bold text-sm mb-1">${userName}</div>
                    ${detailsHtml}
                    <div class="text-xs font-bold text-gray-800 mt-2">預估金額：$${totalPrice}</div>
                </div>
                <div class="p-3 bg-gray-50 border-t border-gray-200">
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
                        <div class="text-center text-xs text-gray-500 py-2">此預約已${statusLabel}</div>
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
    const dateStr = `${adminYear}-${String(adminMonth + 1).padStart(2, '0')}-${String(item.date).padStart(2, '0')}`;
    
    const idx = closedDates.indexOf(dateStr);
    if (idx > -1) {
        closedDates.splice(idx, 1);
        console.log('✅ 重新開放:', dateStr);
    } else {
        closedDates.push(dateStr);
        console.log('🚫 關閉:', dateStr);
    }
    
    window.selectAdminDate(adminSelectedIndex);
};

// === 統計相關 ===
window.updateCurrentOpenRange = function() {
    const el = document.getElementById('open-range-dates');
    if (!el) return;
    
    window.calculateBookingRange();
    
    if (bookingOpenRanges.ranges?.length > 0) {
        let html = '';
        bookingOpenRanges.ranges.forEach(r => {
            const start = `${r.start.getMonth() + 1}/${r.start.getDate()}`;
            const end = `${r.end.getMonth() + 1}/${r.end.getDate()}`;
            html += `<div>• ${start} ~ ${end}</div>`;
        });
        el.innerHTML = html;
    } else {
        el.innerHTML = '目前無開放預約';
    }
};

window.updateTodayBookingStats = function() {
    const el = document.getElementById('today-booking-stats');
    if (!el) return;
    
    let total = 0;
    calendarData.forEach(item => {
        if (item.bookedSlots) {
            const active = item.bookedSlots.filter(b => b.status !== 'rejected');
            total += active.length;
        }
    });
    
    el.innerHTML = `
        <div class="flex justify-between items-center py-1">
            <span class="text-gray-500 text-xs">本月預約總數</span>
            <span class="font-bold text-gray-800 text-lg">${total} <span class="text-xs font-normal text-gray-400">人</span></span>
        </div>
    `;
};

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
        alert('❌ 離線模式無法儲存');
        return;
    }
    
    if (!confirm('確定要儲存所有變更嗎？')) return;
    
    window.showLoading(true);
    try {
        await window.saveClosedDates();
        alert('✅ 儲存成功！');
    } catch (e) {
        alert('❌ 儲存失敗：' + e.message);
    } finally {
        window.showLoading(false);
    }
};

// ===== 審核功能 =====

window.approveBookingWithDeposit = async function(dateStr, bookingIndex, userId) {
    if (!confirm('確定此預約需要訂金嗎？')) return;
    
    window.showLoading(true);
    try {
        await updateBookingStatus(dateStr, bookingIndex, 'pending_payment');
        const booking = getBookingByDateAndIndex(dateStr, bookingIndex);
        await sendLineMessage(userId, `【需要支付訂金】\n\n您好 ${booking.user}，\n您的預約已審核通過！\n\n📅 預約日期：${dateStr}\n⏰ 預約時間：${booking.time}\n💰 預估金額：$${booking.totalPrice}\n\n💳 請支付訂金 $500\n匯款資訊：\n銀行代碼：807\n帳號：20201800363188\n戶名：趙于萱\n\n完成匯款後請回覆「已匯款」\n我們確認後會立即通知您`);
        
        alert('✅ 已發送付款資訊');
await window.fetchAdminCalendarData();
window.selectAdminDate(adminSelectedIndex);
    } catch (e) {
        alert('❌ 操作失敗：' + e.message);
    } finally {
        window.showLoading(false);
    }
};

window.approveBookingDirectly = async function(dateStr, bookingIndex, userId) {
     console.log('userId:', userId);
    if (!confirm('確定直接確認此預約嗎？')) return;
    
    window.showLoading(true);
    try {
        await updateBookingStatus(dateStr, bookingIndex, 'confirmed');
        const booking = getBookingByDateAndIndex(dateStr, bookingIndex);
        await sendLineMessage(userId, `【預約確認成功】✅\n\n您好 ${booking.user}，\n您的預約已確認完成！\n\n📅 預約日期：${dateStr}\n⏰ 預約時間：${booking.time}\n💰 預估金額：$${booking.totalPrice}\n\n期待您的到來！`);
        
        alert('✅ 預約已確認');
await window.fetchAdminCalendarData();
window.selectAdminDate(adminSelectedIndex);
    } catch (e) {
        alert('❌ 操作失敗：' + e.message);
    } finally {
        window.showLoading(false);
    }
};

window.rejectBooking = async function(dateStr, bookingIndex, userId) {
    if (!confirm('確定要拒絕此預約嗎？')) return;
    
    window.showLoading(true);
    try {
        const booking = getBookingByDateAndIndex(dateStr, bookingIndex);
        await removeBooking(dateStr, bookingIndex);
        await sendLineMessage(userId, `【預約未通過】\n\n您好 ${booking.user}，\n很抱歉，您的預約無法受理\n\n📅 預約日期：${dateStr}\n⏰ 預約時間：${booking.time}\n\n如有疑問請聯繫我們`);
        
        alert('✅ 已拒絕預約');
        window.renderAdminCalendar();
        window.selectAdminDate(adminSelectedIndex);
    } catch (e) {
        alert('❌ 操作失敗：' + e.message);
    } finally {
        window.showLoading(false);
    }
};

window.confirmPayment = async function(dateStr, bookingIndex, userId) {
    if (!confirm('確認顧客已完成付款嗎？')) return;
    
    window.showLoading(true);
    try {
        await updateBookingStatus(dateStr, bookingIndex, 'confirmed');
        const booking = getBookingByDateAndIndex(dateStr, bookingIndex);
        await sendLineMessage(userId, `【付款確認成功】✅\n\n您好 ${booking.user}，\n我們已確認收到您的訂金！\n\n📅 預約日期：${dateStr}\n⏰ 預約時間：${booking.time}\n💰 預估金額：$${booking.totalPrice}\n\n預約已完成確認`);
        
        alert('✅ 付款已確認');
await window.fetchAdminCalendarData();  // 改這行，從 DB 重新載入
window.selectAdminDate(adminSelectedIndex);
    } catch (e) {
        alert('❌ 操作失敗：' + e.message);
    } finally {
        window.showLoading(false);
    }
};

window.cancelBooking = async function(dateStr, bookingIndex, userId) {
    if (!confirm('確定要取消此預約嗎？')) return;
    
    window.showLoading(true);
    try {
        const booking = getBookingByDateAndIndex(dateStr, bookingIndex);
        await removeBooking(dateStr, bookingIndex);
        await sendLineMessage(userId, `【預約已取消】\n\n您好 ${booking.user}，\n您的預約已被取消\n\n📅 預約日期：${dateStr}\n⏰ 預約時間：${booking.time}\n\n如需重新預約請聯繫我們`);
        
        alert('✅ 已取消預約');
        window.renderAdminCalendar();
        window.selectAdminDate(adminSelectedIndex);
    } catch (e) {
        alert('❌ 操作失敗：' + e.message);
    } finally {
        window.showLoading(false);
    }
};

// ===== 輔助函數 =====

async function updateBookingStatus(dateStr, bookingIndex, newStatus) {
    const { data, error: fetchErr } = await supabaseClient
        .from('calendar_slots')
        .select('*')
        .eq('date_id', dateStr)
        .maybeSingle();
    
    if (fetchErr) throw fetchErr;
    if (!data) throw new Error('找不到該日期的資料');
    
    let bookedSlots = data.booked_slots || [];
    if (bookedSlots[bookingIndex]) {
        bookedSlots[bookingIndex].status = newStatus;
    }
    
    const { error: updateErr } = await supabaseClient
        .from('calendar_slots')
        .update({ booked_slots: bookedSlots })
        .eq('date_id', dateStr);
    
    if (updateErr) throw updateErr;
}
    
    // 更新本地資料
    const parts = dateStr.split('-');
    const day = parseInt(parts[2]);
    const index = day - 1;
    if (calendarData[index]) {
        calendarData[index].bookedSlots = bookedSlots;
    }


async function removeBooking(dateStr, bookingIndex) {
    const { data, error: fetchErr } = await supabaseClient
        .from('calendar_slots')
        .select('*')
        .eq('date_id', dateStr)
        .maybeSingle();
    
    if (fetchErr) throw fetchErr;
    
    let bookedSlots = data.booked_slots || [];
    bookedSlots.splice(bookingIndex, 1);
    
    const { error: updateErr } = await supabaseClient
        .from('calendar_slots')
        .update({ booked_slots: bookedSlots })
        .eq('date_id', dateStr);
    
    if (updateErr) throw updateErr;
    
    // 更新本地資料
    const parts = dateStr.split('-');
    const day = parseInt(parts[2]);
    const index = day - 1;
    if (calendarData[index]) {
        calendarData[index].bookedSlots = bookedSlots;
    }
}

function getBookingByDateAndIndex(dateStr, bookingIndex) {
    const parts = dateStr.split('-');
    const day = parseInt(parts[2]);
    const index = day - 1;
    
    if (calendarData[index]?.bookedSlots?.[bookingIndex]) {
        return calendarData[index].bookedSlots[bookingIndex];
    }
    return null;
}

async function sendLineMessage(userId, message) {
    const response = await fetch('/api/send-line-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, message })
    });
    
    if (!response.ok) {
        throw new Error('發送訊息失敗');
    }
    
    return await response.json();
}

console.log('✅ admin.js 載入完成');
