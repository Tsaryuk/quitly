import * as DB from './supabase.js';

// ─── STATE ───────────────────────────────────────────────────────────────────
const state = {
  user: null,
  profile: null,
  session: null,
  challenge: null,
  timerInterval: null,
  currentScreen: 'loading',
  feedData: [],
  supportMessages: [],
};

// ─── LOCAL STORAGE HELPERS ──────────────────────────────────────────────────
const local = {
  get: k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
  del: k => localStorage.removeItem(k)
};

// ─── ROUTER ──────────────────────────────────────────────────────────────────
function navigate(screen, data = {}) {
  state.currentScreen = screen;
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(`screen-${screen}`);
  if (el) {
    el.classList.add('active');
    el.classList.add('screen-enter');
    requestAnimationFrame(() => el.classList.remove('screen-enter'));
  }
  screens[screen]?.(data);
}

// ─── UTILS ───────────────────────────────────────────────────────────────────
function formatDuration(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (d > 0) return `${d}д ${h}ч ${m}м`;
  if (h > 0) return `${h}ч ${m}м ${s}с`;
  return `${m}м ${s}с`;
}

function formatDurationShort(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  if (d > 0) return `${d} дн`;
  if (h > 0) return `${h}ч`;
  return `${Math.floor(seconds / 60)}м`;
}

function elapsedSeconds(startedAt) {
  return Math.floor((Date.now() - new Date(startedAt)) / 1000);
}

function notSmoked(session) {
  if (!session) return 0;
  const secs = elapsedSeconds(session.started_at);
  return Math.floor(secs / (86400 / (session.cigarettes_per_day || 20)));
}

function moneySaved(session) {
  if (!session) return 0;
  const cigs = notSmoked(session);
  const pricePerCig = (session.price_per_pack || 200) / 20;
  return Math.floor(cigs * pricePerCig);
}

const AVATARS = ['🐺','🦊','🐻','🦁','🐯','🐼','🦄','🐸','🐙','🦋','🌊','⚡','🔥','🌿','🎯'];

// ─── RECOVERY MILESTONES ─────────────────────────────────────────────────────
const MILESTONES = [
  { secs: 20*60,      label: '20 минут',  desc: 'Давление нормализуется',          icon: '💓' },
  { secs: 8*3600,     label: '8 часов',   desc: 'Кислород в норме',                icon: '🫁' },
  { secs: 48*3600,    label: '2 дня',     desc: 'Вкус и запах возвращаются',       icon: '👃' },
  { secs: 72*3600,    label: '3 дня',     desc: 'Физическая зависимость ушла',     icon: '🧠' },
  { secs: 14*86400,   label: '2 недели',  desc: 'Слизистая восстановилась',        icon: '👃' },
  { secs: 30*86400,   label: '1 месяц',   desc: 'Храп снижается, сон лучше',       icon: '😴' },
  { secs: 90*86400,   label: '3 месяца',  desc: 'Риск инфаркта снизился',          icon: '❤️' },
  { secs: 365*86400,  label: '1 год',     desc: 'Риск болезней сердца вдвое ниже', icon: '🏆' },
];

const DAY_TIPS = [
  'Тяга длится 3–5 минут. Просто переживи её — выпей воды, пройдись.',
  'Убери сигареты из зоны видимости. Если не видишь — реже думаешь.',
  'Третий день — самый тяжёлый физически. Если прошёл — дальше легче.',
  'Замени утренний ритуал с сигаретой на стакан воды и 5 минут свежего воздуха.',
  'Тяга — это волна. Она нарастает и спадает. Ты серфер, не жертва.',
  'Посчитай сколько денег уже сэкономил. Запланируй на что потратишь.',
  'Неделя без курения. Лёгкие уже работают лучше — ты это чувствуешь.',
];

