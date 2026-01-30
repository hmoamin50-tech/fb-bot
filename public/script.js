// متغيرات التطبيق
let accounts = JSON.parse(localStorage.getItem('fb_accounts')) || [];
let selectedReact = 2;
let apiBaseUrl = window.location.origin;

// تحديث الواجهة عند التحميل
document.addEventListener('DOMContentLoaded', function() {
    updateAccountsList();
    updateStats();
    selectReact(2); // إعجاب كافتراضي
    
    // تحديث زر الإرسال
    document.getElementById('send-btn').innerHTML = 
        '<i class="fas fa-paper-plane"></i> إرسال ردود الفعل (' + accounts.length + ' حساب)';
});

// دالة تسجيل الدخول
async function login() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const loginBtn = document.getElementById('login-btn');
    const resultDiv = document.getElementById('login-result');
    
    if (!email || !password) {
        showResult('error', 'الرجاء إدخال البريد الإلكتروني وكلمة المرور', resultDiv);
        return;
    }
    
    // إظهار التحميل
    const originalText = loginBtn.innerHTML;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري تسجيل الدخول...';
    loginBtn.disabled = true;
    
    try {
        // إرسال طلب تسجيل الدخول
        const response = await fetch(apiBaseUrl + '/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // حفظ الحساب
            const account = {
                email: email,
                cookie: data.cookie,
                timestamp: new Date().toLocaleString()
            };
            
            accounts.push(account);
            localStorage.setItem('fb_accounts', JSON.stringify(accounts));
            
            // تحديث الواجهة
            updateAccountsList();
            updateStats();
            
            // مسح الحقول
            document.getElementById('email').value = '';
            document.getElementById('password').value = '';
            
            showResult('success', 
                '✓ تم تسجيل الدخول بنجاح! الكوكيز جاهزة للاستخدام', 
                resultDiv
            );
        } else {
            showResult('error', '❌ ' + (data.error || 'فشل تسجيل الدخول'), resultDiv);
        }
    } catch (error) {
        console.error('Login error:', error);
        showResult('error', '❌ خطأ في الاتصال بالخادم', resultDiv);
    } finally {
        // استعادة زر الدخول
        loginBtn.innerHTML = originalText;
        loginBtn.disabled = false;
    }
}

// دالة إرسال ردود الفعل
async function sendReactions() {
    const postId = document.getElementById('post-id').value.trim();
    const sendBtn = document.getElementById('send-btn');
    const resultsDiv = document.getElementById('results');
    
    if (accounts.length === 0) {
        showNotification('error', 'الرجاء إضافة حسابات أولاً');
        return;
    }
    
    if (!postId) {
        showNotification('error', 'الرجاء إدخال معرف المنشور');
        return;
    }
    
    // إظهار التحميل
    const originalText = sendBtn.innerHTML;
    sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';
    sendBtn.disabled = true;
    
    // إظهار النتائج
    resultsDiv.innerHTML = `
        <div class="status-box">
            <i class="fas fa-spinner fa-spin"></i>
            <p>جاري إرسال ردود الفعل من ${accounts.length} حساب...</p>
        </div>
    `;
    
    try {
        // تجميع الكوكيز
        const cookies = accounts.map(acc => acc.cookie);
        
        // إرسال طلب ردود الفعل
        const response = await fetch(apiBaseUrl + '/api/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                cookies: cookies,
                postId: postId,
                reactType: selectedReact
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // عرض النتائج
            let resultsHTML = '<h3>📊 نتائج الإرسال:</h3>';
            
            data.results.forEach((result, index) => {
                const isSuccess = result.includes('نجح');
                resultsHTML += `
                    <div class="result-item ${isSuccess ? 'success' : 'error'}">
                        <strong>الحساب ${index + 1}:</strong> ${result}
                    </div>
                `;
            });
            
            resultsDiv.innerHTML = resultsHTML;
            
            // تحريك النافذة للنتائج
            resultsDiv.scrollIntoView({ behavior: 'smooth' });
            
            showNotification('success', `تم إرسال ردود الفعل بنجاح من ${accounts.length} حساب`);
        } else {
            resultsDiv.innerHTML = `
                <div class="result-box error">
                    <strong>❌ خطأ:</strong> ${data.error}
                </div>
            `;
            showNotification('error', data.error);
        }
    } catch (error) {
        console.error('Send error:', error);
        resultsDiv.innerHTML = `
            <div class="result-box error">
                <strong>❌ خطأ في الاتصال:</strong> ${error.message}
            </div>
        `;
        showNotification('error', 'خطأ في الاتصال بالخادم');
    } finally {
        // استعادة زر الإرسال
        sendBtn.innerHTML = originalText;
        sendBtn.disabled = false;
    }
}

