/**
 * SUPABASE SETUP
 * 1. Создай проект на supabase.com (бесплатно)
 * 2. Замени URL и KEY ниже
 * 3. Выполни SQL из README.md в SQL Editor
 */

const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_KEY = 'YOUR_ANON_KEY';

// Lazy load Supabase SDK
let _supabase = null;
async function getSupabase() {
  if (_supabase) return _supabase;
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  _supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  return _supabase;
}

// ─── AUTH ───────────────────────────────────────────────────────────────────

export async function signInAnon() {
  const db = await getSupabase();
  const { data, error } = await db.auth.signInAnonymously();
  if (error) throw error;
  return data.user;
}

export async function signUp(email, password, username) {
  const db = await getSupabase();
  const { data, error } = await db.auth.signUp({ email, password });
  if (error) throw error;
  await db.from('profiles').upsert({ id: data.user.id, username, created_at: new Date() });
  return data.user;
}

export async function signIn(email, password) {
  const db = await getSupabase();
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

export async function getSession() {
  const db = await getSupabase();
  const { data } = await db.auth.getSession();
  return data.session?.user || null;
}

export async function signOut() {
  const db = await getSupabase();
  await db.auth.signOut();
}

// ─── QUIT SESSION ────────────────────────────────────────────────────────────

export async function createQuitSession(userId, cigarettesPerDay, pricePerPack) {
  const db = await getSupabase();
  const { data, error } = await db.from('quit_sessions').upsert({
    user_id: userId,
    started_at: new Date().toISOString(),
    cigarettes_per_day: cigarettesPerDay,
    price_per_pack: pricePerPack,
    is_active: true
  }).select().single();
  if (error) throw error;
  return data;
}

export async function getActiveSession(userId) {
  const db = await getSupabase();
  const { data } = await db.from('quit_sessions')
    .select('*').eq('user_id', userId).eq('is_active', true)
    .order('started_at', { ascending: false }).limit(1).single();
  return data;
}

export async function recordRelapse(sessionId) {
  const db = await getSupabase();
  await db.from('quit_sessions').update({ is_active: false, relapsed_at: new Date() }).eq('id', sessionId);
}

// ─── PROFILE ────────────────────────────────────────────────────────────────

export async function getProfile(userId) {
  const db = await getSupabase();
  const { data } = await db.from('profiles').select('*').eq('id', userId).single();
  return data;
}

export async function updateProfile(userId, updates) {
  const db = await getSupabase();
  await db.from('profiles').update(updates).eq('id', userId);
}

// ─── GLOBAL FEED ────────────────────────────────────────────────────────────

export async function getGlobalFeed(limit = 20) {
  const db = await getSupabase();
  const { data } = await db.from('quit_sessions')
    .select('id, started_at, cigarettes_per_day, profiles(username, avatar_emoji)')
    .eq('is_active', true)
    .order('started_at', { ascending: false })
    .limit(limit);
  return data || [];
}

export async function getTodayCount() {
  const db = await getSupabase();
  const today = new Date(); today.setHours(0,0,0,0);
  const { count } = await db.from('quit_sessions')
    .select('*', { count: 'exact', head: true })
    .gte('started_at', today.toISOString())
    .eq('is_active', true);
  return count || 0;
}

// ─── CHALLENGES ─────────────────────────────────────────────────────────────

export async function createChallenge(fromUserId, toUsername) {
  const db = await getSupabase();
  const { data: toProfile } = await db.from('profiles')
    .select('id').eq('username', toUsername).single();
  if (!toProfile) throw new Error('Пользователь не найден');
  const { data, error } = await db.from('challenges').insert({
    from_user: fromUserId, to_user: toProfile.id,
    status: 'pending', created_at: new Date()
  }).select().single();
  if (error) throw error;
  return data;
}

export async function getMyChallenge(userId) {
  const db = await getSupabase();
  const { data } = await db.from('challenges')
    .select('*, from_profile:profiles!from_user(username, avatar_emoji), to_profile:profiles!to_user(username, avatar_emoji)')
    .or(`from_user.eq.${userId},to_user.eq.${userId}`)
    .eq('status', 'active')
    .single();
  return data;
}

export async function acceptChallenge(challengeId) {
  const db = await getSupabase();
  await db.from('challenges').update({ status: 'active', accepted_at: new Date() }).eq('id', challengeId);
}

export async function getPendingChallenges(userId) {
  const db = await getSupabase();
  const { data } = await db.from('challenges')
    .select('*, from_profile:profiles!from_user(username, avatar_emoji)')
    .eq('to_user', userId).eq('status', 'pending');
  return data || [];
}

// ─── SUPPORT MESSAGES ───────────────────────────────────────────────────────

export async function sendSupport(toUserId, message) {
  const db = await getSupabase();
  const { error } = await db.from('support_messages').insert({
    to_user: toUserId, message,
    sent_at: new Date(), is_anonymous: true
  });
  if (error) throw error;
}

export async function getMySupport(userId) {
  const db = await getSupabase();
  const { data } = await db.from('support_messages')
    .select('*').eq('to_user', userId)
    .order('sent_at', { ascending: false }).limit(10);
  return data || [];
}

export async function getUsersNeedingSupport() {
  const db = await getSupabase();
  // Люди чья сессия меньше 48 часов — самый тяжёлый период
  const cutoff = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
  const { data } = await db.from('quit_sessions')
    .select('user_id, started_at, profiles(username, avatar_emoji)')
    .eq('is_active', true)
    .gte('started_at', cutoff)
    .limit(5);
  return data || [];
}

// ─── CRAVINGS LOG ───────────────────────────────────────────────────────────

export async function logCraving(userId) {
  const db = await getSupabase();
  await db.from('cravings').insert({ user_id: userId, survived_at: new Date() });
}

export async function getTodayCravings(userId) {
  const db = await getSupabase();
  const today = new Date(); today.setHours(0,0,0,0);
  const { count } = await db.from('cravings')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('survived_at', today.toISOString());
  return count || 0;
}

// ─── REALTIME ───────────────────────────────────────────────────────────────

export async function subscribeToSupport(userId, callback) {
  const db = await getSupabase();
  return db.channel('support').on('postgres_changes', {
    event: 'INSERT', schema: 'public', table: 'support_messages',
    filter: `to_user=eq.${userId}`
  }, callback).subscribe();
}

export async function subscribeToFeed(callback) {
  const db = await getSupabase();
  return db.channel('feed').on('postgres_changes', {
    event: 'INSERT', schema: 'public', table: 'quit_sessions'
  }, callback).subscribe();
}
