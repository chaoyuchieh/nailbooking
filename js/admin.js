// admin.js - 管理後台邏輯 (完整修正版)

console.log('🚀 admin.js 開始載入...');

if (typeof CONFIG === 'undefined') console.error('❌ CONFIG 未定義，請確認 config.js 已載入');
if (typeof supabaseClient === 'undefined') console.warn('⚠️ supabaseClient 未定義，將使用離線模式');

// === 管理後台專用變數 ===
let adminYear = new Date().getFullYear();
let adminMonth = new Date().getMonth();
let adminSelectedIndex = null;

// === 時間選項生成器 ===
function timeOptions(selected = '') {
    let opts = '<option value="">選擇時間</option>';
    for (let h = 10; h <= 18; h++)
        for (let m of [0, 15, 30, 45]) {
            const v = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
            opts += `<option value="${v}" ${selected === v ? 'selected' : ''}>${v}</option>`;
        }
    return opts;
}

function dayTimeOptions(dateStr, selected = '') {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dow = new Date(y, m - 1, d).getDay();
    const isWeekend = dow === 0 || dow === 6;
    const slots = isWeekend
        ? ['11:00', '13:30', '16:00', '18:30']
        : ['12:00', '15:00', '18:00'];
    let opts = '<option value="">選擇時間</option>';
    slots.forEach(v => {
        opts += `<option value="${v}" ${selected === v ? 'selected' : ''}>${v}</option>`;
    });
    return opts;
}

// === 改時間專用選單（10:00～20:30，每30分鐘）===
function rescheduleTimeOptions(selected = '') {
    let opts = '<option value="">選擇新時間</option>';
    for (let h = 10; h <= 20; h++) {
        for (let m of [0, 30]) {
            if (h === 20 && m === 30) {
                const v = '20:30';
                opts += `<option value="${v}" ${selected === v ? 'selected' : ''}>${v}</option>`;
                break;
            }
            const v = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
            opts += `<option value="${v}" ${selected === v ? 'selected' : ''}>${v}</option>`;
        }
    }
    return opts;
}