// دالة اختيار نوع رد الفعل
function selectReact(reactType) {
    selectedReact = reactType;
    
    // تحديث الأزرار النشطة
    document.querySelectorAll('.react-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // تحديد الزر المناسب
    let reactName = 'إعجاب';
    switch(reactType) {
        case 2: reactName = 'إعجاب'; break;
        case 3: reactName = 'حب'; break;
        case 4: reactName = 'رعاية'; break;
        case 5: reactName = 'ضحك'; break;
        case 6: reactName = 'تعجب'; break;
        case 7: reactName = 'حزن'; break;
        case 8: reactName = 'غضب'; break;
    }
    
    document.querySelector(`.react-btn[onclick="selectReact(${reactType})"]`).classList.add('active');
    document.getElementById('selected-react').textContent = reactName;
}

// دالة تحديث قائمة الحسابات
function updateAccountsList() {
    const accountsList = document.getElementById('accounts-list');
    
    if (accounts.length === 0) {
        accountsList.innerHTML = '<p class="empty-message">لا توجد حسابات مسجلة بعد</p>';
    } else {
        let html = '';
        accounts.forEach((account, index) => {
            html += `
                <div class="account-item">
                    <span class="account-email">${account.email}</span>
                    <span class="account-status">✓ نشط</span>
                </div>
            `;
        });
        accountsList.innerHTML = html;
    }
    
    // تحديث زر الإرسال
    document.getElementById('send-btn').innerHTML = 
        `<i class="fas fa-paper-plane"></i> إرسال ردود الفعل (${accounts.length} حساب)`;
}

// دالة مسح جميع الحسابات
function clearAccounts() {
    if (confirm('هل أنت متأكد من رغبتك في مسح جميع الحسابات المسجلة؟')) {
        accounts = [];
        localStorage.removeItem('fb_accounts');
        updateAccountsList();
        updateStats();
        showNotification('success', 'تم مسح جميع الحسابات');
    }
}

// دالة تحديث الإحصائيات
function updateStats() {
    document.getElementById('account-count').textContent = accounts.length;
}

// دالة عرض النتائج
function showResult(type, message, element) {
    element.className = 'result-box ' + type;
    element.innerHTML = message;
    
    // إخفاء الرسالة بعد 5 ثواني
    setTimeout(() => {
        element.style.display = 'none';
    }, 5000);
}

// دالة عرض الإشعارات
function showNotification(type, message) {
    // إنشاء عنصر الإشعار
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    // إضافة تنسيقات للإشعار
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#4CAF50' : '#f44336'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
        max-width: 400px;
    `;
    
    // إضافة للصفحة
    document.body.appendChild(notification);
    
    // إزالة بعد 3 ثواني
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// إضافة أنيميشن للإشعارات
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .notification-content {
        display: flex;
        align-items: center;
        gap: 10px;
    }
`;
document.head.appendChild(style);

// دالة نسخ النتائج
function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
        .then(() => showNotification('success', 'تم نسخ النص'))
        .catch(err => console.error('Copy failed:', err));
}
