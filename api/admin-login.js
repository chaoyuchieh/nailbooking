export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Missing email or password' });
    }

    const validEmail = process.env.ADMIN_EMAIL;
    const validPassword = process.env.ADMIN_PASSWORD;

    if (email !== validEmail || password !== validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 產生隨機 token（64字元）
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

    // token 存在環境變數的 hash 裡，簡單做法是直接回傳
    // 前端存在 sessionStorage，帶著時間戳記做一小時過期
    return res.status(200).json({ 
        success: true, 
        token,
        expiresAt: Date.now() + 60 * 60 * 1000 // 1小時後過期
    });
}
