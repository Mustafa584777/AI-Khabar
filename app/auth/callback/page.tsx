'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AuthCallbackPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    let isMounted = true;

    const completeAuth = async () => {
      try {
        // Check hash or search params for errors
        if (typeof window !== 'undefined') {
          const hash = window.location.hash;
          const searchParams = new URLSearchParams(window.location.search);

          if (hash && hash.includes('error=')) {
            const params = new URLSearchParams(hash.replace(/^#/, ''));
            const desc = params.get('error_description') || params.get('error') || 'OAuth error';
            throw new Error(desc);
          }

          if (searchParams.get('error')) {
            throw new Error(searchParams.get('error_description') || searchParams.get('error') || 'OAuth error');
          }
        }

        // Retrieve the authenticated session from Supabase
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        if (session?.user) {
          if (!isMounted) return;
          setStatus('success');

          // Notify parent window if opened via popup
          if (window.opener && !window.opener.closed) {
            try {
              window.opener.postMessage(
                {
                  type: 'GOOGLE_AUTH_SUCCESS',
                  user: {
                    id: session.user.id,
                    email: session.user.email,
                    name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Google User',
                    avatar: session.user.user_metadata?.avatar_url,
                  },
                },
                '*'
              );
            } catch (postErr) {
              console.warn('Could not postMessage to opener:', postErr);
            }

            setTimeout(() => {
              window.close();
            }, 500);
            return;
          }

          // If standard navigation without popup, redirect directly to dashboard
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 800);
        } else {
          // If no session found yet, wait for onAuthStateChange
          const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
            if (newSession?.user && isMounted) {
              setStatus('success');
              if (window.opener && !window.opener.closed) {
                try {
                  window.opener.postMessage(
                    {
                      type: 'GOOGLE_AUTH_SUCCESS',
                      user: {
                        id: newSession.user.id,
                        email: newSession.user.email,
                        name: newSession.user.user_metadata?.full_name || newSession.user.email?.split('@')[0] || 'Google User',
                        avatar: newSession.user.user_metadata?.avatar_url,
                      },
                    },
                    '*'
                  );
                } catch {
                  // ignore
                }
                setTimeout(() => window.close(), 500);
                return;
              }
              window.location.href = '/dashboard';
            }
          });

          // Timeout fallback
          setTimeout(() => {
            if (isMounted && status === 'loading') {
              // Redirect to dashboard anyway
              window.location.href = '/dashboard';
            }
          }, 2500);

          return () => {
            authListener.subscription.unsubscribe();
          };
        }
      } catch (err: any) {
        if (!isMounted) return;
        setStatus('error');
        setErrorMessage(err.message || 'Authentication could not be completed.');

        if (window.opener && !window.opener.closed) {
          try {
            window.opener.postMessage(
              {
                type: 'GOOGLE_AUTH_ERROR',
                message: err.message || 'Failed to authenticate',
              },
              '*'
            );
          } catch {
            // ignore
          }
        }
      }
    };

    completeAuth();

    return () => {
      isMounted = false;
    };
  }, [status]);

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-sm bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-8 shadow-2xl text-center space-y-4">
        {status === 'loading' && (
          <>
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-[#E60023] flex items-center justify-center mx-auto border border-red-500/20">
              <div className="w-6 h-6 border-3 border-[#E60023] border-t-transparent rounded-full animate-spin" />
            </div>
            <h2 className="text-lg font-black text-neutral-900 dark:text-white">
              Signing You In with Google...
            </h2>
            <p className="text-xs text-neutral-500">
              Connecting your account securely. This window will close automatically.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-500/20">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <h2 className="text-lg font-black text-neutral-900 dark:text-white">
              Welcome to Your Dashboard!
            </h2>
            <p className="text-xs text-neutral-500">
              Sign in verified successfully. Redirecting you now...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto border border-amber-500/20">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
            <h2 className="text-lg font-black text-neutral-900 dark:text-white">
              Sign In Notice
            </h2>
            <p className="text-xs text-neutral-500 leading-relaxed">
              {errorMessage || 'Google login was interrupted or closed.'}
            </p>
            <div className="pt-2">
              <a
                href="/dashboard"
                className="inline-block px-4 py-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold shadow-sm hover:opacity-90 transition-opacity"
              >
                Go to Dashboard
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
