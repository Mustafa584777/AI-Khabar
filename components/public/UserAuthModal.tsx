'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { supabase, supabaseUserToUserAccount } from '@/lib/supabase';
import { StorageService } from '@/lib/storage';
import confetti from 'canvas-confetti';
import {
  X,
  Sparkles,
  Mail,
  Lock,
  User,
  ArrowRight,
  Zap,
  Bookmark,
  History,
  CheckCircle,
  AlertCircle,
  KeyRound,
  ArrowLeft,
  Loader2,
} from 'lucide-react';

export const UserAuthModal = () => {
  const {
    isUserAuthModalOpen,
    setIsUserAuthModalOpen,
    authModalMessage,
    setUserAccount,
    showToast,
  } = useApp();

  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('signup');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [emailConfirmationSent, setEmailConfirmationSent] = useState(false);

  const popupRef = useRef<Window | null>(null);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isUserAuthModalOpen) {
      setErrorMessage(null);
      setSuccessMessage(null);
      setEmailConfirmationSent(false);
      setIsLoading(false);
    }
  }, [isUserAuthModalOpen]);

  // Listen for message from popup auth callback
  useEffect(() => {
    const handleAuthMessage = async (event: MessageEvent) => {
      if (typeof window === 'undefined') return;
      if (event.origin !== window.location.origin) return;

      if (event.data?.type === 'SUPABASE_AUTH_SUCCESS') {
        setIsLoading(false);
        setIsUserAuthModalOpen(false);

        // Fetch freshly stored Supabase session
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const existing = StorageService.getUserAccount();
            const account = supabaseUserToUserAccount(session.user, existing);
            setUserAccount(account);
            StorageService.saveUserAccount(account);
            showToast(`Welcome back, ${account.name}!`);
            confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
          }
        } catch (e) {
          console.error('Session sync error after OAuth:', e);
        }
      } else if (event.data?.type === 'SUPABASE_AUTH_FAILED') {
        setIsLoading(false);
        setErrorMessage(event.data.error || 'Google authentication was not completed.');
      }
    };

    window.addEventListener('message', handleAuthMessage);
    return () => window.removeEventListener('message', handleAuthMessage);
  }, [setIsUserAuthModalOpen, setUserAccount, showToast]);

  if (!isUserAuthModalOpen) return null;

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const redirectUrl = `${window.location.origin}/auth/callback`;

    // 1. Open popup synchronously to satisfy browser popup blockers
    const width = 520;
    const height = 650;
    const left = Math.max(0, window.screenX + (window.outerWidth - width) / 2);
    const top = Math.max(0, window.screenY + (window.outerHeight - height) / 2);

    let popup: Window | null = null;
    try {
      popup = window.open(
        'about:blank',
        'SupabaseGoogleAuth',
        `width=${width},height=${height},left=${left},top=${top},status=1,resizable=1`
      );
      popupRef.current = popup;
    } catch (e) {
      console.warn('Popup initialization failed:', e);
    }

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        if (popup && !popup.closed) popup.close();
        setErrorMessage(error.message);
        showToast(error.message);
        setIsLoading(false);
        return;
      }

      if (!data?.url) {
        if (popup && !popup.closed) popup.close();
        setErrorMessage('Unable to initialize Google Sign-In. Please check Supabase settings.');
        setIsLoading(false);
        return;
      }

      if (popup && !popup.closed) {
        popup.location.href = data.url;

        // Fallback polling for popup closure
        const checkClosed = setInterval(async () => {
          if (!popup || popup.closed) {
            clearInterval(checkClosed);
            setTimeout(async () => {
              const { data: { session } } = await supabase.auth.getSession();
              if (session?.user) {
                const existing = StorageService.getUserAccount();
                const account = supabaseUserToUserAccount(session.user, existing);
                setUserAccount(account);
                StorageService.saveUserAccount(account);
                showToast(`Welcome, ${account.name}!`);
                setIsUserAuthModalOpen(false);
              }
              setIsLoading(false);
            }, 800);
          }
        }, 1000);
      } else {
        // If popup was strictly blocked by user's browser, fall back to window redirect
        showToast('Redirecting to Google Sign-In...');
        window.location.href = data.url;
      }
    } catch (err: any) {
      if (popup && !popup.closed) popup.close();
      setErrorMessage(err.message || 'Google login failed');
      setIsLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address');
      return;
    }

    // 1. Password Reset Flow
    if (mode === 'forgot') {
      setIsLoading(true);
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
        });
        if (error) {
          setErrorMessage(error.message);
        } else {
          setSuccessMessage(`Password reset link sent to ${cleanEmail}. Please check your inbox.`);
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to send reset link');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'signup') {
        // 2. Real Supabase Sign Up Flow
        const defaultAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80';
        const displayName = fullName.trim() || cleanEmail.split('@')[0];

        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: password,
          options: {
            data: {
              full_name: displayName,
              avatar_url: defaultAvatar,
            },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (error) {
          setErrorMessage(error.message);
          setIsLoading(false);
          return;
        }

        // Check if user already exists in Supabase
        if (data?.user?.identities && data.user.identities.length === 0) {
          setErrorMessage('An account with this email already exists. Please sign in instead.');
          setMode('login');
          setIsLoading(false);
          return;
        }

        // If session is returned immediately (email confirmation disabled in Supabase)
        if (data?.session && data?.user) {
          const account = supabaseUserToUserAccount(data.user, null);
          setUserAccount(account);
          StorageService.saveUserAccount(account);
          showToast(`Welcome, ${account.name}! Your account has been created.`);
          confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
          setIsUserAuthModalOpen(false);
        } else {
          // Email confirmation is required by Supabase
          setEmailConfirmationSent(true);
        }
      } else {
        // 3. Real Supabase Sign In with Password Flow
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: password,
        });

        if (error) {
          if (error.message.toLowerCase().includes('email not confirmed')) {
            setErrorMessage('Your email has not been verified yet. Please check your inbox for the verification link.');
          } else if (error.message.toLowerCase().includes('invalid login credentials')) {
            setErrorMessage('Invalid email or password. Please check your details and try again.');
          } else {
            setErrorMessage(error.message);
          }
          setIsLoading(false);
          return;
        }

        if (data?.session && data?.user) {
          const existing = StorageService.getUserAccount();
          const account = supabaseUserToUserAccount(data.user, existing);
          setUserAccount(account);
          StorageService.saveUserAccount(account);
          showToast(`Welcome back, ${account.name}!`);
          setIsUserAuthModalOpen(false);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
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
            {mode === 'signup'
              ? 'Create Free Creator Account'
              : mode === 'login'
              ? 'Welcome Back'
              : 'Reset Your Password'}
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

        {/* Modal Content */}
        <div className="p-6 space-y-5">
          {/* Confirmation Email Sent Screen */}
          {emailConfirmationSent ? (
            <div className="py-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Check Your Inbox</h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 max-w-xs mx-auto">
                  We sent a confirmation link to <span className="font-bold text-neutral-900 dark:text-white">{email}</span>. Click the link to verify your account and sign in.
                </p>
              </div>
              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEmailConfirmationSent(false);
                    setMode('login');
                  }}
                  className="w-full py-2.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold hover:opacity-90 transition-opacity"
                >
                  Proceed to Sign In
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Google OAuth Login Button */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-100 text-xs sm:text-sm font-bold shadow-sm flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50"
                  id="google-signin-btn"
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

                <div className="flex items-center my-2">
                  <div className="flex-grow border-t border-neutral-200 dark:border-neutral-800"></div>
                  <span className="px-3 text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
                    or with email
                  </span>
                  <div className="flex-grow border-t border-neutral-200 dark:border-neutral-800"></div>
                </div>
              </div>

              {/* Mode Switcher Tabs */}
              {mode !== 'forgot' ? (
                <div className="grid grid-cols-2 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signup');
                      setErrorMessage(null);
                    }}
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
                    onClick={() => {
                      setMode('login');
                      setErrorMessage(null);
                    }}
                    className={`py-2 text-xs font-bold rounded-xl transition-all ${
                      mode === 'login'
                        ? 'bg-white dark:bg-neutral-900 text-[#E60023] shadow-sm'
                        : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    Sign In
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="flex items-center gap-1 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:text-[#E60023] transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Sign In</span>
                  </button>
                  <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                    Password Recovery
                  </span>
                </div>
              )}

              {/* Error Message Alert */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 flex items-start gap-2.5 text-xs text-red-600 dark:text-red-400">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="flex-1 leading-snug">{errorMessage}</div>
                </div>
              )}

              {/* Success Message Alert */}
              {successMessage && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 flex items-start gap-2.5 text-xs text-emerald-600 dark:text-emerald-400">
                  <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="flex-1 leading-snug">{successMessage}</div>
                </div>
              )}

              {/* Auth Form */}
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                {mode === 'signup' && (
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                      Full Name (Optional)
                    </label>
                    <div className="relative flex items-center">
                      <User className="w-4 h-4 text-neutral-400 absolute left-3.5 pointer-events-none" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-red-500 focus:outline-none text-neutral-900 dark:text-white"
                      />
                    </div>
                  </div>
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

                {mode !== 'forgot' && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
                        Password
                      </label>
                      {mode === 'login' && (
                        <button
                          type="button"
                          onClick={() => {
                            setMode('forgot');
                            setErrorMessage(null);
                            setSuccessMessage(null);
                          }}
                          className="text-[11px] font-semibold text-[#E60023] hover:underline"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="relative flex items-center">
                      <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 pointer-events-none" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="•••••••• (min 6 characters)"
                        minLength={6}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-red-500 focus:outline-none text-neutral-900 dark:text-white"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl bg-[#E60023] hover:bg-[#ad081b] text-white text-xs sm:text-sm font-bold shadow-md shadow-red-500/25 flex items-center justify-center gap-2 transition-all transform active:scale-95 disabled:opacity-50"
                  id="auth-submit-btn"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Authenticating with Supabase...</span>
                    </>
                  ) : mode === 'signup' ? (
                    <>
                      <span>Create Account &amp; Continue</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  ) : mode === 'login' ? (
                    <>
                      <span>Sign In to Account</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>Send Password Reset Link</span>
                    </>
                  )}
                </button>
              </form>

              <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 text-center">
                <span className="text-[10px] text-neutral-400 block">
                  Protected by Supabase Auth with Google OAuth &amp; SSL Encryption.
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
