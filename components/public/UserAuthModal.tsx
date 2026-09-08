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
  const [isLoading, setIsLoading] = useState(false);

  const defaultAvatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80';

  // Listen for callback messages from /auth/callback popup
  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        const u = event.data.user;
        if (u) {
          loginUser(u.email || 'user@gmail.com', '', u.name || 'Google Creator', u.avatar);
          showToast(`Welcome ${u.name || 'Creator'}! Logged in with Google.`);
          setIsLoading(false);
          setIsUserAuthModalOpen(false);
        }
      } else if (event.data?.type === 'GOOGLE_AUTH_ERROR') {
        showToast(event.data.message || 'Google sign-in could not be completed.');
        setIsLoading(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [loginUser, showToast, setIsUserAuthModalOpen]);

  if (!isUserAuthModalOpen) return null;

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      // Use standard Supabase OAuth without skipBrowserRedirect to avoid popup blocked issues
      // and redirect URI issues if the current origin isn't whitelisted. 
      // If we are on localhost, we can specify redirectTo. Otherwise let Supabase use default.
      const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost';
      const redirectUrl = isLocal 
        ? `${window.location.origin}/auth/callback` 
        : 'https://geminipromptgenerator.online/auth/callback';

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          // Using standard redirect flow instead of popup to avoid "requested path is invalid" 
          // or popup blockers. This will navigate the main window.
        },
      });

      if (error) {
        console.warn('Supabase OAuth error:', error);
        showToast(`Google Sign-In: ${error.message}`);
        setIsLoading(false);
        return;
      }
      // If it doesn't automatically redirect (e.g. if we still used skipBrowserRedirect), do it manually:
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      showToast(err.message || 'Google login failed');
      setIsLoading(false);
    }
  };

  const handleInstantGoogleDemo = () => {
    // Local mock for instant demo
    const demoGoogleUser = {
      name: 'Google Creator',
      email: 'creator.studio@gmail.com',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
    };
    loginUser(demoGoogleUser.email, '', demoGoogleUser.name, demoGoogleUser.avatar);
    showToast(`Welcome ${demoGoogleUser.name}! Signed in with Google account.`);
    setIsUserAuthModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
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
        const userName = email.split('@')[0];
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: userName,
            },
          },
        });

        if (error) throw error;
        
        showToast(`Welcome ${userName}! Account created successfully.`);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        
        showToast('Welcome back! You are now logged in.');
      }
      setIsLoading(false);
      setIsUserAuthModalOpen(false);
      setEmail('');
      setPassword('');
    } catch (err: any) {
      console.error('Auth error:', err);
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

          <div className="flex items-center gap-2 mb-2">
            <span className="w-8 h-8 rounded-full bg-[#E60023] flex items-center justify-center text-white shadow-md shadow-red-500/30">
              <Sparkles className="w-4 h-4" />
            </span>
            <span className="text-xs font-black uppercase tracking-widest text-red-400">
              Creative Account
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            {mode === 'signup' ? 'Create Free Creator Account' : 'Welcome Back'}
          </h2>
          <p className="text-xs text-neutral-300 mt-1">
            {authModalMessage ||
              'Save your reverse-engineered prompts, generated artwork & bookmarks across all devices.'}
          </p>
        </div>

        {/* Benefits Checklist */}
        <div className="px-6 py-3 bg-red-50/50 dark:bg-red-950/20 border-b border-red-100 dark:border-red-950/40 grid grid-cols-3 gap-2 text-[10px] sm:text-[11px] font-bold text-neutral-700 dark:text-neutral-300">
          <div className="flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-[#E60023] shrink-0" />
            <span>Save AI History</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Bookmark className="w-3.5 h-3.5 text-[#E60023] shrink-0" />
            <span>Sync Saved Pins</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-[#E60023] shrink-0" />
            <span>AI Personalization</span>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5">
          {/* Google OAuth Login Button */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-100 text-xs sm:text-sm font-bold shadow-sm flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.19v3.15C3.17 21.36 7.22 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.19C.43 8.1 0 9.99 0 12s.43 3.9 1.19 5.42l4.09-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.22 0 3.17 2.64 1.19 6.58l4.09 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Continue with Google (Gmail)</span>
            </button>

            <div className="flex items-center justify-between px-1 text-[11px] text-neutral-500">
              <span>Having trouble with popups?</span>
              <button
                type="button"
                onClick={handleInstantGoogleDemo}
                className="text-[#E60023] hover:underline font-bold"
              >
                1-Click Instant Sign-In
              </button>
            </div>

            <div className="flex items-center my-2">
              <div className="flex-grow border-t border-neutral-200 dark:border-neutral-800"></div>
              <span className="px-3 text-[10px] text-neutral-400 uppercase tracking-wider">or with email</span>
              <div className="flex-grow border-t border-neutral-200 dark:border-neutral-800"></div>
            </div>
          </div>

          {/* Mode Switcher Pills */}
          <div className="grid grid-cols-2 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-2xl">
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`py-2 text-xs font-bold rounded-xl transition-all ${
                mode === 'signup'
                  ? 'bg-white dark:bg-neutral-900 text-[#E60023] shadow-sm'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              Create Account
            </button>
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`py-2 text-xs font-bold rounded-xl transition-all ${
                mode === 'login'
                  ? 'bg-white dark:bg-neutral-900 text-[#E60023] shadow-sm'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              Sign In
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Email Address
              </label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-red-500 focus:outline-none text-neutral-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Password
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-red-500 focus:outline-none text-neutral-900 dark:text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-[#E60023] hover:bg-[#ad081b] text-white text-xs sm:text-sm font-bold shadow-md shadow-red-500/25 flex items-center justify-center gap-2 transition-all transform active:scale-95 disabled:opacity-50"
            >
              {isLoading ? (
                <span>Processing...</span>
              ) : (
                <>
                  <span>{mode === 'signup' ? 'Create Account & Continue' : 'Sign In'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick 1-Click Access Removed */}
          <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 text-center">
            <span className="text-[10px] text-neutral-400 block mt-2">
              Free forever. No credit card required.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
