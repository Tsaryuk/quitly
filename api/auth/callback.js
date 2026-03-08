// Vercel Serverless Function — /api/auth/callback
// Exchanges code for token, returns user data to frontend
export default async function handler(req, res) {
  const { code } = req.query;
  if (!code) return res.status(400).json({ error: 'No code' });

  const THREADS_APP_ID = process.env.THREADS_APP_ID;
  const THREADS_APP_SECRET = process.env.THREADS_APP_SECRET;
  const REDIRECT_URI = process.env.THREADS_REDIRECT_URI || `https://${req.headers.host}/api/auth/callback`;

  try {
    // Exchange code for token
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
    const { access_token } = await tokenRes.json();

    // Get user profile
    const profileRes = await fetch(
      `https://graph.threads.net/v1.0/me?fields=id,username,name,threads_profile_picture_url&access_token=${access_token}`
    );
    const profile = await profileRes.json();

    // Redirect back to app with user data
    const params = new URLSearchParams({
      threads_user: '1',
      handle: '@' + profile.username,
      name: profile.name || profile.username,
      token: access_token
    });
    res.redirect(`/?${params}`);
  } catch (e) {
    res.redirect('/?error=auth_failed');
  }
}
