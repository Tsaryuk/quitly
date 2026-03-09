// Проверяет — был ли код подтверждён ботом
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).end();

  const { code } = req.query;
  if (!code) return res.status(400).json({ error: 'No code' });

  const SB_URL = 'https://xyvysloysykfaarupial.supabase.co';
  const SB_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5dnlzbG95c3lrZmFhcnVwaWFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NzMxNjMsImV4cCI6MjA4ODU0OTE2M30.cFljP8F8zkvYqwZDHQnoRdny-YrgSH6EBnLM40QrFJk';
  const HDR = { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` };

  try {
    const r = await fetch(
      `${SB_URL}/rest/v1/tg_auth_codes?code=eq.${code}&select=*&limit=1`,
      { headers: HDR }
    );
    const rows = await r.json();
    if (!rows?.length) return res.status(404).json({ claimed: false, error: 'Code not found' });

    const row = rows[0];
    // Проверяем срок действия
    if (new Date(row.expires_at) < new Date()) {
      return res.status(410).json({ claimed: false, error: 'Code expired' });
    }
    if (!row.claimed) {
      return res.status(200).json({ claimed: false });
    }
    // Код подтверждён — возвращаем данные пользователя
    return res.status(200).json({
      claimed: true,
      user: {
        id: row.tg_id,
        name: row.tg_name,
        handle: row.tg_username ? '@' + row.tg_username : null,
        photo: row.tg_photo || null
      }
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
