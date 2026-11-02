'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { auth } from '@/lib/firebase';
import { 
  GoogleAuthProvider, 
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  signOut as firebaseSignOut,
  applyActionCode,
} from 'firebase/auth';
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
  ExternalLink,
  Smartphone,
  RefreshCw,
  Clock,
  MailCheck,
} from 'lucide-react';
import { getEmailAvatarUrl } from '@/lib/utils';

export const UserAuthModal = () => {
  const router = useRouter();
  const {
    isUserAuthModalOpen,
    setIsUserAuthModalOpen,
    authModalMessage,
    loginUser,
    signupUser,
    showToast,
    setIsFirstLoginModalOpen,
  } = useApp();

  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'verify'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showRedirectOption, setShowRedirectOption] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);

  // Email verification enforcement states
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationName, setVerificationName] = useState('');
  const [verificationPassword, setVerificationPassword] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isCheckingVerification, setIsCheckingVerification] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [verificationNotice, setVerificationNotice] = useState<string | null>(null);

  // Helper to format Firebase error codes into clean human-friendly messages
  const formatFirebaseAuthError = (err: any): string => {
    if (!err) return 'An error occurred during authentication.';
    const code = err.code || '';
    const rawMsg = err.message || '';

    if (code === 'auth/popup-closed-by-user' || rawMsg.includes('popup-closed-by-user')) {
      return 'The Google sign-in window was closed before completion. If popups are blocked or closing on your mobile browser, tap "Sign in with Google Redirect" below.';
    }
    if (code === 'auth/popup-blocked' || rawMsg.includes('popup-blocked')) {
      return 'The Google sign-in popup was blocked by your browser. Tap "Sign in with Google Redirect" below to sign in directly without popups.';
    }
    if (code === 'auth/unauthorized-domain' || rawMsg.includes('unauthorized-domain')) {
      return 'Domain authorization required: "eenaprompt.com" is not yet added to Firebase Console > Authentication > Settings > Authorized domains. Please add it to enable Google Sign-In on this domain, or sign in using Email & Password below.';
    }
    if (code === 'auth/email-already-in-use' || rawMsg.includes('email-already-in-use')) {
      return 'This email is already registered. Please enter your password to sign in.';
    }
    if (code === 'auth/wrong-password' || code === 'auth/invalid-credential' || rawMsg.includes('invalid-credential')) {
      return 'Incorrect email or password. Please verify your details or use Forgot Password.';
    }
    if (code === 'auth/user-not-found' || rawMsg.includes('user-not-found')) {
      return 'No account was found with this email. Please sign up to create a free account.';
    }
    if (code === 'auth/weak-password' || rawMsg.includes('weak-password')) {
      return 'Password must be at least 6 characters long.';
    }
    if (code === 'auth/invalid-email' || rawMsg.includes('invalid-email')) {
      return 'Please enter a valid email address.';
    }
    if (code === 'auth/network-request-failed' || rawMsg.includes('network-request-failed')) {
      return 'Network connection failed. Please check your internet connection and try again.';
    }
    if (code === 'auth/too-many-requests' || rawMsg.includes('too-many-requests')) {
      return 'Too many failed attempts. Please wait a moment or reset your password.';
    }
    if (code === 'auth/operation-not-allowed' || rawMsg.includes('operation-not-allowed')) {
      return 'This sign-in provider is not enabled in the Firebase Console.';
    }

    // Clean any technical "Firebase: Error (...)" text
    return rawMsg.replace(/^Firebase:\s*Error\s*\(([^)]+)\)\.?/i, '$1').replace(/auth\//g, '').trim();
  };

  const checkAndRedirectStudio = useCallback(() => {
    if (typeof window !== 'undefined') {
      const hasPreload = sessionStorage.getItem('promptcms_studio_preload') || sessionStorage.getItem('auraprompt_studio_preload');
      const hasImagePreload = sessionStorage.getItem('promptcms_studio_image_preload') || sessionStorage.getItem('auraprompt_studio_image_preload');
      if (hasPreload || hasImagePreload) {
        router.push('/create');
        return true;
      }
    }
    return false;
  }, [router]);

  // Handle redirect login results on component mount
  useEffect(() => {
    let isMounted = true;
    getRedirectResult(auth)
      .then(async (result) => {
        if (!isMounted) return;
        if (result && result.user) {
          const u = result.user;
          const name = u.displayName || u.email?.split('@')[0] || 'Creator';
          const avatar = u.photoURL || getEmailAvatarUrl(u.email || '', name);

          if (typeof window !== 'undefined') {
            localStorage.setItem('auraprompt_signup_modal_already_shown', 'true');
            localStorage.setItem('auraprompt_first_login_claimed', 'true');
            localStorage.setItem('auraprompt_signup_bonus_claimed', 'true');
            if (!localStorage.getItem('auraprompt_tool_credits')) {
              localStorage.setItem('auraprompt_tool_credits', '5');
            }
          }

          await loginUser(u.email || '', '', name, avatar, u.uid);
          setIsFirstLoginModalOpen(false);
          showToast(`Welcome ${name}! Signed in via Google.`);
          setIsUserAuthModalOpen(false);
          checkAndRedirectStudio();
        }
      })
      .catch((err: any) => {
        if (!isMounted) return;
        if (err && err.code !== 'auth/credential-already-in-use') {
          console.warn('Redirect auth result warning:', err);
          const friendly = formatFirebaseAuthError(err);
          setErrorMessage(friendly);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [loginUser, setIsFirstLoginModalOpen, setIsUserAuthModalOpen, showToast, checkAndRedirectStudio]);

  // Cooldown timer for resend verification email
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Listen for email verification action codes in URL (e.g. from Firebase verification links)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const actionCode = urlParams.get('oobCode');
    const actionType = urlParams.get('mode');

    if (actionType === 'verifyEmail' && actionCode) {
      applyActionCode(auth, actionCode)
        .then(async () => {
          showToast('🎉 Email successfully verified! Please sign in with your account.');
          if (auth.currentUser) {
            try {
              await auth.currentUser.reload();
            } catch {}
          }
          setMode('login');
          setIsUserAuthModalOpen(true);
        })
        .catch((err) => {
          console.warn('Apply action code notice:', err);
        });
    }
  }, [showToast, setIsUserAuthModalOpen]);

  if (!isUserAuthModalOpen) return null;

  // 1. Google Sign-In with Popup
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setShowRedirectOption(false);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const u = result.user;
      if (u) {
        const name = u.displayName || u.email?.split('@')[0] || 'Creator';
        const avatar = u.photoURL || getEmailAvatarUrl(u.email || '', name);

        if (typeof window !== 'undefined') {
          localStorage.setItem('auraprompt_signup_modal_already_shown', 'true');
          localStorage.setItem('auraprompt_first_login_claimed', 'true');
          localStorage.setItem('auraprompt_signup_bonus_claimed', 'true');
          if (!localStorage.getItem('auraprompt_tool_credits')) {
            localStorage.setItem('auraprompt_tool_credits', '5');
          }
          if (u.email) {
            const cleanE = u.email.trim().toLowerCase();
            localStorage.setItem(`auraprompt_signup_modal_already_shown_${cleanE}`, 'true');
            localStorage.setItem(`auraprompt_signup_modal_shown_${cleanE}`, 'true');
            localStorage.setItem(`auraprompt_signup_bonus_claimed_${cleanE}`, 'true');
          }
        }

        await loginUser(u.email || '', '', name, avatar, u.uid);
        setIsFirstLoginModalOpen(false);
        showToast(`Welcome ${name}! Signed in via Google.`);
        setIsLoading(false);
        setIsUserAuthModalOpen(false);
        checkAndRedirectStudio();
      }
    } catch (err: any) {
      console.warn('Google sign-in popup error:', err);
      const friendlyMsg = formatFirebaseAuthError(err);
      setErrorMessage(friendlyMsg);

      // Offer or highlight redirect option for mobile & popup-closed errors
      if (
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/popup-blocked' ||
        err?.code === 'auth/cancelled-popup-request'
      ) {
        setShowRedirectOption(true);
      }
      setIsLoading(false);
    }
  };

  // 2. Google Sign-In with Redirect (Ideal for Mobile browsers)
  const handleGoogleRedirectLogin = async () => {
    setIsRedirecting(true);
    setErrorMessage(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithRedirect(auth, provider);
    } catch (err: any) {
      console.error('Google sign-in redirect error:', err);
      const friendlyMsg = formatFirebaseAuthError(err);
      setErrorMessage(friendlyMsg);
      setIsRedirecting(false);
    }
  };

  // 3. Password Reset
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      showToast('Please enter a valid email address');
      return;
    }
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      setForgotSuccess(true);
      showToast('Password reset link sent to your email!');
    } catch (err: any) {
      const friendlyMsg = formatFirebaseAuthError(err);
      setErrorMessage(friendlyMsg);
      showToast(friendlyMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to safely send verification email with ActionCodeSettings and fallback to default
  const sendVerificationEmailSafely = async (user: any): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'User session not active.' };
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://zeenaprompt.com';
      await sendEmailVerification(user, {
        url: `${origin}/?verified=true`,
        handleCodeInApp: false,
      });
      return { success: true };
    } catch (actionErr: any) {
      console.warn('ActionCodeSettings sendEmailVerification failed, trying default sendEmailVerification:', actionErr);
      try {
        await sendEmailVerification(user);
        return { success: true };
      } catch (fallbackErr: any) {
        console.error('sendEmailVerification completely failed:', fallbackErr);
        return { success: false, error: formatFirebaseAuthError(fallbackErr) };
      }
    }
  };

  // Check verification status from Firebase Auth
  const handleCheckVerification = async () => {
    setIsCheckingVerification(true);
    setErrorMessage(null);
    try {
      let targetUser = auth.currentUser;
      if (!targetUser && verificationEmail && verificationPassword) {
        try {
          const cred = await signInWithEmailAndPassword(auth, verificationEmail, verificationPassword);
          targetUser = cred.user;
        } catch (err: any) {
          console.warn('Sign-in during verification check:', err);
        }
      }

      if (!targetUser) {
        setErrorMessage('Session expired. Please switch to Sign In and enter your credentials.');
        setIsCheckingVerification(false);
        return;
      }

      await targetUser.reload();
      const refreshedUser = auth.currentUser || targetUser;

      if (refreshedUser.emailVerified) {
        const cleanE = (refreshedUser.email || verificationEmail).trim().toLowerCase();
        const userName = refreshedUser.displayName || verificationName || cleanE.split('@')[0] || 'Creator';
        const userHandle = '@' + userName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const userAvatar = refreshedUser.photoURL || getEmailAvatarUrl(cleanE, userName);

        if (typeof window !== 'undefined') {
          localStorage.setItem('auraprompt_signup_modal_already_shown', 'true');
          localStorage.setItem('auraprompt_first_login_claimed', 'true');
          localStorage.setItem('auraprompt_signup_bonus_claimed', 'true');
          localStorage.setItem('auraprompt_tool_credits', '5');
          localStorage.setItem(`auraprompt_signup_modal_already_shown_${cleanE}`, 'true');
          localStorage.setItem(`auraprompt_signup_bonus_claimed_${cleanE}`, 'true');
          localStorage.setItem(`auraprompt_signup_modal_shown_${cleanE}`, 'true');
        }

        await signupUser(userName, userHandle, cleanE, '', userAvatar, refreshedUser.uid);
        setIsFirstLoginModalOpen(false);
        showToast(`🎉 Email verified successfully! Welcome ${userName}!`);
        setIsUserAuthModalOpen(false);
        setMode('login');
        setEmail('');
        setPassword('');
        setVerificationEmail('');
        setVerificationPassword('');
        setVerificationNotice(null);
        checkAndRedirectStudio();
        return;
      }

      setErrorMessage(`Email not verified yet. Please check your inbox (and Spam/Junk folder) at ${verificationEmail || refreshedUser.email} and click the link.`);
    } catch (err: any) {
      console.error('Check verification error:', err);
      setErrorMessage(formatFirebaseAuthError(err));
    } finally {
      setIsCheckingVerification(false);
    }
  };

  // Resend verification email with active feedback
  const handleResendVerification = async () => {
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);
    setErrorMessage(null);
    try {
      let targetUser = auth.currentUser;
      if (!targetUser && verificationEmail && verificationPassword) {
        const cred = await signInWithEmailAndPassword(auth, verificationEmail, verificationPassword);
        targetUser = cred.user;
      }

      if (!targetUser) {
        setErrorMessage('Please sign in first to resend the verification email.');
        setIsResending(false);
        return;
      }

      const res = await sendVerificationEmailSafely(targetUser);
      if (res.success) {
        setResendCooldown(60);
        setVerificationNotice(`New verification link sent to ${verificationEmail || targetUser.email}! Please check your Inbox and Spam/Junk folder.`);
        showToast('Verification email resent! Check inbox and spam.');
      } else {
        setErrorMessage(res.error || 'Failed to resend verification email.');
      }
    } catch (err: any) {
      console.error('Resend error:', err);
      setErrorMessage(formatFirebaseAuthError(err));
    } finally {
      setIsResending(false);
    }
  };

  // Cancel / Use different email
  const handleCancelVerification = async () => {
    try {
      await firebaseSignOut(auth);
    } catch {}
    setMode('signup');
    setErrorMessage(null);
    setVerificationNotice(null);
    setVerificationEmail('');
    setVerificationPassword('');
  };

  // Helper to validate email format and reject fake/disposable/gibberish emails
  const isValidEmail = (emailStr: string): boolean => {
    const clean = emailStr.trim().toLowerCase();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(clean)) return false;

    const parts = clean.split('@');
    if (parts.length !== 2) return false;
    const [username, domain] = parts;
    if (!username || !domain) return false;

    const blockedDomains = [
      'asdf.com', 'test.com', 'fake.com', 'dummy.com', 'example.com',
      'abc.com', 'xyz.com', 'tempmail.com', 'mailinator.com',
      '10minutemail.com', 'trashmail.com', 'temp-mail.org',
      'guerrillamail.com', 'sharklasers.com', 'dispostable.com',
      'yopmail.com', 'getairmail.com', 'mohmal.com', 'mytemp.email',
      'crazymailing.com', 'fakemailgenerator.com', 'burnermail.io'
    ];
    if (blockedDomains.includes(domain)) return false;
    if (username.length < 3 || /^(.)\1+$/.test(username)) return false;
    if (username === domain.split('.')[0]) return false;

    return true;
  };

  // 4. Email/Password Submit (Login or Signup)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setShowRedirectOption(false);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      showToast('Please enter a valid email address');
      return;
    }
    if (mode === 'signup' && !isValidEmail(cleanEmail)) {
      showToast('Please enter a valid, real email address. Temporary, test, or fake emails are not allowed.');
      return;
    }
    if (!password || password.length < 6) {
      showToast('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'signup') {
        const userName = fullName.trim() || cleanEmail.split('@')[0];
        const userHandle = '@' + userName.toLowerCase().replace(/[^a-z0-9]/g, '');

        // 1. Create account in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        const u = userCredential.user;

        // 2. Update display name
        if (fullName.trim()) {
          await updateProfile(u, { displayName: fullName.trim() }).catch(() => {});
        }

        // 3. Send email verification
        const sendRes = await sendVerificationEmailSafely(u);

        // 4. Set state and move to verify screen (DO NOT log in or grant privileges yet!)
        setVerificationEmail(cleanEmail);
        setVerificationName(userName);
        setVerificationPassword(password);
        setResendCooldown(60);
        setMode('verify');
        setIsLoading(false);

        if (sendRes.success) {
          setVerificationNotice(`A verification email has been sent to ${cleanEmail}. Please check your Inbox and Spam/Junk folder.`);
          showToast(`Verification email sent to ${cleanEmail}! Please verify before continuing.`);
        } else {
          setErrorMessage(sendRes.error || 'Failed to send verification email automatically. Click "Resend Verification Email" below.');
        }
        return;
      } else {
        // Mode: LOGIN
        const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
        const u = userCredential.user;

        const isGoogle = u.providerData.some((p) => p.providerId === 'google.com');
        const isVerified = Boolean(u.emailVerified || isGoogle);

        if (!isVerified) {
          // Attempt to send a fresh verification email so the user can easily verify
          void sendVerificationEmailSafely(u);

          setVerificationEmail(cleanEmail);
          setVerificationName(u.displayName || cleanEmail.split('@')[0]);
          setVerificationPassword(password);
          setResendCooldown(60);
          setMode('verify');
          setErrorMessage(null);
          setVerificationNotice(`Your account (${cleanEmail}) is not verified yet. We have sent a verification email to your inbox.`);
          showToast(`Please verify your email address (${cleanEmail}) to sign in.`);
          setIsLoading(false);
          return;
        }

        // User is verified!
        const userName = u.displayName || cleanEmail.split('@')[0];
        const userAvatar = u.photoURL || getEmailAvatarUrl(cleanEmail, userName);

        setIsFirstLoginModalOpen(false);
        if (typeof window !== 'undefined') {
          localStorage.setItem('auraprompt_signup_modal_already_shown', 'true');
          localStorage.setItem('auraprompt_first_login_claimed', 'true');
          localStorage.setItem('auraprompt_signup_bonus_claimed', 'true');
          localStorage.setItem(`auraprompt_signup_modal_already_shown_${cleanEmail}`, 'true');
          localStorage.setItem(`auraprompt_signup_bonus_claimed_${cleanEmail}`, 'true');
          localStorage.setItem(`auraprompt_signup_modal_shown_${cleanEmail}`, 'true');
        }

        await loginUser(cleanEmail, password, userName, userAvatar, u.uid);
        showToast(`Welcome back, ${userName}! Logged in successfully.`);
        setIsLoading(false);
        setIsUserAuthModalOpen(false);
        setEmail('');
        setPassword('');
        checkAndRedirectStudio();
      }
    } catch (err: any) {
      console.error('Auth submit error:', err);
      const friendlyMsg = formatFirebaseAuthError(err);
      if (err.code === 'auth/email-already-in-use') {
        setMode('login');
      }
      setErrorMessage(friendlyMsg);
      showToast(friendlyMsg);
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
            {mode === 'verify'
              ? 'Verify Your Email Address'
              : mode === 'signup'
              ? 'Create Free Creator Account'
              : mode === 'login'
              ? 'Welcome Back'
              : 'Reset Password'}
          </h3>
          <p className="text-xs text-neutral-400 mt-1">
            {mode === 'verify'
              ? 'A confirmation link has been dispatched to activate your account.'
              : mode === 'forgot'
              ? 'Enter your account email to receive secure password reset instructions.'
              : authModalMessage ||
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
            <div className="p-4 rounded-2xl border flex flex-col gap-2.5 text-xs transition-all shadow-sm bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300">
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0 text-red-600 dark:text-red-400 mt-0.5">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="leading-relaxed text-xs">{errorMessage}</p>
                </div>
              </div>

              {/* One-tap Google Redirect Button if popup closed or blocked */}
              {showRedirectOption && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleGoogleRedirectLogin}
                    disabled={isRedirecting}
                    className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isRedirecting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Redirecting to Google...</span>
                      </>
                    ) : (
                      <>
                        <Smartphone className="w-4 h-4" />
                        <span>Sign in with Google Redirect (Mobile Friendly)</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {mode === 'verify' ? (
            <div className="space-y-4">
              {/* Notice Banner */}
              {verificationNotice && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-xs flex items-start gap-2.5 shadow-sm">
                  <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed font-medium">{verificationNotice}</span>
                </div>
              )}

              {/* Email Address Highlight Card */}
              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700/80 flex items-center gap-3.5 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                  <MailCheck className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-semibold uppercase tracking-wider">
                    Verification link sent to
                  </p>
                  <p className="text-sm font-bold text-neutral-900 dark:text-white truncate">
                    {verificationEmail || email}
                  </p>
                </div>
              </div>

              {/* Spam Guidance Box */}
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Important: Check Spam / Junk / Promotions Folder</span>
                </div>
                <p className="text-[11px] leading-relaxed text-neutral-600 dark:text-neutral-300">
                  Verification emails often land in your <strong>Spam</strong> or <strong>Promotions</strong> folder. Please open that email, click the confirmation link, and then tap the button below.
                </p>
              </div>

              {/* Primary Action Button: Check verification status */}
              <button
                type="button"
                onClick={handleCheckVerification}
                disabled={isCheckingVerification}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold text-sm shadow-lg shadow-red-500/25 transition-all flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-70 cursor-pointer"
              >
                {isCheckingVerification ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Status with Firebase...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>I&apos;ve Verified My Email — Continue</span>
                  </>
                )}
              </button>

              {/* Resend button with active cooldown */}
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resendCooldown > 0 || isResending}
                className="w-full py-2.5 px-4 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 font-semibold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isResending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Resending Email...</span>
                  </>
                ) : resendCooldown > 0 ? (
                  <>
                    <Clock className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Resend verification email in {resendCooldown}s</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 text-red-500" />
                    <span>Resend Verification Email</span>
                  </>
                )}
              </button>

              {/* Change email or back to sign in */}
              <div className="pt-2 text-center text-xs text-neutral-500">
                <button
                  type="button"
                  onClick={handleCancelVerification}
                  className="text-red-600 dark:text-red-400 font-bold hover:underline cursor-pointer"
                >
                  ← Change email address or log in
                </button>
              </div>
            </div>
          ) : mode === 'forgot' ? (
            forgotSuccess ? (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl text-center space-y-3">
                <CheckCircle className="w-10 h-10 text-emerald-600 dark:text-emerald-400 mx-auto" />
                <h4 className="font-bold text-sm text-neutral-900 dark:text-white">Check Your Email</h4>
                <p className="text-xs text-neutral-600 dark:text-neutral-300">
                  We have sent password reset instructions and a secure recovery link to <strong>{email}</strong>.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setForgotSuccess(false);
                    setErrorMessage(null);
                  }}
                  className="w-full py-2.5 rounded-xl bg-neutral-900 text-white font-bold text-xs hover:bg-neutral-800 transition-colors"
                >
                  Back to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-3">
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
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 text-neutral-900 dark:text-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold text-sm shadow-lg shadow-red-500/25 transition-all flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-70 mt-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending Reset Link...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Password Reset Instructions</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="pt-2 text-center text-xs text-neutral-500">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setErrorMessage(null);
                    }}
                    className="text-red-600 dark:text-red-400 font-bold hover:underline"
                  >
                    ← Back to Sign In
                  </button>
                </div>
              </form>
            )
          ) : (
            <>
              {/* Google OAuth Button (Popup Mode) */}
              <div className="space-y-2">
                <button
                  onClick={handleGoogleLogin}
                  disabled={isLoading || isRedirecting}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-semibold text-sm transition-all shadow-sm active:scale-[0.99] disabled:opacity-60 cursor-pointer"
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

                {/* Direct Mobile Friendly Redirect Button Alternative */}
                <div className="flex items-center justify-center">
                  <button
                    type="button"
                    onClick={handleGoogleRedirectLogin}
                    disabled={isRedirecting || isLoading}
                    className="text-[11px] text-neutral-500 hover:text-blue-600 dark:hover:text-blue-400 font-medium flex items-center gap-1 transition-colors"
                  >
                    <Smartphone className="w-3 h-3 text-neutral-400" />
                    <span>Popup issues? Use Google Redirect (Mobile)</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center my-3">
                <div className="flex-grow border-t border-neutral-200 dark:border-neutral-800"></div>
                <span className="px-3 text-xs text-neutral-400 font-medium uppercase tracking-wider">Or email & password</span>
                <div className="flex-grow border-t border-neutral-200 dark:border-neutral-800"></div>
              </div>

              {/* Email & Password Form */}
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
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Creator Name"
                        className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 text-neutral-900 dark:text-white"
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
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 text-neutral-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                      Password
                    </label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => {
                          setMode('forgot');
                          setErrorMessage(null);
                        }}
                        className="text-xs text-red-600 dark:text-red-400 hover:underline font-medium"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 text-neutral-900 dark:text-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || isRedirecting}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold text-sm shadow-lg shadow-red-500/25 transition-all flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-70 mt-2 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{mode === 'signup' ? 'Creating Account...' : 'Signing In...'}</span>
                    </>
                  ) : (
                    <>
                      <span>{mode === 'signup' ? 'Create Account & Verify Email' : 'Sign In'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="pt-2 text-center text-xs text-neutral-500 dark:text-neutral-400">
                  {mode === 'signup' ? (
                    <span>
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
                    </span>
                  ) : (
                    <span>
                      Don&apos;t have an account?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setMode('signup');
                          setErrorMessage(null);
                        }}
                        className="text-red-600 dark:text-red-400 font-bold hover:underline"
                      >
                        Sign Up
                      </button>
                    </span>
                  )}
                </div>
              </form>
            </>
          )}

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-neutral-400 pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Secure Firebase Authentication • 100% Free Forever</span>
          </div>
        </div>
      </div>
    </div>
  );
};
