export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { userId, message } = req.body;

    if (!userId || !message) {
        return res.status(400).json({ error: 'Missing userId or message' });
    }

    try {
        // ✅ 每次自動取得新 Token不會過期
        const tokenRes = await fetch('https://api.line.me/oauth2/v3/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'client_credentials',
                client_id: process.env.LINE_CHANNEL_ID,
                client_secret: process.env.LINE_CHANNEL_SECRET
            })
        });

        if (!tokenRes.ok) {
            const tokenError = await tokenRes.json();
            console.error('Token 取得失敗:', tokenError);
            return res.status(500).json({ error: 'Failed to get token', details: tokenError });
        }

        const tokenData = await tokenRes.json();
        const accessToken = tokenData.access_token;

        // ✅ 用新 Token 發訊息
        const response = await fetch('https://api.line.me/v2/bot/message/push', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                to: userId,
                messages: [{ type: 'text', text: message }]
            })
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('LINE API Error:', error);
            return res.status(response.status).json({ error: 'Failed to send message', details: error });
        }

        return res.status(200).json({ success: true });

    } catch (error) {
        console.error('Send message error:', error);
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
}
