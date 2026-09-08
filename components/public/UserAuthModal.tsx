'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import {
  X,
  Sparkles,
  Mail,
  Lock,
  User,
  ArrowRight,
  ShieldCheck,
  Zap,
  Bookmark,
  History,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export const UserAuthModal = () => {
  const {
    isUserAuthModalOpen,
    setIsUserAuthModalOpen,
    authModalMessage,
    loginUser,
    signupUser,
    showToast,
  } = useApp();

  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const defaultAvatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80';

  // Listen for callback messages from /auth/callback popup
  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SUPABASE_AUTH_SUCCESS') {
        const session = event.data.session;
        const u = event.data.user || session?.user;
        if (u) {
          const name = u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || 'Creator';
          const avatar = u.user_metadata?.avatar_url || u.user_metadata?.picture || defaultAvatar;
          loginUser(u.email || '', '', name, avatar);
          showToast(`Welcome back, ${name}! Signed in via Google.`);
          setIsLoading(false);
          setIsUserAuthModalOpen(false);
        }
      } else if (event.data?.type === 'SUPABASE_AUTH_FAILED') {
        setErrorMessage(event.data.error || 'Google sign-in could not be completed.');
        showToast(event.data.error || 'Google sign-in could not be completed.');
        setIsLoading(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [loginUser, showToast, setIsUserAuthModalOpen]);

  if (!isUserAuthModalOpen) return null;

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const origin = typeof window !== 'undefined'
        ? window.location.origin
        : 'https://geminipromptgenerator.online';
      const redirectUrl = `${origin}/auth/callback`;

      // Detect mobile device
      const isMobile =
        typeof navigator !== 'undefined' &&
        /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

      if (isMobile) {
        // Mobile browsers block popups aggressively: use direct browser redirect
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUrl,
            skipBrowserRedirect: false,
          },
        });
        if (error) {
          setErrorMessage(error.message);
          showToast(`Google Sign-In: ${error.message}`);
          setIsLoading(false);
        }
        return;
      }

      // Desktop: Attempt popup with direct fallback
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        console.warn('Supabase OAuth error:', error);
        setErrorMessage(error.message);
        showToast(`Google Sign-In: ${error.message}`);
        setIsLoading(false);
        return;
      }

      if (data?.url) {
        const width = 520;
        const height = 640;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;

        let popup: Window | null = null;
        try {
          popup = window.open(
            data.url,
            'SupabaseOAuth',
            `width=${width},height=${height},left=${left},top=${top},toolbar=0,scrollbars=1,status=1,resizable=1,location=1,menuBar=0`
          );
        } catch {
          popup = null;
        }

        // If popup was blocked by browser
        if (!popup || popup.closed || typeof popup.closed === 'undefined') {
          window.location.href = data.url;
          return;
        }

        // Check if popup closed
        const checkClosed = setInterval(() => {
          if (popup && popup.closed) {
            clearInterval(checkClosed);
            setTimeout(() => {
              setIsLoading(false);
            }, 1000);
          }
        }, 1000);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Google login failed');
      showToast(err.message || 'Google login failed');
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      showToast('Please enter a valid email address');
      return;
    }
    if (!password || password.length < 4) {
      showToast('Password must be at least 4 characters');
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'signup') {
        const userName = fullName.trim() || cleanEmail.split('@')[0];
        const userHandle = '@' + userName.toLowerCase().replace(/[^a-z0-9]/g, '');

        // 1. Create auto-confirmed account on Supabase via API route
        const signupRes = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: cleanEmail,
            password,
            name: userName,
            username: userHandle,
            avatar: defaultAvatar,
          }),
        });

        const signupData = await signupRes.json();

        if (!signupRes.ok && !signupData.success) {
          if (signupData.alreadyExists) {
            setMode('login');
            setErrorMessage('An account with this email already exists. Please enter your password to sign in.');
            setIsLoading(false);
            return;
          }
          throw new Error(signupData.error || 'Failed to create account');
        }

        // 2. Sign in to Supabase to establish client session
        const { data: signData, error: signError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (signError) {
          console.warn('Post-signup client sign-in notice:', signError.message);
        }

        // 3. Initialize account in App state (which triggers cloud sync)
        signupUser(userName, userHandle, cleanEmail, password, defaultAvatar);
        showToast(`Welcome ${userName}! Account created & cloud sync active.`);
        setIsLoading(false);
        setIsUserAuthModalOpen(false);
        setEmail('');
        setPassword('');
        setFullName('');
      } else {
        // Mode: LOGIN
        // 1. Attempt login with auto-confirm support via /api/auth/login
        const loginRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, password }),
        });

        const loginData = await loginRes.json();

        if (!loginRes.ok || !loginData.success) {
          throw new Error(loginData.error || 'Invalid email or password');
        }

        // 2. Set session on client Supabase instance if provided
        if (loginData.session) {
          await supabase.auth.setSession(loginData.session);
        }

        const userName = loginData.user?.user_metadata?.full_name || cleanEmail.split('@')[0];
        const userAvatar = loginData.user?.user_metadata?.avatar_url || defaultAvatar;

        loginUser(cleanEmail, password, userName, userAvatar);
        showToast(`Welcome back, ${userName}! Logged in successfully.`);
        setIsLoading(false);
        setIsUserAuthModalOpen(false);
        setEmail('');
        setPassword('');
      }
    } catch (err: any) {
      console.error('Auth submit error:', err);
      setErrorMessage(err.message || 'Authentication failed. Please check your details.');
      showToast(err.message || 'Authentication failed');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden"
        id="user-auth-modal"
      >
        {/* Header Ribbon */}
        <div className="p-6 bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950 text-white relative">
          <button
            onClick={() => setIsUserAuthModalOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-semibold mb-3 border border-red-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Cloud Synced Account</span>
          </div>

          <h3 className="text-xl font-bold tracking-tight">
            {mode === 'signup' ? 'Create Free Creator Account' : 'Welcome Back'}
          </h3>
          <p className="text-xs text-neutral-400 mt-1">
            {authModalMessage ||
              'Access your saved bookmarks, prompt generation history, and points across all devices & incognito tabs.'}
          </p>

          {/* Quick Perks */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-neutral-800 text-[11px] text-neutral-300">
            <div className="flex items-center gap-1">
              <Bookmark className="w-3 h-3 text-red-400" />
              <span>Cloud Saves</span>
            </div>
            <div className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" />
              <span>Free Points</span>
            </div>
            <div className="flex items-center gap-1">
              <History className="w-3 h-3 text-blue-400" />
              <span>AI History</span>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
              <div className="flex-1">
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Google OAuth Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-semibold text-sm transition-all shadow-sm active:scale-[0.99] disabled:opacity-60"
            id="google-signin-btn"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-neutral-500" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>Continue with Google</span>
          </button>

          <div className="flex items-center gap-3 my-2">
            <div className="h-px bg-neutral-200 dark:bg-neutral-800 flex-1" />
            <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold">
              Or with email
            </span>
            <div className="h-px bg-neutral-200 dark:bg-neutral-800 flex-1" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Alex River"
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@gmail.com"
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold text-sm shadow-lg shadow-red-500/25 transition-all flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-70 mt-2"
              id="submit-auth-btn"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{mode === 'signup' ? 'Creating Account & Syncing...' : 'Signing In...'}</span>
                </>
              ) : (
                <>
                  <span>{mode === 'signup' ? 'Create Account & Start' : 'Sign In to Account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Toggle Login/Signup */}
          <div className="pt-2 text-center text-xs text-neutral-500 dark:text-neutral-400">
            {mode === 'signup' ? (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMessage(null);
                  }}
                  className="text-red-600 dark:text-red-400 font-bold hover:underline"
                >
                  Sign In
                </button>
              </p>
            ) : (
              <p>
                Don&apos;t have an account yet?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setErrorMessage(null);
                  }}
                  className="text-red-600 dark:text-red-400 font-bold hover:underline"
                >
                  Create Free Account
                </button>
              </p>
            )}
          </div>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-neutral-400 pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Secure Supabase Authentication • 100% Free Forever</span>
          </div>
        </div>
      </div>
    </div>
  );
};