// === 登入相關 ===
window.doAdminLogin = function() {
    const adminId = document.getElementById('admin-id')?.value?.trim();
    const adminPwd = document.getElementById('admin-pwd')?.value?.trim();
    if (!adminId || !adminPwd) { alert('請輸入帳號和密碼'); return; }
    if (adminId === '4555yuyu@gmail.com' && adminPwd === 'Ly6r4sNR') {
        sessionStorage.removeItem('manualLogout');
        document.getElementById('login-overlay').classList.add('hidden');
        const adminPanel = document.getElementById('admin-panel');
        adminPanel.classList.remove('hidden');
        adminPanel.style.display = 'flex';
        window.initAdminYearSelector();
        window.fetchAdminCalendarData();
    } else {
        alert('❌ 帳號或密碼錯誤');
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
    if (adminMonth > 11) { adminMonth = 0; adminYear++; }
    else if (adminMonth < 0) { adminMonth = 11; adminYear--; }
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
        window.initMockData(true, adminYear, adminMonth);
        if (supabaseClient) {
            await window.loadClosedDates();
            const { data, error } = await supabaseClient.from('calendar_slots').select('*');
            if (error) {
                console.warn('⚠️ Supabase 查詢錯誤:', error);
            } else if (data && data.length > 0) {
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

// === 渲染行事曆 ===
window.renderAdminCalendar = function() {
    const grid = document.getElementById('admin-calendar-grid');
    if (!grid) { console.error('❌ 找不到 admin-calendar-grid'); return; }
    if (!calendarData || calendarData.length === 0) {
        grid.innerHTML = '<div class="col-span-7 p-4 text-center text-gray-500">無法載入資料</div>';
        return;
    }
    grid.innerHTML = '';
    const firstDay = new Date(adminYear, adminMonth, 1).getDay();
    for (let i = 0; i < firstDay; i++) {
        const empty = document.createElement('div');
        empty.className = 'admin-day';
        grid.appendChild(empty);
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    calendarData.forEach((item, index) => {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'admin-day';
        const itemDate = new Date(adminYear, adminMonth, item.date);
        itemDate.setHours(0, 0, 0, 0);
        const isPast = itemDate < today;
        const dateStr = `${adminYear}-${String(adminMonth + 1).padStart(2, '0')}-${String(item.date).padStart(2, '0')}`;
        const isClosed = item.status === 'booked' || (closedDates && closedDates.includes(dateStr));
        const realBookings = (item.bookedSlots || []).filter(b => b.status !== 'blocked');
        const blockedBookings = (item.bookedSlots || []).filter(b => b.status === 'blocked');
        const hasBooking = realBookings.length > 0;
        const hasBlocked = blockedBookings.length > 0;

        let html = `<div class="date-number">${item.date}</div>`;

        if (isClosed) {
            dayDiv.classList.add('status-off');
            html += `<div class="holiday-label">🚫 公休</div>`;
        } else if (hasBooking || hasBlocked) {
            const sorted = [...realBookings].sort((a, b) => {
                const tA = typeof a === 'string' ? a : a.time;
                const tB = typeof b === 'string' ? b : b.time;
                return tA.localeCompare(tB);
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
                let displayText;
                if (user.length <= 3) displayText = `${time} ${user}`;
                else if (user.length <= 5) displayText = `${time} ${user.substring(0, 3)}`;
                else displayText = `${time} ${user.substring(0, 2)}`;
                html += `<div class="booking-tag ${statusClass}" title="👤 ${user}\n⏰ ${time}\n📊 ${status}">${displayText}</div>`;
            });

            [...blockedBookings]
                .sort((a, b) => a.time.localeCompare(b.time))
                .forEach(b => {
                    html += `<div class="booking-tag" style="background:#9ca3af;" title="🚫 封鎖時段：${b.time}">🚫 ${b.time}</div>`;
                });

            html += `</div>`;
        }

        if (isPast) dayDiv.classList.add('status-past');
        if (index === adminSelectedIndex) dayDiv.classList.add('selected');
        dayDiv.innerHTML = html;
        dayDiv.onclick = () => { window.selectAdminDate(index); window.renderAdminCalendar(); };
        grid.appendChild(dayDiv);
    });
    console.log('✅ 行事曆渲染完成');
};

// === 選擇日期 ===
window.selectAdminDate = function(index) {
    adminSelectedIndex = index;
    const item = calendarData[index];
    const dateStr = `${adminYear}-${String(adminMonth + 1).padStart(2, '0')}-${String(item.date).padStart(2, '0')}`;

    document.getElementById('admin-edit-area').classList.remove('hidden');
    document.getElementById('admin-edit-date-title').innerText = `${adminMonth + 1} / ${item.date}`;

    const closeBtn = document.getElementById('admin-close-date-btn');
    const isClosed = closedDates.includes(dateStr) || item.status === 'booked';
    if (isClosed) {
        closeBtn.textContent = '✓ 已關閉此日期（點擊重新開放）';
        closeBtn.className = 'w-full px-3 py-2 rounded-lg text-xs font-bold transition-colors border-2 border-red-300 bg-red-50 text-red-600';
    } else {
        closeBtn.textContent = '手動關閉此日期';
        closeBtn.className = 'w-full px-3 py-2 rounded-lg text-xs font-bold transition-colors border-2 border-gray-300 text-gray-600 hover:bg-gray-50';
    }

    const listContainer = document.getElementById('admin-schedule-list');
    listContainer.innerHTML = '';

    if (isClosed) {
        listContainer.innerHTML = `<div class="text-center p-4 bg-gray-100 rounded text-gray-500">🚫 本日已設為公休</div>`;
    } else {
        const realBookings = (item.bookedSlots || []).filter(b => b.status !== 'blocked');

        if (realBookings.length > 0) {
            const sorted = [...realBookings].sort((a, b) => {
                const ta = typeof a === 'string' ? a : a.time;
                const tb = typeof b === 'string' ? b : b.time;
                return ta.localeCompare(tb);
            });

            sorted.forEach((booking) => {
                const bookingIndex = (item.bookedSlots || []).indexOf(booking);
                const time = typeof booking === 'string' ? booking : booking.time;
                const userName = typeof booking === 'object' ? booking.user : 'Admin';
                const userId = typeof booking === 'object' ? booking.userId : '';
                const status = typeof booking === 'object' ? booking.status : 'confirmed';
                const details = typeof booking === 'object' ? booking.bookingDetails : null;
                const totalPrice = typeof booking === 'object' ? booking.totalPrice : 0;

                let statusBg = 'bg-gray-100', statusText = 'text-gray-700', statusLabel = '已確認', statusIcon = '✓';
                if (status === 'pending') { statusBg = 'bg-orange-50'; statusText = 'text-orange-700'; statusLabel = '待審核'; statusIcon = '⏳'; }
                else if (status === 'pending_payment') { statusBg = 'bg-blue-50'; statusText = 'text-blue-700'; statusLabel = '等待付款'; statusIcon = '💰'; }
                else if (status === 'confirmed') { statusBg = 'bg-green-50'; statusText = 'text-green-700'; statusLabel = '已確認'; statusIcon = '✓'; }
                else if (status === 'rejected') { statusBg = 'bg-red-50'; statusText = 'text-red-700'; statusLabel = '已拒絕'; statusIcon = '✗'; }

                let detailsHtml = '';
                if (details) {
                    if (details.design?.name) {
                        detailsHtml += `<div class="text-xs text-gray-600">🎨 ${details.design.name}`;
                        if (details.design.keywords?.length > 0) detailsHtml += ` (${details.design.keywords.join(', ')})`;
                        detailsHtml += `</div>`;
                    }
                    if (details.removal?.name) detailsHtml += `<div class="text-xs text-gray-600">💅 ${details.removal.name}</div>`;
                    if (details.extras?.length > 0) {
                        const extrasStr = details.extras.map(e => e.count ? `${e.name} x${e.count}` : e.name).join(', ');
                        detailsHtml += `<div class="text-xs text-gray-600">✨ ${extrasStr}</div>`;
                    }
                }

                // 改時間 UI（僅 confirmed 狀態顯示）
                const rescheduleHtml = status === 'confirmed' ? `
                    <div id="reschedule-panel-${bookingIndex}" class="hidden mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p class="text-xs text-yellow-700 font-bold mb-2">✏️ 選擇新時間</p>
                        <select id="reschedule-time-${bookingIndex}"
                                class="w-full border border-yellow-300 rounded px-2 py-1 text-xs outline-none focus:border-yellow-500 bg-white mb-2">
                            ${rescheduleTimeOptions(time)}
                        </select>
                        <div class="grid grid-cols-2 gap-2">
                            <button onclick="confirmReschedule('${dateStr}', ${bookingIndex}, '${userId}', '${userName}', ${totalPrice})"
                                    class="bg-yellow-500 text-white px-3 py-2 rounded text-xs font-bold hover:bg-yellow-600 transition">
                                ✓ 確認修改
                            </button>
                            <button onclick="document.getElementById('reschedule-panel-${bookingIndex}').classList.add('hidden')"
                                    class="bg-gray-100 text-gray-600 px-3 py-2 rounded text-xs font-bold hover:bg-gray-200 transition">
                                取消
                            </button>
                        </div>
                    </div>
                ` : '';

                const row = document.createElement('div');
                row.className = 'bg-white border-2 rounded-lg overflow-hidden mb-3 shadow-sm';
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
                                        class="bg-blue-600 text-white px-3 py-2 rounded text-xs font-bold hover:bg-blue-700 transition">💰 需要訂金</button>
                                <button onclick="approveBookingDirectly('${dateStr}', ${bookingIndex}, '${userId}')"
                                        class="bg-green-600 text-white px-3 py-2 rounded text-xs font-bold hover:bg-green-700 transition">✓ 直接確認</button>
                            </div>
                            <button onclick="rejectBooking('${dateStr}', ${bookingIndex}, '${userId}')"
                                    class="w-full bg-red-100 text-red-600 px-3 py-2 rounded text-xs font-bold hover:bg-red-200 transition">✗ 拒絕預約</button>
                        ` : status === 'pending_payment' ? `
                            <button onclick="confirmPayment('${dateStr}', ${bookingIndex}, '${userId}')"
                                    class="w-full bg-green-600 text-white px-3 py-2 rounded text-xs font-bold hover:bg-green-700 transition">✓ 確認已付款</button>
                            <button onclick="cancelBooking('${dateStr}', ${bookingIndex}, '${userId}')"
                                    class="w-full bg-red-100 text-red-600 px-3 py-2 rounded text-xs font-bold hover:bg-red-200 transition mt-2">✗ 取消預約</button>
                        ` : status === 'confirmed' ? `
                            <button onclick="toggleReschedulePanel(${bookingIndex})"
                                    class="w-full bg-yellow-100 text-yellow-700 px-3 py-2 rounded text-xs font-bold hover:bg-yellow-200 transition mb-2">
                                ✏️ 修改時間
                            </button>
                            ${rescheduleHtml}
                            <button onclick="toggleNextBookingPanel(${bookingIndex})"
                                    class="w-full bg-blue-100 text-blue-700 px-3 py-2 rounded text-xs font-bold hover:bg-blue-200 transition mb-2">
                                📅 預約下次
                            </button>
                            <div id="next-booking-panel-${bookingIndex}" class="hidden mt-1 mb-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <p class="text-xs text-blue-700 font-bold mb-2">📅 新增下次預約</p>
                                <div class="flex flex-col gap-2 mb-2">
                                    <input id="next-booking-name-${bookingIndex}" type="text" value="${userName}"
                                           class="border border-blue-200 rounded px-2 py-1 text-xs outline-none focus:border-blue-400 bg-white"
                                           placeholder="顧客姓名">
                                    <input id="next-booking-date-${bookingIndex}" type="date"
                                           class="border border-blue-200 rounded px-2 py-1 text-xs outline-none focus:border-blue-400 bg-white">
                                    <select id="next-booking-time-${bookingIndex}"
                                            class="border border-blue-200 rounded px-2 py-1 text-xs outline-none focus:border-blue-400 bg-white">
                                        ${rescheduleTimeOptions()}
                                    </select>
                                </div>
                                <div class="grid grid-cols-2 gap-2">
                                    <button onclick="confirmNextBooking(${bookingIndex}, document.getElementById('next-booking-name-${bookingIndex}').value, '${userId}')"
                                            class="bg-blue-600 text-white px-3 py-2 rounded text-xs font-bold hover:bg-blue-700 transition">
                                        ✓ 確認新增
                                    </button>
                                    <button onclick="toggleNextBookingPanel(${bookingIndex})"
                                            class="bg-gray-100 text-gray-600 px-3 py-2 rounded text-xs font-bold hover:bg-gray-200 transition">
                                        取消
                                    </button>
                                </div>
                            </div>
                            <button onclick="cancelBooking('${dateStr}', ${bookingIndex}, '${userId}')"
                                    class="w-full bg-red-100 text-red-600 px-3 py-2 rounded text-xs font-bold hover:bg-red-200 transition mt-2">取消此預約</button>
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

        // ===== 封鎖時段區 =====
        const blockSection = document.createElement('div');
        blockSection.className = 'mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg';
        const blockedTimes = (item.bookedSlots || []).filter(b => b.status === 'blocked').map(b => b.time);
        const dow = new Date(adminYear, adminMonth, item.date).getDay();
        const isWeekend = dow === 0 || dow === 6;
        const allSlots = isWeekend
            ? ['11:00', '13:30', '16:00', '18:30']
            : ['12:00', '15:00', '18:00'];
        blockSection.innerHTML = `
            <p class="text-xs text-gray-500 mb-2 font-bold">🚫 封鎖特定時段</p>
            <div class="grid grid-cols-3 gap-1" id="block-slots-grid"></div>
        `;
        listContainer.appendChild(blockSection);

        const blockGrid = blockSection.querySelector('#block-slots-grid');
        allSlots.forEach(timeStr => {
            const isBlocked = blockedTimes.includes(timeStr);
            const hasRealBooking = (item.bookedSlots || []).some(b => b.time === timeStr && b.status !== 'blocked');
            const btn = document.createElement('button');
            btn.className = `py-1 px-2 rounded text-xs font-bold transition ${
                hasRealBooking ? 'bg-gray-200 text-gray-400 cursor-not-allowed' :
                isBlocked ? 'bg-red-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-red-300'
            }`;
            btn.innerText = timeStr;
            btn.disabled = hasRealBooking;
            btn.title = hasRealBooking ? '此時段已有預約' : isBlocked ? '點擊解除封鎖' : '點擊封鎖';
            if (!hasRealBooking) btn.onclick = () => toggleBlockedSlot(dateStr, timeStr);
            blockGrid.appendChild(btn);
        });

        // ===== 手動新增預約 =====
        const addForm = document.createElement('div');
        addForm.className = 'mt-3 p-3 bg-gray-50 border border-dashed border-gray-300 rounded-lg';
        addForm.innerHTML = `
            <p class="text-xs text-gray-500 mb-2 font-bold">＋ 手動新增預約</p>
            <div class="flex flex-col gap-2 mb-2">
                <input id="manual-date" type="date" value="${dateStr}"
                       onchange="document.getElementById('manual-time').innerHTML = dayTimeOptions(this.value)"
                       class="border border-gray-200 rounded px-2 py-1 text-xs outline-none focus:border-gray-400">
                <div class="flex gap-2">
                    <input id="manual-name" type="text" placeholder="顧客姓名" value="${document.getElementById('manual-name')?.value || ''}"
                           class="flex-1 border border-gray-200 rounded px-2 py-1 text-xs outline-none focus:border-gray-400">
                    <select id="manual-time" class="border border-gray-200 rounded px-2 py-1 text-xs outline-none focus:border-gray-400">
                        ${dayTimeOptions(dateStr, document.getElementById('manual-time')?.value)}
                    </select>
                </div>
            </div>
            <button onclick="saveManualBooking()"
                    class="w-full bg-gray-800 text-white py-2 rounded text-xs font-bold hover:bg-gray-700 transition">
                新增預約
            </button>
        `;
        listContainer.appendChild(addForm);
    }
};

// === 預約下次面板開關 ===
window.toggleNextBookingPanel = function(bookingIndex) {
    const panel = document.getElementById(`next-booking-panel-${bookingIndex}`);
    if (panel) panel.classList.toggle('hidden');
};

// === 確認預約下次 ===
window.confirmNextBooking = async function(bookingIndex, userName, userId) {
    const dateStr = document.getElementById(`next-booking-date-${bookingIndex}`)?.value;
    const newTime = document.getElementById(`next-booking-time-${bookingIndex}`)?.value;
    if (!dateStr) { alert('請選擇日期'); return; }
    if (!newTime) { alert('請選擇時間'); return; }

    // === 衝突檢查（從 Supabase 取目標日期最新資料）===
    const { data, error: fetchErr } = await supabaseClient
        .from('calendar_slots').select('*').eq('date_id', dateStr).maybeSingle();
    if (fetchErr) { alert('❌ 查詢失敗：' + fetchErr.message); return; }

    const existingSlots = data?.booked_slots || [];
    const SERVICE_DURATION = CONFIG.SERVICE_DURATION_MINUTES;
    const newTimeMinutes = window.timeToMinutes(newTime);
    const newTimeEnd = newTimeMinutes + SERVICE_DURATION;

    for (const slot of existingSlots) {
        const slotTime = typeof slot === 'string' ? slot : slot.time;
        const slotStatus = typeof slot === 'object' ? slot.status : 'confirmed';
        if (slotStatus === 'blocked') {
            if (slotTime === newTime) { alert(`❌ ${newTime} 已被封鎖，請選擇其他時間`); return; }
        } else {
            const slotStart = window.timeToMinutes(slotTime);
            const slotEnd = slotStart + SERVICE_DURATION;
            if (window.checkTimeOverlap(newTimeMinutes, newTimeEnd, slotStart, slotEnd)) {
                alert(`❌ ${newTime} 與 ${slotTime} 的預約時段衝突，請選擇其他時間`); return;
            }
        }
    }

    // === 詢問是否發通知 ===
    const sendNotify = confirm(`預約下次確認：\n👤 ${userName}\n📅 ${dateStr}\n⏰ ${newTime}\n\n點「確定」同時發送 LINE 通知給顧客\n點「取消」只新增預約不發通知`);

    window.showLoading(true);
    try {
        let bookedSlots = [...existingSlots];
        bookedSlots.push({
            time: newTime,
            user: userName,
            userId: userId || '',
            status: 'confirmed',
            bookingDetails: null,
            totalPrice: 0,
            createdAt: new Date().toISOString()
        });

        const { error: saveErr } = await supabaseClient
            .from('calendar_slots')
            .upsert({ date_id: dateStr, booked_slots: bookedSlots, status: 'available' });
        if (saveErr) throw saveErr;

        if (sendNotify && userId && userId.trim() !== '') {
            await sendLineMessage(userId,
`【下次預約已建立】📅

您好 ${userName}，
管理員已為您建立下次預約！

📅 預約日期：${dateStr}
⏰ 預約時間：${newTime}

期待您的到來！
如有疑問請聯繫我們`
            );
        }

        alert(`✅ 已新增 ${dateStr} ${newTime} ${userName} 的預約${sendNotify ? '，並發送通知' : ''}`);
        await window.fetchAdminCalendarData();
        window.selectAdminDate(adminSelectedIndex);
    } catch (e) {
        alert('❌ 新增失敗：' + e.message);
    } finally {
        window.showLoading(false);
    }
};

// === 改時間面板開關 ===
window.toggleReschedulePanel = function(bookingIndex) {
    const panel = document.getElementById(`reschedule-panel-${bookingIndex}`);
    if (panel) panel.classList.toggle('hidden');
};

// === 確認改時間 ===
window.confirmReschedule = async function(dateStr, bookingIndex, userId, userName, totalPrice) {
    const newTime = document.getElementById(`reschedule-time-${bookingIndex}`)?.value;
    if (!newTime) { alert('請選擇新時間'); return; }

    // 取得目前此日期的所有 slots
    const parts = dateStr.split('-');
    const day = parseInt(parts[2]);
    const dayIndex = day - 1;
    const bookedSlots = calendarData[dayIndex]?.bookedSlots || [];
    const currentBooking = bookedSlots[bookingIndex];
    const currentTime = currentBooking?.time;

    if (newTime === currentTime) { alert('新時間與目前時間相同，無需修改'); return; }

    // === 衝突檢查 ===
    const SERVICE_DURATION = CONFIG.SERVICE_DURATION_MINUTES; // 150分鐘
    const newTimeMinutes = window.timeToMinutes(newTime);
    const newTimeEnd = newTimeMinutes + SERVICE_DURATION;

    for (let i = 0; i < bookedSlots.length; i++) {
        if (i === bookingIndex) continue; // 跳過自己
        const slot = bookedSlots[i];
        const slotTime = typeof slot === 'string' ? slot : slot.time;
        const slotStatus = typeof slot === 'object' ? slot.status : 'confirmed';

        if (slotStatus === 'blocked') {
            // 封鎖格：完全相同時間才衝突
            if (slotTime === newTime) {
                alert(`❌ ${newTime} 已被封鎖，請選擇其他時間`);
                return;
            }
        } else {
            // 真實預約：2.5小時 overlap 檢查
            const slotStart = window.timeToMinutes(slotTime);
            const slotEnd = slotStart + SERVICE_DURATION;
            if (window.checkTimeOverlap(newTimeMinutes, newTimeEnd, slotStart, slotEnd)) {
                alert(`❌ ${newTime} 與 ${slotTime} 的預約時段衝突，請選擇其他時間`);
                return;
            }
        }
    }

    if (!confirm(`確定將 ${userName} 的預約時間從 ${currentTime} 改為 ${newTime}？\n\n修改後將自動發送 LINE 通知給顧客。`)) return;

    window.showLoading(true);
    try {
        // 更新 Supabase
        const { data, error: fetchErr } = await supabaseClient
            .from('calendar_slots').select('*').eq('date_id', dateStr).maybeSingle();
        if (fetchErr) throw fetchErr;
        if (!data) throw new Error('找不到該日期的資料');

        let slots = data.booked_slots || [];
        if (!slots[bookingIndex]) throw new Error('找不到該預約');
        slots[bookingIndex].time = newTime;

        const { error: updateErr } = await supabaseClient
            .from('calendar_slots').update({ booked_slots: slots }).eq('date_id', dateStr);
        if (updateErr) throw updateErr;

        // 發 LINE 通知（有 userId 才發）
        if (userId && userId.trim() !== '') {
            await sendLineMessage(userId,
`【預約時間已更新】✏️

您好 ${userName}，
您的預約時間已由管理員調整：

📅 預約日期：${dateStr}
⏰ 新時間：${newTime}
💰 預估金額：$${totalPrice}

如有疑問請聯繫我們`
            );
        }

        alert(`✅ 已將預約時間改為 ${newTime}`);
        await window.fetchAdminCalendarData();
        window.selectAdminDate(adminSelectedIndex);
    } catch (e) {
        alert('❌ 修改失敗：' + e.message);
    } finally {
        window.showLoading(false);
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
    if (idx > -1) { closedDates.splice(idx, 1); console.log('✅ 重新開放:', dateStr); }
    else { closedDates.push(dateStr); console.log('🚫 關閉:', dateStr); }
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
            const active = item.bookedSlots.filter(b => b.status !== 'rejected' && b.status !== 'blocked');
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
        if (toggleText) toggleText.textContent = detail.classList.contains('hidden') ? '詳細 ▼' : '收起 ▲';
    }
};

// === 儲存設定 ===
window.saveAdminSettings = async function() {
    if (!supabaseClient) { alert('❌ 離線模式無法儲存'); return; }
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
    if (!confirm('確定直接確認此預約嗎？')) return;
    window.showLoading(true);
    try {
        await updateBookingStatus(dateStr, bookingIndex, 'confirmed');
        const booking = getBookingByDateAndIndex(dateStr, bookingIndex);
        await sendLineMessage(userId, `【預約確認成功】✅\n\n您好 ${booking.user}，\n您的預約已確認完成！\n\n📅 預約日期：${dateStr}\n⏰ 預約時間：${booking.time}\n💰 預估金額：$${booking.totalPrice}\n\n期待您的到來！\n工作室地址：\n台北市忠孝東路四段97號2樓17b室\n（頂好名店城2樓）\n如果迷路跟我說喔！`);
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
        if (userId && userId.trim() !== '') {
            await sendLineMessage(userId, `【預約未通過】\n\n您好 ${booking.user}，\n很抱歉，您的預約無法受理\n\n📅 預約日期：${dateStr}\n⏰ 預約時間：${booking.time}\n\n如有疑問請聯繫我們`);
        }
        alert('✅ 已拒絕預約');
        await window.fetchAdminCalendarData();
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
        await window.fetchAdminCalendarData();
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
        if (userId && userId.trim() !== '') {
            await sendLineMessage(userId, `【預約已取消】\n\n您好 ${booking.user}，\n您的預約已被取消\n\n📅 預約日期：${dateStr}\n⏰ 預約時間：${booking.time}\n\n如需重新預約請聯繫我們`);
        }
        alert('✅ 已取消預約');
        await window.fetchAdminCalendarData();
        window.selectAdminDate(adminSelectedIndex);
    } catch (e) {
        alert('❌ 操作失敗：' + e.message);
    } finally {
        window.showLoading(false);
    }
};

// ===== 封鎖時段 =====

async function toggleBlockedSlot(dateStr, timeStr) {
    window.showLoading(true);
    try {
        const { data, error: fetchErr } = await supabaseClient
            .from('calendar_slots').select('*').eq('date_id', dateStr).maybeSingle();
        if (fetchErr) throw fetchErr;
        let bookedSlots = data?.booked_slots || [];
        const idx = bookedSlots.findIndex(b => b.time === timeStr && b.status === 'blocked');
        if (idx > -1) {
            bookedSlots.splice(idx, 1);
        } else {
            bookedSlots.push({ time: timeStr, user: '__blocked__', userId: '', status: 'blocked', createdAt: new Date().toISOString() });
        }
        const { error: saveErr } = await supabaseClient
            .from('calendar_slots')
            .upsert({ date_id: dateStr, booked_slots: bookedSlots, status: 'available' });
        if (saveErr) throw saveErr;
        await window.fetchAdminCalendarData();
        window.selectAdminDate(adminSelectedIndex);
    } catch(e) {
        alert('❌ 操作失敗：' + e.message);
    } finally {
        window.showLoading(false);
    }
}

// ===== 手動新增預約 =====

window.saveManualBooking = async function() {
    const dateStr = document.getElementById('manual-date')?.value;
    const name = document.getElementById('manual-name')?.value?.trim();
    const time = document.getElementById('manual-time')?.value;
    if (!dateStr) { alert('請選擇日期'); return; }
    if (!name) { alert('請填寫顧客姓名'); return; }
    if (!time) { alert('請選擇時間'); return; }
    window.showLoading(true);
    try {
        const { data, error: fetchErr } = await supabaseClient
            .from('calendar_slots').select('*').eq('date_id', dateStr).maybeSingle();
        if (fetchErr) throw fetchErr;
        let bookedSlots = data?.booked_slots || [];
        if (bookedSlots.some(b => b.time === time && b.status !== 'blocked')) {
            alert('此時段已有預約'); return;
        }
        bookedSlots.push({ time, user: name, userId: '', status: 'confirmed', bookingDetails: null, totalPrice: 0, createdAt: new Date().toISOString() });
        const { error: saveErr } = await supabaseClient
            .from('calendar_slots')
            .upsert({ date_id: dateStr, booked_slots: bookedSlots, status: 'available' });
        if (saveErr) throw saveErr;
        alert(`✅ 已新增 ${dateStr} ${time} ${name} 的預約`);
        await window.fetchAdminCalendarData();
        window.selectAdminDate(adminSelectedIndex);
    } catch(e) {
        alert('❌ 新增失敗：' + e.message);
    } finally {
        window.showLoading(false);
    }
};

// ===== 輔助函數 =====

async function updateBookingStatus(dateStr, bookingIndex, newStatus) {
    const { data, error: fetchErr } = await supabaseClient
        .from('calendar_slots').select('*').eq('date_id', dateStr).maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!data) throw new Error('找不到該日期的資料');
    let bookedSlots = data.booked_slots || [];
    if (bookedSlots[bookingIndex]) bookedSlots[bookingIndex].status = newStatus;
    const { error: updateErr } = await supabaseClient
        .from('calendar_slots').update({ booked_slots: bookedSlots }).eq('date_id', dateStr);
    if (updateErr) throw updateErr;
}

async function removeBooking(dateStr, bookingIndex) {
    const { data, error: fetchErr } = await supabaseClient
        .from('calendar_slots').select('*').eq('date_id', dateStr).maybeSingle();
    if (fetchErr) throw fetchErr;
    let bookedSlots = data.booked_slots || [];
    bookedSlots.splice(bookingIndex, 1);
    const { error: updateErr } = await supabaseClient
        .from('calendar_slots').update({ booked_slots: bookedSlots }).eq('date_id', dateStr);
    if (updateErr) throw updateErr;
    const parts = dateStr.split('-');
    const day = parseInt(parts[2]);
    const index = day - 1;
    if (calendarData[index]) calendarData[index].bookedSlots = bookedSlots;
}

function getBookingByDateAndIndex(dateStr, bookingIndex) {
    const parts = dateStr.split('-');
    const day = parseInt(parts[2]);
    const index = day - 1;
    return calendarData[index]?.bookedSlots?.[bookingIndex] || null;
}

async function sendLineMessage(userId, message) {
    const response = await fetch('/api/send-line-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, message })
    });
    if (!response.ok) throw new Error('發送訊息失敗');
    return await response.json();
}

console.log('✅ admin.js 載入完成');