// ─── SCREENS ─────────────────────────────────────────────────────────────────
const screens = {

  loading: async () => {
    try {
      state.user = await DB.getSession();
      if (state.user) {
        state.profile = await DB.getProfile(state.user.id);
        state.session = await DB.getActiveSession(state.user.id);
        if (state.session) navigate('home');
        else navigate('onboard');
      } else {
        navigate('welcome');
      }
    } catch {
      navigate('welcome');
    }
  },

  welcome: () => {},

  onboard: () => {
    const avatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
    document.getElementById('onboard-avatar').textContent = avatar;
  },

  home: async () => {
    renderHome();
    startTimer();
    loadFeed();
    loadChallenge();
    loadSupport();
    subscribeRealtime();
  },

  feed: async () => {
    renderFeedScreen();
  },

  challenge: async () => {
    renderChallengeScreen();
  },

  support: async () => {
    renderSupportScreen();
  },

  profile: async () => {
    renderProfileScreen();
  }
};

// ─── HOME SCREEN ─────────────────────────────────────────────────────────────
function renderHome() {
  if (!state.session) return;
  const secs = elapsedSeconds(state.session.started_at);
  const days = Math.floor(secs / 86400);
  const tip = DAY_TIPS[Math.min(days, DAY_TIPS.length - 1)];
  document.getElementById('home-tip').textContent = tip;
  updateTimerDisplay();
  renderMilestones(secs);
}

function startTimer() {
  if (state.timerInterval) clearInterval(state.timerInterval);
  state.timerInterval = setInterval(updateTimerDisplay, 1000);
}

function updateTimerDisplay() {
  if (!state.session) return;
  const secs = elapsedSeconds(state.session.started_at);
  document.getElementById('timer-main').textContent = formatDuration(secs);
  document.getElementById('stat-not-smoked').textContent = notSmoked(state.session);
  document.getElementById('stat-money').textContent = moneySaved(state.session) + ' ₽';
  const days = Math.floor(secs / 86400);
  document.getElementById('day-badge').textContent = `День ${days + 1}`;
}

function renderMilestones(currentSecs) {
  const container = document.getElementById('milestones');
  if (!container) return;
  container.innerHTML = MILESTONES.map(m => {
    const done = currentSecs >= m.secs;
    const pct = done ? 100 : Math.round((currentSecs / m.secs) * 100);
    return `<div class="milestone ${done ? 'done' : ''}">
      <div class="ms-icon">${m.icon}</div>
      <div class="ms-body">
        <div class="ms-label">${m.label}</div>
        <div class="ms-desc">${m.desc}</div>
        ${!done ? `<div class="ms-bar"><div class="ms-fill" style="width:${pct}%"></div></div>` : ''}
      </div>
      ${done ? '<div class="ms-check">✓</div>' : ''}
    </div>`;
  }).join('');
}

// ─── FEED ────────────────────────────────────────────────────────────────────
async function loadFeed() {
  try {
    state.feedData = await DB.getGlobalFeed(30);
    const count = await DB.getTodayCount();
    const el = document.getElementById('feed-today-count');
    if (el) el.textContent = `Сегодня бросили: ${count}`;
    renderFeedPreview();
  } catch {}
}

function renderFeedPreview() {
  const container = document.getElementById('feed-preview');
  if (!container) return;
  const items = state.feedData.slice(0, 5);
  container.innerHTML = items.map(item => {
    const secs = elapsedSeconds(item.started_at);
    return `<div class="feed-item" onclick="navigate('feed')">
      <div class="feed-avatar">${item.profiles?.avatar_emoji || '🐺'}</div>
      <div class="feed-info">
        <div class="feed-name">${item.profiles?.username || 'Аноним'}</div>
        <div class="feed-time">${formatDurationShort(secs)} без сигарет</div>
      </div>
      <button class="btn-cheer" onclick="event.stopPropagation(); sendSupportTo('${item.user_id}')">🤝</button>
    </div>`;
  }).join('');
}

