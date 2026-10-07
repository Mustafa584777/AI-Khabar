import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
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
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner"></div>
    <h2>Authenticating</h2>
    <p>Please wait while we log you in...</p>
  </div>
  <script>
    if (window.opener) {
      window.opener.postMessage({ type: 'FIREBASE_AUTH_SUCCESS' }, window.location.origin);
      setTimeout(function() { window.close(); }, 500);
    } else {
      window.location.href = '/';
    }
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
