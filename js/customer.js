// ===== 預約提交相關（完整版）=====

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
        
        document.getElementById('friend-warning').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
        });
        
        const friendWarning = document.getElementById('friend-warning');
        friendWarning.classList.add('animate-pulse');
        setTimeout(() => {
            friendWarning.classList.remove('animate-pulse');
        }, 2000);
        
        return;
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
        const dateId = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(selectedDate.split('/')[1]).padStart(2, '0')}`;
        console.log('📅 查詢日期:', dateId);
        
        const { data, error: fetchErr } = await supabaseClient
            .from('calendar_slots')
            .select('*')
            .eq('date_id', dateId)
            .maybeSingle();
        
        if (fetchErr) {
            console.error('❌ 資料庫查詢錯誤:', fetchErr);
            throw fetchErr;
        }
        
        let booked = [];
        if (data) {
            booked = data.booked_slots || [];  
            console.log('📋 找到現有記錄，已有', booked.length, '筆預約');
        } else {
            console.log('📝 這是新的日期，將建立記錄');
        }
        
        if (booked.some(s => (typeof s === 'string' ? s : s.time) === selectedTime)) {
            throw new Error("該時段已被預約 😭");
        }
        
        let userName = userProfile.displayName;
        let userId = userProfile.userId;
        
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
        
        booked.push({
            time: selectedTime,
            user: userName,
            userId: userId,
            status: 'pending',
            bookingDetails: details,
            totalPrice: window.calculateTotal()
        });

        console.log('💾 準備儲存預約:', booked[booked.length - 1]);

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
        
        const successMsg = `【新預約申請】\n\n📋 預約資訊：\n\n👤 顧客：${userName}\n📅 日期：${selectedDate}\n⏰ 時間：${selectedTime}${detailMsg}\n💰 預估金額：$${window.calculateTotal()}\n\n⏳ 等待管理員審核中...\n審核通過後我們會立即通知您。\n\n---\nLOST.IN.GALLERY_`;

        // 1. 發通知給管理員（每次都會執行）
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

        // 2. 如果在 LINE App 內，也發一份給用戶自己看
        try {
            if (liffInitialized && liff.isInClient()) {
                await liff.sendMessages([{
                    type: 'text',
                    text: successMsg
                }]);
                console.log('✅ 用戶端訊息發送成功');
            }
        } catch (e) {
            console.warn("⚠️ 用戶端訊息發送失敗:", e);
        }

        // 3. 預約成功提示
        btn.innerHTML = '✅ 預約已提交';
        btn.classList.add('bg-green-600');
        btn.classList.remove('bg-gray-800');
        
        setTimeout(() => {
            alert("✅ 預約已提交！\n\n我們已收到您的預約申請，請稍候管理員審核。\n\n審核通知將透過 LINE 傳送給您。");
            
            // 重置表單
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
        
        if (error.message && error.message.includes('該時段已被預約')) {
            alert("❌ 該時段已被其他用戶預約\n\n請選擇其他時間");
            await window.fetchCalendarData();
            window.renderCalendar();
        } else {
            alert("❌ 預約失敗，請稍後重試\n\n錯誤：" + (error.message || '未知錯誤'));
        }
    }
};

// ===== 重置表單 =====

window.resetBookingForm = function() {
    // 重置價格狀態
    priceState = { design: 0, removal: 0, extras: 0 };
    bookingDetails = { 
        design: { name: '', price: 0, keywords: [] },
        removal: { name: '', price: 0 },
        extras: []
    };
    
    // 重置計數器
    extensionCount = 0;
    repairCount = 0;
    unlimitedJumpCount = 0;
    bigDiamondCount = 0;
    nailPolishRemovalCount = 0;
    
    // 重置日期時間
    selectedDate = null;
    selectedTime = null;
    currentTimeHour = 10;
    currentTimeMinute = 0;
    
    // 重置 UI
    document.querySelectorAll('button[data-group]').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll('.rule-box').forEach(box => {
        box.classList.add('hidden');
    });
    document.querySelectorAll('.calendar-day').forEach(day => {
        day.classList.remove('selected');
    });
    
    // 清除輸入框
    const k1 = document.getElementById('keyword1');
    const k2 = document.getElementById('keyword2');
    if (k1) k1.value = '';
    if (k2) k2.value = '';
    
    // 隱藏時間選擇器
    const timeContainer = document.getElementById('time-slots-container');
    if (timeContainer) timeContainer.classList.add('hidden');
    
    // 重置複選框
    const termCheck = document.getElementById('term-check');
    if (termCheck) termCheck.checked = false;
    
    // 更新 UI 顯示
    window.updateUI();
    window.validate();
};

// ===== 輔助函數 =====

window.showLoading = function(show) {
    const loadingEl = document.getElementById('loading');
    if (loadingEl) {
        if (show) {
            loadingEl.classList.remove('hidden');
        } else {
            loadingEl.classList.add('hidden');
        }
    }
};

window.formatTime = function(hour, minute) {
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};

window.timeToMinutes = function(timeStr) {
    const [hour, minute] = timeStr.split(':').map(Number);
    return hour * 60 + minute;
};

window.minutesToTime = function(minutes) {
    return {
        hour: Math.floor(minutes / 60),
        minute: minutes % 60
    };
};

window.checkTimeOverlap = function(start1, end1, start2, end2) {
    return start1 < end2 && start2 < end1;
};