function renderFeedScreen() {
  const container = document.getElementById('feed-list');
  if (!container) return;
  container.innerHTML = state.feedData.map(item => {
    const secs = elapsedSeconds(item.started_at);
    const days = Math.floor(secs / 86400);
    return `<div class="feed-card">
      <div class="feed-card-top">
        <div class="feed-avatar-lg">${item.profiles?.avatar_emoji || '🐺'}</div>
        <div>
          <div class="feed-card-name">${item.profiles?.username || 'Аноним'}</div>
          <div class="feed-card-days">${days > 0 ? days + ' дней' : 'Первый день'}</div>
        </div>
      </div>
      <div class="feed-card-timer">${formatDuration(secs)}</div>
      <button class="btn-support-full" onclick="sendSupportTo('${item.user_id}', '${item.profiles?.username || 'Аноним'}')">
        🤝 Поддержать
      </button>
    </div>`;
  }).join('');
}

// ─── CHALLENGE ───────────────────────────────────────────────────────────────
async function loadChallenge() {
  if (!state.user) return;
  try {
    state.challenge = await DB.getMyChallenge(state.user.id);
    const pending = await DB.getPendingChallenges(state.user.id);
    if (pending.length > 0) showPendingChallenge(pending[0]);
    renderChallengePreview();
  } catch {}
}

function renderChallengePreview() {
  const el = document.getElementById('challenge-preview');
  if (!el) return;
  if (state.challenge) {
    const isFrom = state.challenge.from_user === state.user?.id;
    const partner = isFrom ? state.challenge.to_profile : state.challenge.from_profile;
    const partnerSession = { started_at: state.challenge.accepted_at || state.session?.started_at };
    el.innerHTML = `<div class="challenge-card" onclick="navigate('challenge')">
      <div class="ch-vs">
        <div class="ch-me">
          <div class="ch-avatar">${state.profile?.avatar_emoji || '🐺'}</div>
          <div class="ch-name">Ты</div>
          <div class="ch-time">${formatDurationShort(elapsedSeconds(state.session?.started_at || new Date()))}</div>
        </div>
        <div class="ch-separator">VS</div>
        <div class="ch-partner">
          <div class="ch-avatar">${partner?.avatar_emoji || '🦊'}</div>
          <div class="ch-name">${partner?.username || '?'}</div>
          <div class="ch-time">${formatDurationShort(elapsedSeconds(partnerSession.started_at || new Date()))}</div>
        </div>
      </div>
    </div>`;
  } else {
    el.innerHTML = `<div class="challenge-invite" onclick="navigate('challenge')">
      <div class="ci-icon">🤝</div>
      <div class="ci-text">Брось вместе с другом</div>
      <div class="ci-sub">Парный режим — вдвое легче</div>
    </div>`;
  }
}

function renderChallengeScreen() {
  const container = document.getElementById('challenge-content');
  if (!container) return;
  if (state.challenge) {
    const isFrom = state.challenge.from_user === state.user?.id;
    const partner = isFrom ? state.challenge.to_profile : state.challenge.from_profile;
    const myTime = elapsedSeconds(state.session?.started_at || new Date());
    const partnerTime = elapsedSeconds(state.challenge.accepted_at || new Date());
    container.innerHTML = `
      <div class="ch-big">
        <div class="ch-big-me">
          <div class="ch-big-avatar">${state.profile?.avatar_emoji || '🐺'}</div>
          <div class="ch-big-name">Ты</div>
          <div class="ch-big-time">${formatDuration(myTime)}</div>
        </div>
        <div class="ch-big-vs">VS</div>
        <div class="ch-big-partner">
          <div class="ch-big-avatar">${partner?.avatar_emoji || '🦊'}</div>
          <div class="ch-big-name">${partner?.username}</div>
          <div class="ch-big-time">${formatDuration(partnerTime)}</div>
        </div>
      </div>
      <p class="ch-status">Вы оба держитесь 💪</p>`;
  } else {
    container.innerHTML = `
      <p class="ch-intro">Позови друга — бросайте вместе. Публичное обязательство работает.</p>
      <div class="input-group">
        <input type="text" id="challenge-username" placeholder="Никнейм друга" class="app-input" />
        <button class="btn-primary" onclick="sendChallenge()">Позвать</button>
      </div>
      <div id="challenge-msg" class="msg-area"></div>`;
  }
}

