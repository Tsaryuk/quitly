export default async function handler(req, res) {
  const { code, error } = req.query;
  if (error || !code) return res.redirect('/?error=auth_cancelled');

  const THREADS_APP_ID = process.env.THREADS_APP_ID || '2436234093477431';
  const THREADS_APP_SECRET = process.env.THREADS_APP_SECRET || 'e8d9877580fda1a76c0a224e6d14e1d4';
  const REDIRECT_URI = process.env.THREADS_REDIRECT_URI || 'https://quitly-sigma.vercel.app/api/auth/callback';

  try {
    // Exchange code for short-lived token
    const tokenRes = await fetch('https://graph.threads.net/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: THREADS_APP_ID,
        client_secret: THREADS_APP_SECRET,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI,
        code
      })
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) throw new Error(JSON.stringify(tokenData));

    // Get long-lived token
    const llRes = await fetch(
      `https://graph.threads.net/access_token?grant_type=th_exchange_token&client_secret=${THREADS_APP_SECRET}&access_token=${tokenData.access_token}`
    );
    const llData = await llRes.json();
    const token = llData.access_token || tokenData.access_token;

    // Get profile
    const profileRes = await fetch(
      `https://graph.threads.net/v1.0/me?fields=id,username,name,threads_profile_picture_url&access_token=${token}`
    );
    const profile = await profileRes.json();

    const params = new URLSearchParams({
      threads_user: '1',
      handle: '@' + (profile.username || 'user'),
      name: profile.name || profile.username || 'Пользователь',
      photo: profile.threads_profile_picture_url || '',
      token
    });
    res.redirect(`/?${params}`);
  } catch(e) {
    console.error('Auth error:', e);
    res.redirect('/?error=auth_failed');
  }
}
