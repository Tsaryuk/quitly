// Генерирует 6-значный код и сохраняет в Supabase
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const SB_URL = 'https://xyvysloysykfaarupial.supabase.co';
  const SB_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5dnlzbG95c3lrZmFhcnVwaWFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NzMxNjMsImV4cCI6MjA4ODU0OTE2M30.cFljP8F8zkvYqwZDHQnoRdny-YrgSH6EBnLM40QrFJk';
  const HDR = { 'Content-Type': 'application/json', 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` };

  // Генерируем 6-значный код
  const code = String(Math.floor(100000 + Math.random() * 900000));

  try {
    // Сохраняем код в Supabase (TTL 10 минут)
    const r = await fetch(`${SB_URL}/rest/v1/tg_auth_codes`, {
      method: 'POST',
      headers: HDR,
      body: JSON.stringify({
        code,
        claimed: false,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
      })
    });
    if (!r.ok) {
      const err = await r.text();
      return res.status(500).json({ error: 'DB error: ' + err });
    }
    return res.status(200).json({ code, bot: 'quitly1_bot' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
