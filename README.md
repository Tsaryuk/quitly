# Quitly — Бросаем вместе 🚭

Трекер отказа от курения с живой лентой и хештегом #бросаемвместе

## Быстрый деплой на Vercel

```bash
# 1. Клонируй или загрузи файлы
# 2. Зайди на vercel.com → New Project → Import

# 3. Добавь переменные окружения в Vercel Dashboard:
THREADS_APP_ID=...
THREADS_APP_SECRET=...
THREADS_REDIRECT_URI=https://твой-домен.vercel.app/api/auth/callback
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
```

## Настройка Supabase

1. Зайди на [supabase.com](https://supabase.com) → New Project
2. Открой **SQL Editor** → вставь содержимое `supabase-setup.sql` → Run
3. Включи **Realtime**: Database → Replication → `quit_sessions` ✓
4. Скопируй **URL** и **anon key** из Settings → API

## Настройка Threads OAuth

1. Зайди на [developers.facebook.com](https://developers.facebook.com) → My Apps → Create App
2. Добавь продукт **Threads API**
3. В настройках добавь **Redirect URI**: `https://твой-домен.vercel.app/api/auth/callback`
4. Скопируй **App ID** и **App Secret** → добавь в Vercel env vars
5. Подай на **App Review** (1–3 дня) для публичного доступа

## Структура файлов

```
quitly/
├── index.html          ← Всё приложение
├── manifest.json       ← PWA конфиг
├── sw.js               ← Service Worker (офлайн)
├── supabase.js         ← Supabase клиент
├── supabase-setup.sql  ← SQL для базы данных
├── vercel.json         ← Vercel конфиг
├── icons/
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── apple-touch-icon.png
│   └── favicon-32.png
└── api/
    └── auth/
        ├── threads.js  ← OAuth редирект
        └── callback.js ← OAuth callback
```

## СБП донат

В `index.html` найди строку с `+7 (___)` и замени на свой номер телефона.

---
Автор: Денис Царюк [@mr.tsaryuk](https://threads.com/mr.tsaryuk) · [Offline.Клуб](https://t.me/offlineclub_ru)