async function sendChallenge() {
  const username = document.getElementById('challenge-username')?.value?.trim();
  if (!username || !state.user) return;
  try {
    await DB.createChallenge(state.user.id, username);
    document.getElementById('challenge-msg').innerHTML = '<p class="success-msg">Приглашение отправлено! ✓</p>';
  } catch (e) {
    document.getElementById('challenge-msg').innerHTML = `<p class="error-msg">${e.message}</p>`;
  }
}

function showPendingChallenge(challenge) {
  const toast = document.createElement('div');
  toast.className = 'toast-challenge';
  toast.innerHTML = `
    <div class="tc-text">🤝 <b>${challenge.from_profile?.username}</b> зовёт тебя на челлендж</div>
    <div class="tc-btns">
      <button onclick="acceptChallenge('${challenge.id}', this.closest('.toast-challenge'))">Принять</button>
      <button class="secondary" onclick="this.closest('.toast-challenge').remove()">Позже</button>
    </div>`;
  document.getElementById('toasts').appendChild(toast);
}

async function acceptChallenge(id, el) {
  await DB.acceptChallenge(id);
  el?.remove();
  state.challenge = await DB.getMyChallenge(state.user.id);
  renderChallengePreview();
  showToast('Челлендж принят! 🔥');
}

// ─── SUPPORT ─────────────────────────────────────────────────────────────────
async function loadSupport() {
  if (!state.user) return;
  try {
    state.supportMessages = await DB.getMySupport(state.user.id);
    renderSupportBadge();
  } catch {}
}

function renderSupportBadge() {
  const badge = document.getElementById('support-badge');
  if (badge && state.supportMessages.length > 0) {
    badge.textContent = state.supportMessages.length;
    badge.style.display = 'flex';
  }
}

async function renderSupportScreen() {
  const container = document.getElementById('support-content');
  if (!container) return;

  const needHelp = await DB.getUsersNeedingSupport().catch(() => []);

  container.innerHTML = `
    <div class="support-section">
      <div class="support-section-title">Твои сообщения поддержки</div>
      ${state.supportMessages.length === 0
        ? '<p class="support-empty">Пока пусто — но кто-то может написать в любой момент 🤍</p>'
        : state.supportMessages.map(m => `
          <div class="support-msg">
            <div class="support-msg-text">${m.message}</div>
            <div class="support-msg-time">${new Date(m.sent_at).toLocaleString('ru')}</div>
          </div>`).join('')
      }
    </div>
    ${needHelp.length > 0 ? `
    <div class="support-section">
      <div class="support-section-title">Кому сейчас тяжело (первые 48ч)</div>
      ${needHelp.map(item => `
        <div class="support-need-item">
          <div class="feed-avatar">${item.profiles?.avatar_emoji || '🐺'}</div>
          <div style="flex:1">
            <div class="feed-name">${item.profiles?.username || 'Аноним'}</div>
            <div class="feed-time">${formatDurationShort(elapsedSeconds(item.started_at))} без сигарет</div>
          </div>
          <button class="btn-cheer" onclick="openSupportModal('${item.user_id}', '${item.profiles?.username || 'Аноним'}')">💬</button>
        </div>`).join('')}
    </div>` : ''}`;
}

async function sendSupportTo(userId, username) {
  openSupportModal(userId, username || 'этому человеку');
}

function openSupportModal(userId, username) {
  const modal = document.getElementById('support-modal');
  document.getElementById('support-modal-name').textContent = username;
  document.getElementById('support-msg-input').value = '';
  document.getElementById('support-modal-user').value = userId;
  modal.classList.add('open');
}

async function submitSupport() {
  const userId = document.getElementById('support-modal-user').value;
  const msg = document.getElementById('support-msg-input').value.trim();
  if (!msg) return;
  await DB.sendSupport(userId, msg).catch(() => {});
  closeModal();
  showToast('Поддержка отправлена 🤍');
}

