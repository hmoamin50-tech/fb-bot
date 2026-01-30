const axios = require('axios');
const cheerio = require('cheerio');

class MAECREATOR {
    constructor() {
        this.cl = [];
        this.reactSelected = 2;
        this.allresult = "";
    }

    ADDCOOKIE(cookie) {
        this.cl.push(cookie);
    }

    SELECTREACT(react) {
        this.reactSelected = react;
    }

    LIKE() { return 2; }
    LOVE() { return 3; }
    CARE() { return 4; }
    HAHA() { return 5; }
    WOOW() { return 6; }
    SAD() { return 7; }
    ANGRY() { return 8; }

    async SENDREACTTOPOSTID(id) {
        console.log("جاري إرسال ردود الفعل...");
        
        try {
            const results = [];
            
            for (let i = 0; i < this.cl.length; i++) {
                try {
                    const cookie = this.cl[i];
                    
                    // التحقق من صحة الكوكيز أولاً
                    const validateResponse = await axios.get('https://m.facebook.com/me', {
                        headers: {
                            'Cookie': cookie,
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                        },
                        timeout: 10000
                    });

                    if (!validateResponse.data.includes('mbasic_logout_button')) {
                        results.push(`الحساب ${i+1}: فشل - الكوكيز غير صالحة أو منتهية`);
                        continue;
                    }

                    // الحصول على صفحة ردود الفعل
                    const response = await axios.get(
                        `https://mbasic.facebook.com/reactions/picker/?ft_id=${id}`,
                        {
                            headers: {
                                'Cookie': cookie,
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
                            },
                            timeout: 15000
                        }
                    );

                    const $ = cheerio.load(response.data);
                    let reactionLink = "";
                    
                    // البحث عن رابط رد الفعل المحدد
                    const reactLinks = $('a[href*="/a/react"]');
                    if (reactLinks.length > 0 && this.reactSelected < reactLinks.length) {
                        reactionLink = $(reactLinks[this.reactSelected]).attr('href');
                    } else {
                        // محاولة ثانية بنمط مختلف
                        const allLinks = $('a');
                        allLinks.each((index, element) => {
                            const href = $(element).attr('href');
                            if (href && href.includes('/a/react')) {
                                reactionLink = href;
                                return false;
                            }
                        });
                    }

                    if (!reactionLink) {
                        results.push(`الحساب ${i+1}: فشل - لم يتم العثور على رابط التفاعل`);
                        continue;
                    }

                    // تنظيف الرابط
                    let cleanLink = "https://m.facebook.com" + reactionLink.replace(/amp;/g, '');

                    // إرسال رد الفعل
                    const reactionResponse = await axios.get(cleanLink, {
                        headers: {
                            'Cookie': cookie,
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                            'Referer': `https://mbasic.facebook.com/reactions/picker/?ft_id=${id}`
                        },
                        timeout: 15000,
                        validateStatus: null
                    });

                    if (reactionResponse.status >= 200 && reactionResponse.status < 400) {
                        results.push(`الحساب ${i+1}: نجح ✓`);
                    } else {
                        results.push(`الحساب ${i+1}: فشل - كود ${reactionResponse.status}`);
                    }

                } catch (error) {
                    console.error(`خطأ في الحساب ${i+1}:`, error.message);
                    if (error.message.includes('timeout')) {
                        results.push(`الحساب ${i+1}: فشل - انتهت المهلة`);
                    } else {
                        results.push(`الحساب ${i+1}: فشل - ${error.message}`);
                    }
                }
                
                // تأخير بين الحسابات
                if (i < this.cl.length - 1) {
                    await this.sleep(2000 + Math.random() * 1000);
                }
            }
            
            return results;
            
        } catch (error) {
            console.error("خطأ رئيسي:", error);
            throw error;
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method === 'POST') {
        try {
            const { cookies, postId, reactType } = req.body;

            if (!cookies || !Array.isArray(cookies) || cookies.length === 0) {
                return res.status(400).json({ 
                    success: false,
                    error: "يجب إضافة كوكيز الحسابات أولاً" 
                });
            }

            if (!postId) {
                return res.status(400).json({ 
                    success: false,
                    error: "معرف المنشور مطلوب" 
                });
            }

            const mae = new MAECREATOR();
            
            // إضافة الكوكيز بعد تنظيفها
            cookies.forEach(cookie => {
                if (cookie && cookie.trim() !== '') {
                    mae.ADDCOOKIE(cookie.trim());
                }
            });

            if (mae.cl.length === 0) {
                return res.status(400).json({ 
                    success: false,
                    error: "جميع الكوكيز غير صالحة" 
                });
            }

            if (reactType !== undefined) {
                mae.SELECTREACT(reactType);
            }

            const results = await mae.SENDREACTTOPOSTID(postId);

            return res.status(200).json({
                success: true,
                message: `تم معالجة ${mae.cl.length} حساب`,
                results: results
            });

        } catch (error) {
            console.error("API Error:", error);
            return res.status(500).json({ 
                success: false,
                error: "خطأ في الخادم",
                details: error.message 
            });
        }
    } else {
        return res.status(200).json({
            success: true,
            message: "Facebook React API",
            version: "2.0",
            features: ["Manual cookies", "Multiple reactions", "Batch processing"]
        });
    }
};
