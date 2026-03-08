// ─── SUPABASE CLIENT ───
// Replace with your values from supabase.com → Settings → API
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_KEY = 'YOUR_ANON_KEY';

const sb = {
  headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },

  async upsertSession(user, startTime) {
    return fetch(`${SUPABASE_URL}/rest/v1/quit_sessions`, {
      method: 'POST',
      headers: { ...this.headers, 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify({
        threads_handle: user.handle || user.name,
        avatar: user.avatar,
        display_name: user.name,
        started_at: startTime,
        is_threads_user: user.threads || false,
        cigs_per_day: user.cigs,
        price_per_pack: user.price
      })
    });
  },

  async getFeed(limit = 20) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/quit_sessions?select=*&order=started_at.desc&limit=${limit}&is_active=eq.true`,
      { headers: this.headers }
    );
    return res.ok ? res.json() : [];
  },

  async recordRelapse(sessionId) {
    return fetch(`${SUPABASE_URL}/rest/v1/quit_sessions?id=eq.${sessionId}`, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify({ is_active: false, relapsed_at: new Date().toISOString() })
    });
  },

  async subscribeToFeed(callback) {
    // Supabase Realtime — works when you enable it in dashboard
    const ws = new WebSocket(
      `${SUPABASE_URL.replace('https','wss')}/realtime/v1/websocket?apikey=${SUPABASE_KEY}&vsn=1.0.0`
    );
    ws.onopen = () => ws.send(JSON.stringify({
      topic: 'realtime:public:quit_sessions',
      event: 'phx_join',
      payload: {},
      ref: null
    }));
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.event === 'INSERT' || msg.event === 'UPDATE') callback(msg.payload.record);
    };
    return ws;
  }
};
