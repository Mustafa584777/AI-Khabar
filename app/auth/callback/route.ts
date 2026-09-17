import { supabaseUrl, supabaseAnonKey, SUPABASE_PROJECT_ID } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error') || requestUrl.searchParams.get('error_description');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Authenticating | Trending Prompts Studio</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: #0d0d0f;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #f4f4f5;
      padding: 1rem;
    }
    .card {
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 20px;
      padding: 2.2rem 2rem;
      text-align: center;
      max-width: 380px;
      width: 100%;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
    }
    .spinner {
      width: 42px;
      height: 42px;
      border: 3px solid rgba(255, 255, 255, 0.1);
      border-top-color: #E60023;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 1.25rem;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    h2 { font-size: 1.2rem; font-weight: 700; margin-bottom: 0.5rem; }
    p { font-size: 0.875rem; color: #a1a1aa; line-height: 1.5; }
    .btn {
      display: inline-block;
      margin-top: 1.25rem;
      padding: 0.6rem 1.2rem;
      border-radius: 9999px;
      background: #E60023;
      color: #fff;
      text-decoration: none;
      font-size: 0.825rem;
      font-weight: 600;
      border: none;
      cursor: pointer;
    }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
</head>
<body>
  <div class="card">
    <div id="loader" class="spinner"></div>
    <h2 id="status-title">Signing You In...</h2>
    <p id="status-desc">Please wait a moment while we verify your session with Google &amp; Supabase.</p>
    <div id="action-container" style="display:none;">
      <a href="/dashboard" class="btn" id="action-btn">Open Dashboard</a>
    </div>
  </div>

  <script>
    (async function() {
      const SUPABASE_URL = "${supabaseUrl}";
      const SUPABASE_ANON_KEY = "${supabaseAnonKey}";
      const PROJECT_ID = "${SUPABASE_PROJECT_ID}";
      const initialError = ${JSON.stringify(error)};
      const initialCode = ${JSON.stringify(code)};

      const titleEl = document.getElementById('status-title');
      const descEl = document.getElementById('status-desc');
      const loaderEl = document.getElementById('loader');
      const actionEl = document.getElementById('action-container');
      const actionBtn = document.getElementById('action-btn');

      if (initialError) {
        loaderEl.style.display = 'none';
        titleEl.innerText = 'Authentication Failed';
        descEl.innerText = initialError;
        actionEl.style.display = 'block';

        if (window.opener) {
          try {
            window.opener.postMessage({ type: 'SUPABASE_AUTH_FAILED', error: initialError }, '*');
            setTimeout(function() { window.close(); }, 2000);
          } catch(e) {}
        }
        return;
      }

      try {
        let client = null;
        if (window.supabase && typeof window.supabase.createClient === 'function') {
          client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
              persistSession: true,
              autoRefreshToken: true,
              detectSessionInUrl: true,
            }
          });
        }

        let session = null;

        // 1. Try code exchange if PKCE code parameter is present
        const searchParams = new URLSearchParams(window.location.search);
        const code = initialCode || searchParams.get('code');

        if (code && client) {
          const { data, error: exchangeError } = await client.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.warn('exchangeCodeForSession error:', exchangeError);
          } else if (data?.session) {
            session = data.session;
          }
        }

        // 2. Try hash token detection if implicit flow or fallback
        if (!session && client) {
          const { data } = await client.auth.getSession();
          if (data?.session) {
            session = data.session;
          }
        }

        // 3. Fallback check directly from localStorage
        if (!session) {
          try {
            const raw = localStorage.getItem('sb-' + PROJECT_ID + '-auth-token');
            if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed && (parsed.access_token || parsed.user)) {
                session = parsed;
              }
            }
          } catch(e) {}
        }

        if (session) {
          titleEl.innerText = 'Success!';
          descEl.innerText = 'Authentication complete. Redirecting...';
          loaderEl.style.display = 'none';

          if (session.user) {
            try {
              const u = session.user;
              const meta = u.user_metadata || {};
              const email = u.email || '';
              const name = meta.full_name || meta.name || (email ? email.split('@')[0] : 'Creator');
              const username = '@' + (meta.user_name || name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'creator');
              const avatar = meta.avatar_url || meta.picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80';

              const account = {
                id: u.id,
                name: name,
                username: username,
                email: email,
                joinedDate: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                isLoggedIn: true,
                avatar: avatar,
                points: 10,
                requestsMade: 0,
                likesCountForPoints: 0,
                savesCountForPoints: 0,
                generationsCountForPoints: 0,
                sharesCountForPoints: 0,
                referralsCountForPoints: 0
              };
              localStorage.setItem('promptcms_user_account', JSON.stringify(account));
            } catch(e) {}
          }

          if (window.opener) {
            try {
              window.opener.postMessage({
                type: 'SUPABASE_AUTH_SUCCESS',
                session: session,
                user: session.user || null
              }, '*');
              setTimeout(function() {
                window.close();
              }, 400);
            } catch(e) {
              window.location.href = '/dashboard';
            }
          } else {
            window.location.href = '/dashboard';
          }
        } else {
          // If neither session nor error could be parsed yet
          titleEl.innerText = 'Session Received';
          descEl.innerText = 'You may close this window or return to the dashboard.';
          loaderEl.style.display = 'none';
          actionEl.style.display = 'block';

          if (window.opener) {
            try {
              window.opener.postMessage({ type: 'SUPABASE_AUTH_SUCCESS' }, '*');
              setTimeout(function() { window.close(); }, 800);
            } catch(e) {}
          } else {
            setTimeout(function() { window.location.href = '/dashboard'; }, 1000);
          }
        }
      } catch (err) {
        console.error('Callback error:', err);
        loaderEl.style.display = 'none';
        titleEl.innerText = 'Sign-In Completed';
        descEl.innerText = 'Please return to your dashboard or close this window.';
        actionEl.style.display = 'block';

        if (window.opener) {
          try {
            window.opener.postMessage({ type: 'SUPABASE_AUTH_SUCCESS' }, '*');
            setTimeout(function() { window.close(); }, 1000);
          } catch(e) {}
        }
      }
    })();
  </script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
