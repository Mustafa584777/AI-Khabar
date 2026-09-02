'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import {
  X,
  Sparkles,
  Mail,
  Lock,
  User,
  ArrowRight,
  Bookmark,
  History,
  Zap,
} from 'lucide-react';
import { CARTOON_AVATARS } from '@/lib/avatar-constants';
import { supabase } from '@/lib/supabase';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          prompt: (notificationCallback?: (notification: any) => void) => void;
          renderButton: (parent: HTMLElement, options: any) => void;
          disableAutoSelect: () => void;
        };
        oauth2?: {
          initTokenClient: (config: any) => { requestAccessToken: () => void };
        };
      };
    };
  }
}

// Helper to decode Google JWT token securely on client
function parseGoogleJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export const UserAuthModal = () => {
  const {
    isUserAuthModalOpen,
    setIsUserAuthModalOpen,
    authModalMessage,
    loginUser,
    signupUser,
    loginWithGoogle,
    showToast,
  } = useApp();

  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const googleBtnContainerRef = useRef<HTMLDivElement>(null);

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

  // Listen for popup messages from OAuth callback
  useEffect(() => {
    const handleAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        const user = event.data.user;
        if (user) {
          loginWithGoogle({
            name: user.name || user.email?.split('@')[0],
            email: user.email,
            avatar: user.avatar || CARTOON_AVATARS[0].url,
          });
          showToast(`Welcome ${user.name || user.email}! Signed in with Google.`);
          setIsGoogleLoading(false);
          setIsUserAuthModalOpen(false);
        }
      } else if (event.data?.type === 'GOOGLE_AUTH_ERROR') {
        setIsGoogleLoading(false);
        showToast('Google sign-in was cancelled or failed.');
      }
    };

    window.addEventListener('message', handleAuthMessage);
    return () => window.removeEventListener('message', handleAuthMessage);
  }, [loginWithGoogle, showToast, setIsUserAuthModalOpen]);

  // Initialize Google Identity Services if client ID is present
  useEffect(() => {
    if (!isUserAuthModalOpen) return;

    if (typeof window !== 'undefined' && window.google?.accounts?.id && googleClientId) {
      try {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: (response: { credential?: string }) => {
            if (response.credential) {
              const payload = parseGoogleJwt(response.credential);
              if (payload && payload.email) {
                loginWithGoogle({
                  name: payload.name || payload.email.split('@')[0],
                  email: payload.email,
                  avatar: payload.picture || CARTOON_AVATARS[0].url,
                });
                showToast(`Signed in as ${payload.email}`);
                setIsUserAuthModalOpen(false);
              }
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        if (googleBtnContainerRef.current) {
          window.google.accounts.id.renderButton(googleBtnContainerRef.current, {
            theme: 'outline',
            size: 'large',
            width: '100%',
            text: 'continue_with',
            shape: 'pill',
          });
        }
      } catch (gErr) {
        console.warn('Google One Tap init note:', gErr);
      }
    }
  }, [isUserAuthModalOpen, googleClientId, loginWithGoogle, showToast, setIsUserAuthModalOpen]);

  if (!isUserAuthModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
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

    setTimeout(() => {
      const defaultAvatar = CARTOON_AVATARS[0].url;
      if (mode === 'signup') {
        const userName = name.trim() || email.split('@')[0];
        const userHandle = username.trim()
          ? username.startsWith('@')
            ? username
            : '@' + username
          : '@' + userName.toLowerCase().replace(/[^a-z0-9]/g, '');
        signupUser(userName, userHandle, email, password, defaultAvatar);
        showToast(`Welcome ${userName}! Account created successfully.`);
      } else {
        loginUser(email, password, username, defaultAvatar);
        showToast('Welcome back! You are now logged in.');
      }
      setIsLoading(false);
      setIsUserAuthModalOpen(false);
      setName('');
      setUsername('');
      setEmail('');
      setPassword('');
    }, 400);
  };

  const handleGoogleSignInClick = async () => {
    setIsGoogleLoading(true);

    // 1. If Google Identity Services (One Tap) is loaded, prompt account selector
    if (typeof window !== 'undefined' && window.google?.accounts?.id && googleClientId) {
      try {
        window.google.accounts.id.prompt();
      } catch {}
    }

    // 2. Open official Google OAuth account selection popup window
    try {
      // If Supabase OAuth is configured with Google provider
      const callbackUrl = `${window.location.origin}/auth/callback`;
      
      let oauthUrl = '';
      if (googleClientId) {
        // Direct Google OAuth authorization endpoint with account chooser prompt
        const params = new URLSearchParams({
          client_id: googleClientId,
          redirect_uri: callbackUrl,
          response_type: 'token id_token',
          scope: 'email profile openid',
          prompt: 'select_account',
          nonce: Math.random().toString(36).substring(2),
        });
        oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
      } else {
        // Supabase Google OAuth endpoint with prompt=select_account
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: callbackUrl,
            queryParams: {
              prompt: 'select_account',
              access_type: 'offline',
            },
            skipBrowserRedirect: true,
          },
        });

        if (data?.url) {
          oauthUrl = data.url;
        } else if (error) {
          console.warn('Supabase OAuth notice:', error.message);
        }
      }

      if (oauthUrl) {
        const width = 500;
        const height = 650;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;

        const popup = window.open(
          oauthUrl,
          'google_signin_popup',
          `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,location=no,status=no`
        );

        if (!popup) {
          showToast('Please allow popups to sign in with your Google account.');
          setIsGoogleLoading(false);
        }
      } else {
        // Direct fallback: prompt Google One Tap
        if (typeof window !== 'undefined' && window.google?.accounts?.id) {
          window.google.accounts.id.prompt();
        } else {
          showToast('Connecting to Google sign-in service...');
        }
        setTimeout(() => setIsGoogleLoading(false), 2000);
      }
    } catch (err) {
      console.error('Google Sign-in popup error:', err);
      setIsGoogleLoading(false);
      showToast('Could not open Google sign-in window.');
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
            onClick={() => {
              setIsUserAuthModalOpen(false);
              setIsGoogleLoading(false);
            }}
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
              Creator Account
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
            <span>Requested Prompts</span>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          {/* Official Google Sign In Button */}
          <div className="space-y-3">
            <div ref={googleBtnContainerRef} className="w-full">
              <button
                type="button"
                onClick={handleGoogleSignInClick}
                disabled={isGoogleLoading || isLoading}
                className="w-full py-3 px-4 rounded-2xl bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700/80 text-neutral-800 dark:text-neutral-100 text-xs sm:text-sm font-bold border border-neutral-300 dark:border-neutral-700 shadow-xs flex items-center justify-center gap-3 transition-all transform active:scale-95 disabled:opacity-50 cursor-pointer"
                id="google-signin-btn"
              >
                {isGoogleLoading ? (
                  <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
                <span>{isGoogleLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                or with email
              </span>
              <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
            </div>
          </div>

          {/* Mode Switcher Pills */}
          <div className="grid grid-cols-2 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-2xl">
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                mode === 'signup'
                  ? 'bg-white dark:bg-neutral-900 text-[#E60023] shadow-xs'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              Create Account
            </button>
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-white dark:bg-neutral-900 text-[#E60023] shadow-xs'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              Sign In with Email
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Your Full Name
                  </label>
                  <div className="relative flex items-center">
                    <User className="w-4 h-4 text-neutral-400 absolute left-3.5 pointer-events-none" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-red-500 focus:outline-none text-neutral-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Unique Username / Handle (@)
                  </label>
                  <div className="relative flex items-center">
                    <span className="text-xs font-bold text-neutral-400 absolute left-3.5">@</span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="rahul_ai"
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-red-500 focus:outline-none text-neutral-900 dark:text-white"
                    />
                  </div>
                </div>
              </>
            )}

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
              className="w-full py-3 rounded-xl bg-[#E60023] hover:bg-[#ad081b] text-white text-xs sm:text-sm font-bold shadow-md shadow-red-500/25 flex items-center justify-center gap-2 transition-all transform active:scale-95 disabled:opacity-50 cursor-pointer"
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
        </div>
      </div>
    </div>
  );
};
