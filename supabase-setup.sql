-- Run this in Supabase → SQL Editor

-- Таблица сессий отказа от курения
CREATE TABLE quit_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  threads_handle TEXT,
  display_name TEXT NOT NULL,
  avatar TEXT DEFAULT '🐺',
  is_threads_user BOOLEAN DEFAULT false,
  cigs_per_day INTEGER DEFAULT 20,
  price_per_pack INTEGER DEFAULT 200,
  started_at TIMESTAMPTZ DEFAULT now(),
  relapsed_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  cravings_today INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Таблица поддержки (анонимные сообщения)
CREATE TABLE support_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  to_session_id UUID REFERENCES quit_sessions(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security
ALTER TABLE quit_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- Читать могут все
CREATE POLICY "Public read sessions" ON quit_sessions FOR SELECT USING (true);
CREATE POLICY "Public read support" ON support_messages FOR SELECT USING (true);

-- Писать могут все (анонимный режим)
CREATE POLICY "Public insert sessions" ON quit_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert support" ON support_messages FOR INSERT WITH CHECK (true);

-- Обновлять только свою сессию (по хендлу — временно без auth)
CREATE POLICY "Update own session" ON quit_sessions FOR UPDATE USING (true);

-- Индексы
CREATE INDEX idx_sessions_active ON quit_sessions(is_active, started_at DESC);
CREATE INDEX idx_sessions_handle ON quit_sessions(threads_handle);

-- Realtime (включи в Dashboard → Database → Replication → quit_sessions)
ALTER PUBLICATION supabase_realtime ADD TABLE quit_sessions;

