const axios = require('axios');
const cheerio = require('cheerio');
const qs = require('querystring');

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false,
            error: 'الطريقة غير مسموحة' 
        });
    }

    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ 
                success: false,
                error: 'البريد الإلكتروني وكلمة المرور مطلوبان' 
            });
        }

        // إنشاء جلسة
        const session = axios.create({
            withCredentials: true,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            },
            maxRedirects: 10,
            timeout: 30000
        });

        // 1. الحصول على صفحة تسجيل الدخول
        const loginPage = await session.get('https://mbasic.facebook.com/login');
        const $ = cheerio.load(loginPage.data);

        // 2. استخراج حقول النموذج
        const lsd = $('input[name="lsd"]').val();
        const jazoest = $('input[name="jazoest"]').val();
        const m_ts = $('input[name="m_ts"]').val();
        const li = $('input[name="li"]').val();

        // 3. إعداد بيانات POST
        const formData = {
            lsd: lsd,
            jazoest: jazoest,
            m_ts: m_ts,
            li: li,
            try_number: "0",
            unrecognized_tries: "0",
            email: email,
            pass: password,
            login: "تسجيل الدخول",
            bi_xrwh: "0"
        };

        // 4. إرسال طلب تسجيل الدخول
        const loginResponse = await session.post(
            'https://mbasic.facebook.com/login',
            qs.stringify(formData),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Origin': 'https://mbasic.facebook.com',
                    'Referer': 'https://mbasic.facebook.com/login'
                }
            }
        );

        // 5. التحقق من نجاح التسجيل
        if (loginResponse.data.includes('login_error') || 
            loginResponse.data.includes('الرمز الذي أدخلته غير صحيح') ||
            loginResponse.data.includes('كلمة المرور التي أدخلتها غير صحيحة')) {
            return res.status(401).json({ 
                success: false,
                error: 'فشل تسجيل الدخول - تأكد من البريد وكلمة المرور' 
            });
        }

        // 6. استخراج الكوكيز
        const cookies = loginResponse.headers['set-cookie'];
        if (!cookies) {
            return res.status(401).json({ 
                success: false,
                error: 'فشل الحصول على الكوكيز' 
            });
        }

        // 7. تنسيق الكوكيز
        const cookieString = cookies
            .map(cookie => cookie.split(';')[0])
            .join('; ');

        // 8. التحقق من صحة الكوكيز
        try {
            const testResponse = await session.get('https://mbasic.facebook.com/me', {
                headers: {
                    'Cookie': cookieString
                }
            });

            if (!testResponse.data.includes('profile.php') && 
                !testResponse.data.includes('الصفحة الشخصية')) {
                return res.status(401).json({ 
                    success: false,
                    error: 'فشل التحقق من الحساب' 
                });
            }

            return res.status(200).json({
                success: true,
                message: 'تم تسجيل الدخول بنجاح',
                cookie: cookieString,
                cookies: cookies.map(c => c.split(';')[0])
            });

        } catch (testError) {
            return res.status(401).json({ 
                success: false,
                error: 'فشل التحقق من الجلسة' 
            });
        }

    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ 
            success: false,
            error: 'خطأ في الخادم',
            details: error.message 
        });
    }
};
