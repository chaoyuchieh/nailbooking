// common.js - 共用工具函數

// ===== 全域變數 =====
const today = new Date();
let currentYear = today.getFullYear();
let currentMonth = today.getMonth();
let calendarData = [];
let closedDates = [];
let bookingOpenRanges = { start: null, end: null };

// ===== 工具函數 =====

window.showLoading = function(show) {
    const loadingEl = document.getElementById('global-loading');
    if (loadingEl) {
        loadingEl.style.display = show ? 'flex' : 'none';
    }
};

window.formatTime = function(hour, minute) {
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};

window.timeToMinutes = function(timeStr) {
    const [hour, minute] = timeStr.split(':').map(Number);
    return hour * 60 + minute;
};

window.minutesToTime = function(totalMinutes) {
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    return { hour, minute };
};

window.checkTimeOverlap = function(start1, end1, start2, end2) {
    return start1 < end2 && start2 < end1;
};

window.calculateBookingRange = function() {
    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    let openRanges = [];
    
    let lastMonth = currentMonth - 1;
    let lastYear = currentYear;
    if (lastMonth < 0) { lastMonth = 11; lastYear--; }
    
    // 上月15日中午12:00 → 開放本月1-15
    const lastMonth15th = new Date(lastYear, lastMonth, 15, 12, 0, 0);
    if (now >= lastMonth15th) {
        openRanges.push({
            start: new Date(currentYear, currentMonth, 1),
            end: new Date(currentYear, currentMonth, 15, 23, 59, 59)
        });
    }
    
    // 上月25日中午12:00 → 開放本月16-月底
    const lastMonth25th = new Date(lastYear, lastMonth, 25, 12, 0, 0);
    if (now >= lastMonth25th) {
        openRanges.push({
            start: new Date(currentYear, currentMonth, 16),
            end: new Date(currentYear, currentMonth + 1, 0, 23, 59, 59)
        });
    }
    
    // 本月15日中午12:00 → 開放下月1-15
    const thisMonth15th = new Date(currentYear, currentMonth, 15, 12, 0, 0);
    if (now >= thisMonth15th) {
        let nextMonth = currentMonth + 1;
        let nextYear = currentYear;
        if (nextMonth > 11) { nextMonth = 0; nextYear++; }
        openRanges.push({
            start: new Date(nextYear, nextMonth, 1),
            end: new Date(nextYear, nextMonth, 15, 23, 59, 59)
        });
    }
    
    // 本月25日中午12:00 → 開放下月16-月底
    const thisMonth25th = new Date(currentYear, currentMonth, 25, 12, 0, 0);
    if (now >= thisMonth25th) {
        let nextMonth = currentMonth + 1;
        let nextYear = currentYear;
        if (nextMonth > 11) { nextMonth = 0; nextYear++; }
        openRanges.push({
            start: new Date(nextYear, nextMonth, 16),
            end: new Date(nextYear, nextMonth + 1, 0, 23, 59, 59)
        });
    }
    
    if (openRanges.length > 0) {
        const allStarts = openRanges.map(r => r.start);
        const allEnds = openRanges.map(r => r.end);
        bookingOpenRanges = {
            start: new Date(Math.min(...allStarts)),
            end: new Date(Math.max(...allEnds)),
            ranges: openRanges
        };
    } else {
        bookingOpenRanges = { start: null, end: null, ranges: [] };
    }
    
    console.log('📅 可預約範圍:', bookingOpenRanges);
    return bookingOpenRanges;
};

window.loadClosedDates = async function() {
    if (!supabaseClient) return;
    try {
        const { data, error } = await supabaseClient
            .from('booking_settings')
            .select('setting_value')
            .eq('setting_key', 'closed_dates')
            .single();
        
        if (data && data.setting_value && data.setting_value.dates) {
            closedDates = data.setting_value.dates;
            console.log('📅 已載入關閉日期:', closedDates);
        }
    } catch(e) {
        console.log('⚠️ 無法載入關閉日期設定:', e.message);
    }
};

window.saveClosedDates = async function() {
    if (!supabaseClient) return;
    try {
        const { error } = await supabaseClient
            .from('booking_settings')
            .upsert(
                {
                    setting_key: 'closed_dates',
                    setting_value: { dates: closedDates }
                },
                { 
                    onConflict: 'setting_key'  // ← 加上這個！
                }
            );
        
        if (error) throw error;
        console.log('✅ 關閉日期已儲存');
    } catch(e) {
        console.error('❌ 儲存關閉日期失敗:', e.message);
    }
};
window.initMockData = function(onlyStructure = false, year = currentYear, month = currentMonth) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    
    calendarData = [];
    for (let i = 1; i <= daysInMonth; i++) {
        const itemDate = new Date(year, month, i);
        itemDate.setHours(0, 0, 0, 0);
        let isPast = itemDate < todayDate;
        let status = isPast ? 'past' : 'available';
        calendarData.push({ date: i, status: status, bookedSlots: [] });
    }
};

window.isDateBookable = function(year, month, day) {
    const checkDate = new Date(year, month, day);
    checkDate.setHours(0, 0, 0, 0);
    
    // 改成有補零的格式，跟 admin 一致
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    if (closedDates.includes(dateStr)) {
        return { bookable: false, reason: 'closed' };
    }
    
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    if (checkDate < todayDate) {
        return { bookable: false, reason: 'past' };
    }
    
    if (!bookingOpenRanges.start || !bookingOpenRanges.ranges) {
        window.calculateBookingRange();
    }
    
    if (bookingOpenRanges.ranges && bookingOpenRanges.ranges.length > 0) {
        const checkTime = checkDate.getTime();
        const isInRange = bookingOpenRanges.ranges.some(range => {
            return checkTime >= range.start.getTime() && checkTime <= range.end.getTime();
        });
        
        if (isInRange) {
            return { bookable: true, reason: 'available' };
        } else {
            return { bookable: false, reason: 'not-open' };
        }
    }
    
    return { bookable: false, reason: 'not-open' };
};

window.logout = function() {
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

console.log('✅ common.js loaded');
