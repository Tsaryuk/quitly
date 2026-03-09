// Webhook для бота — получает /start CODE от пользователя
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const SB_URL = 'https://xyvysloysykfaarupial.supabase.co';
  const SB_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5dnlzbG95c3lrZmFhcnVwaWFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NzMxNjMsImV4cCI6MjA4ODU0OTE2M30.cFljP8F8zkvYqwZDHQnoRdny-YrgSH6EBnLM40QrFJk';
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const HDR = { 'Content-Type': 'application/json', 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` };

  try {
    const update = req.body;
    const msg = update?.message;
    if (!msg) return res.status(200).json({ ok: true });

    const from = msg.from;
    const text = msg.text || '';
    const chatId = msg.chat.id;

    // Получаем фото профиля
    let photoUrl = null;
    try {
      const photosR = await fetch(
        `https://api.telegram.org/bot${BOT_TOKEN}/getUserProfilePhotos?user_id=${from.id}&limit=1`
      );
      const photosD = await photosR.json();
      const fileId = photosD?.result?.photos?.[0]?.[0]?.file_id;
      if (fileId) {
        const fileR = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
        const fileD = await fileR.json();
        if (fileD?.result?.file_path) {
          photoUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileD.result.file_path}`;
        }
      }
    } catch (_) {}

    // Обрабатываем /start CODE
    if (text.startsWith('/start ')) {
      const code = text.replace('/start ', '').trim();

      if (/^\d{6}$/.test(code)) {
        // Записываем в Supabase
        const name = [from.first_name, from.last_name].filter(Boolean).join(' ');
        const r = await fetch(
          `${SB_URL}/rest/v1/tg_auth_codes?code=eq.${code}`,
          {
            method: 'PATCH',
            headers: { ...HDR, 'Prefer': 'return=minimal' },
            body: JSON.stringify({
              claimed: true,
              claimed_at: new Date().toISOString(),
              tg_id: String(from.id),
              tg_name: name,
              tg_username: from.username || null,
              tg_photo: photoUrl
            })
          }
        );

        if (r.ok) {
          // Отправляем приветственное сообщение
          await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: `✅ Привет, ${from.first_name}!\n\nТы успешно вошёл в Quitly.\nВернись в приложение и начинай бросать 🚭\n\nЯ буду присылать поддержку когда это нужно 💪`,
              parse_mode: 'HTML'
            })
          });
        } else {
          await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: '❌ Код недействителен или истёк. Попробуй ещё раз.' })
          });
        }
      } else {
        // /start без кода — просто приветствие
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `👋 Привет! Я бот Quitly.\n\nОткрой приложение quitly-sigma.vercel.app и нажми «Войти через Telegram» — я пришлю тебе код входа.`
          })
        });
      }
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('webhook error:', e);
    return res.status(200).json({ ok: true }); // всегда 200 для Telegram
  }
}
