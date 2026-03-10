// Vercel Cron: отправка запланированных сообщений
// Вызывается раз в минуту через vercel.json crons
export default async function handler(req, res) {
  // Защита: только Vercel Cron или ручной вызов с секретом
  const cronSecret = req.headers['authorization'];
  if (cronSecret !== `Bearer ${process.env.CRON_SECRET}` && !process.env.VERCEL) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const SB_URL = 'https://xyvysloysykfaarupial.supabase.co';
  const SB_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5dnlzbG95c3lrZmFhcnVwaWFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NzMxNjMsImV4cCI6MjA4ODU0OTE2M30.cFljP8F8zkvYqwZDHQnoRdny-YrgSH6EBnLM40QrFJk';
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const HDR = { 'Content-Type': 'application/json', 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` };

  try {
    // Получаем сообщения, которые пора отправить
    const now = new Date().toISOString();
    const r = await fetch(
      `${SB_URL}/rest/v1/scheduled_messages?sent=eq.false&send_at=lte.${now}&order=send_at.asc&limit=20`,
      { headers: HDR }
    );

    if (!r.ok) {
      return res.status(200).json({ ok: true, sent: 0, error: 'DB query failed' });
    }

    const messages = await r.json();
    let sent = 0;

    for (const msg of messages) {
      try {
        // Отправляем через Telegram
        const tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: msg.chat_id,
            text: msg.message_text,
            disable_web_page_preview: false
          })
        });

        const tgData = await tgRes.json();

        // Помечаем как отправленное
        await fetch(
          `${SB_URL}/rest/v1/scheduled_messages?id=eq.${msg.id}`,
          {
            method: 'PATCH',
            headers: { ...HDR, 'Prefer': 'return=minimal' },
            body: JSON.stringify({
              sent: true,
              sent_at: new Date().toISOString(),
              tg_ok: tgData.ok || false
            })
          }
        );

        if (tgData.ok) sent++;
      } catch (e) {
        console.error('Failed to send message:', msg.id, e);
      }
    }

    return res.status(200).json({ ok: true, checked: messages.length, sent });
  } catch (e) {
    console.error('cron error:', e);
    return res.status(200).json({ ok: false, error: e.message });
  }
}
