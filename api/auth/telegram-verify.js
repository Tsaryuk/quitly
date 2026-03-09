import crypto from 'crypto';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  if (!BOT_TOKEN) return res.status(500).json({ error: 'Bot token not configured' });

  try {
    const data = req.body;
    const { hash, ...authData } = data;

    if (!hash) return res.status(400).json({ error: 'No hash provided' });

    // Verify auth_date is not too old (24h)
    const authDate = parseInt(authData.auth_date);
    if (Date.now() / 1000 - authDate > 86400) {
      return res.status(401).json({ error: 'Auth data is outdated' });
    }

    // Build check string: sorted key=value pairs
    const checkString = Object.keys(authData)
      .sort()
      .map(k => `${k}=${authData[k]}`)
      .join('\n');

    // Secret key = SHA256 of bot token
    const secretKey = crypto.createHash('sha256').update(BOT_TOKEN).digest();
    const expectedHash = crypto.createHmac('sha256', secretKey).update(checkString).digest('hex');

    if (expectedHash !== hash) {
      return res.status(401).json({ error: 'Invalid auth data' });
    }

    // Auth valid — return clean user object
    return res.status(200).json({
      ok: true,
      user: {
        id: authData.id,
        name: [authData.first_name, authData.last_name].filter(Boolean).join(' '),
        handle: authData.username ? '@' + authData.username : null,
        photo: authData.photo_url || null,
      }
    });
  } catch (e) {
    console.error('TG verify error:', e);
    return res.status(500).json({ error: 'Server error' });
  }
}
