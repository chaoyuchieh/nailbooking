console.log('🚀 customer.js 開始載入...');

// ===== Toast 通知 =====
window.showToast = function(message, duration = 4000) {
    const existing = document.getElementById('custom-toast');
    if (existing) existing.remove();
    const existingOverlay = document.getElementById('custom-toast-overlay');
    if (existingOverlay) existingOverlay.remove();

    const toast = document.createElement('div');
    toast.id = 'custom-toast';
    toast.style.cssText = `
        position: fixed;
        top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        border-radius: 16px;
        padding: 24px 28px;
        max-width: 320px;
        width: 90%;
        box-shadow: 0 20px 60px rgba(0,0,0,0.2);
        z-index: 99999;
        text-align: center;
        font-size: 14px;
        color: #333;
        line-height: 1.6;
        border: 1px solid #e5e7eb;
    `;
    toast.innerHTML = message.replace(/\n/g, '<br>');

    const overlay = document.createElement('div');
    overlay.id = 'custom-toast-overlay';
    overlay.style.cssText = `
        position: fixed; inset: 0;
        background: rgba(0,0,0,0.3);
        z-index: 99998;
    `;

    const close = () => { toast.remove(); overlay.remove(); };
    overlay.onclick = close;
    setTimeout(close, duration);

    document.body.appendChild(overlay);
    document.body.appendChild(toast);
};

// ===== 客戶端全域變數 =====
// ... 以下維持原本內容不變
