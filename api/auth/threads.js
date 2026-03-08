// Vercel Serverless Function — /api/auth/threads
// Redirects user to Threads OAuth screen
export default function handler(req, res) {
  const THREADS_APP_ID = process.env.THREADS_APP_ID;
  const REDIRECT_URI = process.env.THREADS_REDIRECT_URI || `https://${req.headers.host}/api/auth/callback`;
  const SCOPE = 'threads_basic,threads_content_publish';

  const url = new URL('https://threads.net/oauth/authorize');
  url.searchParams.set('client_id', THREADS_APP_ID);
  url.searchParams.set('redirect_uri', REDIRECT_URI);
  url.searchParams.set('scope', SCOPE);
  url.searchParams.set('response_type', 'code');

  res.redirect(url.toString());
}
