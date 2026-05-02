// api/webauthn-register.js
// 處理 Face ID 綁定的兩個階段：
// POST { action: 'challenge' } → 回傳 challenge
// POST { action: 'verify', credential } → 驗證並儲存 credential

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RP_ID = 'nailbooking.vercel.app';
const RP_NAME = 'Nail Collector Admin';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const { action } = req.body;

    // ── 階段一：產生 challenge ──
    if (action === 'challenge') {
        const token = req.body.token;
        const expiry = req.body.expiresAt;
        if (!token || !expiry || Date.now() > parseInt(expiry)) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const challenge = Array.from(crypto.getRandomValues(new Uint8Array(32)))
            .map(b => b.toString(16).padStart(2, '0')).join('');

        // 把 challenge 暫存到 Supabase（5分鐘有效）
        await supabaseUpsert('booking_settings', {
            setting_key: 'webauthn_register_challenge',
            setting_value: { challenge, expiresAt: Date.now() + 5 * 60 * 1000 }
        });

        return res.status(200).json({
            challenge,
            rp: { id: RP_ID, name: RP_NAME },
            user: {
                id: 'admin',
                name: 'admin@nailbooking',
                displayName: 'Nail Collector Admin'
            }
        });
    }

    // ── 階段二：驗證並儲存 credential ──
    if (action === 'verify') {
        const { credential } = req.body;
        if (!credential) return res.status(400).json({ error: 'Missing credential' });

        // 取出暫存的 challenge
        const stored = await supabaseGet('webauthn_register_challenge');
        if (!stored || Date.now() > stored.expiresAt) {
            return res.status(400).json({ error: 'Challenge expired' });
        }

        // 驗證 clientDataJSON 裡的 challenge
        const clientData = JSON.parse(
            Buffer.from(credential.response.clientDataJSON, 'base64').toString('utf8')
        );
        const receivedChallenge = Buffer.from(clientData.challenge, 'base64')
            .toString('hex');

        if (receivedChallenge !== stored.challenge) {
            return res.status(400).json({ error: 'Challenge mismatch' });
        }

        // 儲存 credentialId 和 publicKey
        await supabaseUpsert('booking_settings', {
            setting_key: 'webauthn_credential',
            setting_value: {
                credentialId: credential.id,
                publicKey: credential.response.attestationObject,
                createdAt: new Date().toISOString()
            }
        });

        return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Invalid action' });
}

// ── Supabase helpers ──
async function supabaseUpsert(table, row) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(row)
    });
    if (!r.ok) throw new Error(await r.text());
}

async function supabaseGet(settingKey) {
    const r = await fetch(
        `${SUPABASE_URL}/rest/v1/booking_settings?setting_key=eq.${settingKey}&select=setting_value`,
        {
            headers: {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
            }
        }
    );
    const data = await r.json();
    return data?.[0]?.setting_value || null;
}
