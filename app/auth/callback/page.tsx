'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Sparkles, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    let isMounted = true;

    async function handleAuthCallback() {
      try {
        // 1. Check for error in search params or hash
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));

        const error = urlParams.get('error') || hashParams.get('error');
        const errorDesc =
          urlParams.get('error_description') || hashParams.get('error_description');

        if (error || errorDesc) {
          const msg = errorDesc || error || 'Authentication failed. Please try again.';
          if (isMounted) {
            setStatus('error');
            setErrorMessage(decodeURIComponent(msg.replace(/\+/g, ' ')));
          }
          return;
        }

        // 2. Check if a PKCE code was provided
        const code = urlParams.get('code');
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.error('Error exchanging code for session:', exchangeError);
            if (isMounted) {
              setStatus('error');
              setErrorMessage(exchangeError.message);
            }
            return;
          }
        }

        // 3. Confirm active session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          throw sessionError;
        }

        if (isMounted) {
          setStatus('success');
        }

        // 4. If opened inside a popup window, inform opener and close
        if (window.opener && window.opener !== window) {
          try {
            window.opener.postMessage(
              {
                type: 'SUPABASE_AUTH_SUCCESS',
                user: session?.user || null,
              },
              '*'
            );
          } catch (e) {
            console.warn('Could not postMessage to opener:', e);
          }

          setTimeout(() => {
            window.close();
          }, 600);
        } else {
          // 5. Standalone window: redirect to home
          setTimeout(() => {
            router.replace('/');
          }, 800);
        }
      } catch (err: unknown) {
        console.error('Callback error:', err);
        if (isMounted) {
          setStatus('error');
          setErrorMessage(err instanceof Error ? err.message : 'Authentication failed.');
        }
      }
    }

    void handleAuthCallback();

    return () => {
      isMounted = false;
    };
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white dark:bg-neutral-900 rounded-3xl p-8 shadow-xl border border-neutral-200 dark:border-neutral-800 text-center space-y-4">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-[#E60023] flex items-center justify-center text-white shadow-lg shadow-red-500/30">
          <Sparkles className="w-6 h-6" />
        </div>

        {status === 'loading' && (
          <div className="space-y-3">
            <div className="flex justify-center">
              <Loader2 className="w-8 h-8 text-[#E60023] animate-spin" />
            </div>
            <h2 className="text-lg font-black text-neutral-900 dark:text-white">
              Completing Authentication
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Verifying your Supabase credentials, please wait a moment...
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-3">
            <div className="flex justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 animate-bounce" />
            </div>
            <h2 className="text-lg font-black text-neutral-900 dark:text-white">
              Successfully Authenticated!
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Welcome back! Redirecting you to your creative dashboard...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-lg font-black text-neutral-900 dark:text-white">
              Authentication Error
            </h2>
            <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 p-3 rounded-xl border border-red-200 dark:border-red-900/50">
              {errorMessage || 'Something went wrong while completing sign in.'}
            </p>
            <button
              onClick={() => {
                if (window.opener) {
                  window.close();
                } else {
                  router.replace('/');
                }
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold transition-all"
            >
              Return to tool.reelz
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