function closeModal() {
  document.getElementById('support-modal').classList.remove('open');
}

// ─── PROFILE ─────────────────────────────────────────────────────────────────
function renderProfileScreen() {
  if (!state.profile || !state.session) return;
  const secs = elapsedSeconds(state.session.started_at);
  const days = Math.floor(secs / 86400);
  const earned = moneySaved(state.session);
  const notSmokedTotal = notSmoked(state.session);

  document.getElementById('profile-avatar').textContent = state.profile.avatar_emoji || '🐺';
  document.getElementById('profile-username').textContent = state.profile.username || 'Аноним';
  document.getElementById('profile-days').textContent = days;
  document.getElementById('profile-cigs').textContent = notSmokedTotal;
  document.getElementById('profile-money').textContent = earned + ' ₽';

  const achieved = MILESTONES.filter(m => secs >= m.secs);
  const badgesEl = document.getElementById('profile-badges');
  if (badgesEl) {
    badgesEl.innerHTML = achieved.map(m =>
      `<div class="badge-item" title="${m.desc}">${m.icon}<span>${m.label}</span></div>`
    ).join('') || '<p class="support-empty">Продолжай — первый значок через 20 минут</p>';
  }
}

// ─── ONBOARDING ──────────────────────────────────────────────────────────────
async function submitOnboard() {
  const username = document.getElementById('onboard-username').value.trim();
  const cigs = parseInt(document.getElementById('onboard-cigs').value) || 20;
  const price = parseInt(document.getElementById('onboard-price').value) || 200;
  const avatar = document.getElementById('onboard-avatar').textContent;

  if (!username) { showToast('Введи никнейм', 'error'); return; }

  try {
    showLoading(true);
    state.user = await DB.signInAnon();
    await DB.updateProfile(state.user.id, { username, avatar_emoji: avatar });
    state.profile = await DB.getProfile(state.user.id);
    state.session = await DB.createQuitSession(state.user.id, cigs, price);
    navigate('home');
  } catch (e) {
    showToast(e.message || 'Ошибка', 'error');
  } finally {
    showLoading(false);
  }
}

function pickAvatar(emoji) {
  document.getElementById('onboard-avatar').textContent = emoji;
  document.querySelectorAll('.avatar-opt').forEach(el => el.classList.remove('selected'));
  event.target.classList.add('selected');
}

// ─── CRAVING ─────────────────────────────────────────────────────────────────
async function survivedCraving() {
  if (state.user) await DB.logCraving(state.user.id).catch(() => {});
  const count = await DB.getTodayCravings(state.user?.id).catch(() => 0);
  document.getElementById('craving-count').textContent = count;
  showToast('Ты устоял! 💪');
}

// ─── REALTIME ─────────────────────────────────────────────────────────────────
function subscribeRealtime() {
  if (!state.user) return;
  DB.subscribeToSupport(state.user.id, payload => {
    state.supportMessages.unshift(payload.new);
    renderSupportBadge();
    showToast('Тебе написали поддержку 🤍');
  }).catch(() => {});

  DB.subscribeToFeed(payload => {
    loadFeed();
  }).catch(() => {});
}

// ─── TOAST ───────────────────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  document.getElementById('toasts').appendChild(el);
  setTimeout(() => el.classList.add('show'), 10);
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 3000);
}

function showLoading(show) {
  document.getElementById('loading-overlay').style.display = show ? 'flex' : 'none';
}

// ─── EXPOSE GLOBALS ──────────────────────────────────────────────────────────
window.navigate = navigate;
window.submitOnboard = submitOnboard;
window.pickAvatar = pickAvatar;
window.survivedCraving = survivedCraving;
window.sendChallenge = sendChallenge;
window.acceptChallenge = acceptChallenge;
window.sendSupportTo = sendSupportTo;
window.openSupportModal = openSupportModal;
window.submitSupport = submitSupport;
window.closeModal = closeModal;

// ─── BOOT ─────────────────────────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

document.addEventListener('DOMContentLoaded', () => navigate('loading'));
