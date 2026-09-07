'use client';

import React, { useState } from 'react';
import Image from 'next/image';
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
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  KeyRound,
  ArrowLeft,
} from 'lucide-react';
import { CARTOON_AVATARS } from '@/lib/avatar-constants';

export const UserAuthModal = () => {
  const {
    isUserAuthModalOpen,
    setIsUserAuthModalOpen,
    authModalMessage,
    loginUser,
    signupUser,
    loginWithGoogle,
    resetPasswordForEmail,
    resendConfirmationEmail,
    showToast,
  } = useApp();

  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'verify-email'>('signup');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(CARTOON_AVATARS[0].url);

  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccessMessage, setAuthSuccessMessage] = useState<string | null>(null);

  if (!isUserAuthModalOpen) return null;

  const resetForm = () => {
    setName('');
    setUsername('');
    setEmail('');
    setPassword('');
    setAuthError(null);
    setAuthSuccessMessage(null);
    setIsLoading(false);
    setIsGoogleLoading(false);
  };

  const handleClose = () => {
    setIsUserAuthModalOpen(false);
    resetForm();
    setMode('signup');
  };

  // Google OAuth via Supabase
  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setIsGoogleLoading(true);
    try {
      const res = await loginWithGoogle();
      if (!res.success && res.error) {
        setAuthError(res.error);
      } else {
        // Modal will close automatically when session is set or popup completes
        setTimeout(() => {
          setIsUserAuthModalOpen(false);
        }, 1200);
      }
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Google Sign-In failed');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Email & Password Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccessMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setAuthError('Please enter a valid email address');
      return;
    }

    if (mode === 'forgot') {
      setIsLoading(true);
      try {
        const res = await resetPasswordForEmail(cleanEmail);
        if (res.success) {
          setAuthSuccessMessage(
            `Password reset link has been sent to ${cleanEmail}. Please check your inbox and spam folder.`
          );
        } else {
          setAuthError(res.error || 'Failed to send password reset email.');
        }
      } catch (err: unknown) {
        setAuthError(err instanceof Error ? err.message : 'Error sending password reset email');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!password || password.length < 6) {
      setAuthError('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'signup') {
        const userName = name.trim() || cleanEmail.split('@')[0];
        const userHandle = username.trim()
          ? username.startsWith('@')
            ? username
            : '@' + username
          : '@' + userName.toLowerCase().replace(/[^a-z0-9]/g, '');

        const res = await signupUser(userName, userHandle, cleanEmail, password, selectedAvatar);

        if (!res.success) {
          setAuthError(res.error || 'Signup failed. Please try again.');
        } else if (res.requiresEmailConfirmation) {
          // Supabase project requires email confirmation
          setMode('verify-email');
        } else {
          // Direct login successful
          resetForm();
          setIsUserAuthModalOpen(false);
        }
      } else {
        // Mode === 'login'
        const res = await loginUser(cleanEmail, password);
        if (!res.success) {
          setAuthError(res.error || 'Invalid email or password.');
        } else {
          resetForm();
          setIsUserAuthModalOpen(false);
        }
      }
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Resend verification link
  const handleResendConfirmation = async () => {
    if (!email || !email.includes('@')) {
      showToast('Please enter your email above to resend verification');
      return;
    }
    setIsResending(true);
    setAuthError(null);
    try {
      const res = await resendConfirmationEmail(email);
      if (res.success) {
        setAuthSuccessMessage(`Verification email resent to ${email}!`);
        showToast('Verification email resent!');
      } else {
        setAuthError(res.error || 'Failed to resend confirmation email.');
      }
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Failed to resend confirmation email');
    } finally {
      setIsResending(false);
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
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white transition-colors"
            title="Close"
            id="auth-modal-close-btn"
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
            {mode === 'signup' && 'Create Free Creator Account'}
            {mode === 'login' && 'Welcome Back'}
            {mode === 'forgot' && 'Reset Your Password'}
            {mode === 'verify-email' && 'Verify Your Email'}
          </h2>
          <p className="text-xs text-neutral-300 mt-1">
            {mode === 'verify-email'
              ? 'Please confirm your email address to activate your account.'
              : mode === 'forgot'
              ? 'Enter your account email to receive a password recovery link.'
              : authModalMessage ||
                'Save your reverse-engineered prompts, generated artwork & bookmarks across all devices.'}
          </p>
        </div>

        {/* Benefits Checklist (only on login/signup modes) */}
        {(mode === 'signup' || mode === 'login') && (
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
              <span>Request Prompts</span>
            </div>
          </div>
        )}

        {/* Body Container */}
        <div className="p-6 space-y-4">
          {/* Error Banner */}
          {authError && (
            <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs font-semibold flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <div className="flex-1">
                <p>{authError}</p>
                {authError.toLowerCase().includes('confirm') && (
                  <button
                    type="button"
                    onClick={handleResendConfirmation}
                    disabled={isResending}
                    className="mt-2 text-[11px] font-bold underline text-[#E60023] hover:text-[#ad081b] flex items-center gap-1"
                  >
                    {isResending && <RefreshCw className="w-3 h-3 animate-spin" />}
                    <span>Resend verification email to {email || 'your email'}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Success Banner */}
          {authSuccessMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-start gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
              <p className="flex-1">{authSuccessMessage}</p>
            </div>
          )}

          {/* MODE: VERIFY EMAIL SCREEN */}
          {mode === 'verify-email' && (
            <div className="space-y-4 py-2 text-center">
              <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/50 mx-auto flex items-center justify-center text-[#E60023]">
                <Mail className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  Check your inbox!
                </h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                  We&apos;ve sent a verification link to{' '}
                  <span className="font-bold text-neutral-900 dark:text-white">{email}</span>.
                  Click the link inside to activate your account.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-neutral-100 dark:bg-neutral-800/60 text-[11px] text-neutral-500 dark:text-neutral-400">
                Tip: Check your spam or promotions folder if you don&apos;t see the email within 1
                minute.
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleResendConfirmation}
                  disabled={isResending}
                  className="w-full py-2.5 px-4 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold transition-all flex items-center justify-center gap-2"
                >
                  {isResending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Resending...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Resend Verification Email</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAuthError(null);
                    setAuthSuccessMessage(null);
                    setMode('login');
                  }}
                  className="w-full py-2 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                >
                  Already verified? Click here to Sign In
                </button>
              </div>
            </div>
          )}

          {/* MODE: FORGOT PASSWORD */}
          {mode === 'forgot' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  Your Account Email
                </label>
                <div className="relative flex items-center">
                  <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setAuthError(null);
                    }}
                    placeholder="name@example.com"
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
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending Reset Link...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Send Password Reset Link</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthError(null);
                  setAuthSuccessMessage(null);
                  setMode('login');
                }}
                className="w-full py-2 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </button>
            </form>
          )}

          {/* MODES: LOGIN / SIGNUP */}
          {(mode === 'signup' || mode === 'login') && (
            <>
              {/* Google Sign In Option (Real Supabase Google OAuth) */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleLoading || isLoading}
                  className="w-full py-3 px-4 rounded-2xl bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700/80 text-neutral-800 dark:text-neutral-100 text-xs sm:text-sm font-bold border border-neutral-300 dark:border-neutral-700 shadow-xs flex items-center justify-center gap-3 transition-all transform active:scale-95 disabled:opacity-50"
                  id="google-signin-btn"
                >
                  {isGoogleLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-[#E60023]" />
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
                  <span>
                    {isGoogleLoading ? 'Connecting to Google...' : 'Continue with Google'}
                  </span>
                </button>

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
                  onClick={() => {
                    setMode('signup');
                    setAuthError(null);
                  }}
                  className={`py-2 text-xs font-bold rounded-xl transition-all ${
                    mode === 'signup'
                      ? 'bg-white dark:bg-neutral-900 text-[#E60023] shadow-xs'
                      : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                  id="tab-signup-btn"
                >
                  Create Account
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setAuthError(null);
                  }}
                  className={`py-2 text-xs font-bold rounded-xl transition-all ${
                    mode === 'login'
                      ? 'bg-white dark:bg-neutral-900 text-[#E60023] shadow-xs'
                      : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                  id="tab-login-btn"
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
                          required
                          value={name}
                          onChange={(e) => {
                            setName(e.target.value);
                            setAuthError(null);
                          }}
                          placeholder="e.g. Rahul Sharma"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-red-500 focus:outline-none text-neutral-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                        Creator Handle (@)
                      </label>
                      <div className="relative flex items-center">
                        <span className="text-xs font-bold text-neutral-400 absolute left-3.5">
                          @
                        </span>
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => {
                            setUsername(e.target.value);
                            setAuthError(null);
                          }}
                          placeholder="rahul_ai"
                          className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-red-500 focus:outline-none text-neutral-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
                          Choose Avatar
                        </label>
                        <span className="text-[10px] text-neutral-400">Creator style</span>
                      </div>
                      <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
                        {CARTOON_AVATARS.map((av) => (
                          <button
                            key={av.id}
                            type="button"
                            onClick={() => setSelectedAvatar(av.url)}
                            className={`relative w-11 h-11 rounded-full overflow-hidden border-2 transition-all shrink-0 ${
                              selectedAvatar === av.url
                                ? 'border-[#E60023] ring-2 ring-red-500/40 scale-110 shadow-md'
                                : 'border-neutral-200 dark:border-neutral-700 opacity-80 hover:opacity-100 hover:scale-105'
                            }`}
                            title={av.name}
                          >
                            <Image
                              src={av.url}
                              alt={av.name}
                              fill
                              sizes="44px"
                              className="object-cover rounded-full"
                              referrerPolicy="no-referrer"
                            />
                          </button>
                        ))}
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
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setAuthError(null);
                      }}
                      placeholder="name@example.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-red-500 focus:outline-none text-neutral-900 dark:text-white"
                      id="auth-email-input"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
                      Password
                    </label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => {
                          setAuthError(null);
                          setAuthSuccessMessage(null);
                          setMode('forgot');
                        }}
                        className="text-[11px] font-bold text-[#E60023] hover:underline"
                        id="forgot-password-link"
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
                      minLength={6}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setAuthError(null);
                      }}
                      placeholder="At least 6 characters"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-red-500 focus:outline-none text-neutral-900 dark:text-white"
                      id="auth-password-input"
                    />
                  </div>
                  {mode === 'signup' && (
                    <p className="text-[10px] text-neutral-400 mt-1">
                      Must be at least 6 characters as configured in your Supabase project.
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading || isGoogleLoading}
                  className="w-full py-3 rounded-xl bg-[#E60023] hover:bg-[#ad081b] text-white text-xs sm:text-sm font-bold shadow-md shadow-red-500/25 flex items-center justify-center gap-2 transition-all transform active:scale-95 disabled:opacity-50"
                  id="auth-submit-btn"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>
                        {mode === 'signup' ? 'Creating Account...' : 'Signing In...'}
                      </span>
                    </>
                  ) : (
                    <>
                      <span>
                        {mode === 'signup' ? 'Create Account & Continue' : 'Sign In with Email'}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
