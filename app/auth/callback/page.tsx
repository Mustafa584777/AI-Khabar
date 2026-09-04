'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
  useEffect(() => {
    // Process OAuth callback from Google / Supabase
    async function processAuth() {
      try {
        // 1. Check URL hash or query params
        const hash = window.location.hash.substring(1);
        const search = window.location.search.substring(1);
        const params = new URLSearchParams(hash || search);

        // Check if token or error is present
        const accessToken = params.get('access_token');
        const idToken = params.get('id_token');

        // Check Supabase session
        const { data: { session } } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));

        let email = session?.user?.email || params.get('email');
        let name = session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name || params.get('name');
        let avatar = session?.user?.user_metadata?.avatar_url || session?.user?.user_metadata?.picture || params.get('avatar');

        // If access token was returned directly, fetch userinfo from Google
        if (accessToken && !email) {
          try {
            const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (res.ok) {
              const userInfo = await res.json();
              email = userInfo.email;
              name = userInfo.name || userInfo.email?.split('@')[0];
              avatar = userInfo.picture;
            }
          } catch (fetchErr) {
            console.warn('UserInfo fetch error:', fetchErr);
          }
        }

        // Post message to opener window
        if (window.opener) {
          window.opener.postMessage(
            {
              type: 'GOOGLE_AUTH_SUCCESS',
              user: {
                name: name || (email ? email.split('@')[0] : 'Creator'),
                email: email || 'creator@gmail.com',
                avatar: avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
              },
            },
            '*'
          );
          setTimeout(() => {
            window.close();
          }, 300);
        } else {
          // If not in popup, redirect home
          window.location.href = '/';
        }
      } catch (err) {
        console.error('Callback error:', err);
        if (window.opener) {
          window.opener.postMessage({ type: 'GOOGLE_AUTH_ERROR', error: String(err) }, '*');
          window.close();
        } else {
          window.location.href = '/';
        }
      }
    }

    processAuth();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 p-6 text-center">
      <div className="w-12 h-12 rounded-full border-4 border-red-600 border-t-transparent animate-spin mb-4" />
      <h2 className="text-lg font-bold">Connecting your Google Account...</h2>
      <p className="text-xs text-neutral-500 mt-1">This window will close automatically.</p>
    </div>
  );
}
