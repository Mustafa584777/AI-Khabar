'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useApp } from '@/context/AppContext';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Layers,
  ShieldCheck,
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';

export const CMSLoginPage = () => {
  const { isAuthenticated, login, logout, currentUser, setCurrentView, setAdminSubView } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already authenticated, show the CMS Admin Dashboard
  if (isAuthenticated) {
    return <AdminLayout />;
  }

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    setTimeout(() => {
      const success = login(username, password);
      if (success) {
        setError(null);
        setAdminSubView('posts');
        setCurrentView('admin');
      } else {
        setError('Error: The password or email you entered is incorrect.');
      }
      setIsSubmitting(false);
    }, 300);
  };

  return (
    <div className="min-h-screen bg-[#f0f0f1] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col items-center justify-center p-4 sm:p-6 transition-colors">
      {/* Studio CMS Center Container */}
      <div className="w-full max-w-[360px] sm:max-w-[390px] flex flex-col items-center">
        
        {/* Top Logo / Studio CMS Badge */}
        <div className="mb-6 flex flex-col items-center text-center">
          <Link
            href="/"
            className="group flex flex-col items-center gap-2 focus:outline-none"
            title="Return to Trending Copy Paste Photo Prompts"
          >
            <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-xl shadow-blue-500/20 group-hover:scale-105 transition-all relative bg-gradient-to-tr from-blue-700 via-indigo-600 to-purple-600 p-0.5">
              <div className="w-full h-full bg-neutral-900 rounded-[14px] overflow-hidden flex items-center justify-center">
                <Image
                  src="/logo.png"
                  alt="Trending Copy Paste Photo Prompts"
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="mt-1">
              <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center justify-center gap-1.5">
                Trending Photo Prompts <span className="text-blue-600 dark:text-blue-400">Editorial</span>
              </h1>
              <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                Editorial Administration Dashboard
              </p>
            </div>
          </Link>
        </div>

        {/* Error Notice */}
        {error && (
          <div className="w-full mb-4 p-3 bg-white dark:bg-neutral-900 border-l-4 border-red-500 shadow-sm text-xs text-neutral-800 dark:text-neutral-200 flex items-start gap-2 rounded-r-md">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div className="leading-snug">
              <strong className="font-semibold text-red-600 dark:text-red-400 block mb-0.5">
                Authentication Notice:
              </strong>
              {error}
            </div>
          </div>
        )}

        {/* Login Box */}
        <div className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-lg shadow-neutral-200/50 dark:shadow-none rounded-lg p-6 sm:p-7">
          <form onSubmit={handleLoginSubmit} className="space-y-4" id="admin-login-form">
            <div>
              <label
                htmlFor="user_login"
                className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5"
              >
                Username or Email Address
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="user_login"
                  name="log"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded text-sm text-neutral-900 dark:text-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="user_pass"
                  className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300"
                >
                  Password
                </label>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="user_pass"
                  name="pwd"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-3 pr-10 py-2 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded text-sm text-neutral-900 dark:text-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  id="rememberme"
                  name="rememberme"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500 dark:bg-neutral-950 dark:border-neutral-700"
                />
                <span className="text-xs text-neutral-600 dark:text-neutral-400">Remember Me</span>
              </label>
            </div>

            {/* Studio CMS Log In Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                id="cms-login-submit"
                className="w-full py-2.5 px-4 rounded bg-[#2271b1] hover:bg-[#135e96] active:bg-[#0a4b78] text-white font-semibold text-sm shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Log In</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer Sub-Links */}
        <div className="w-full mt-4 flex items-center justify-center text-xs text-neutral-600 dark:text-neutral-400 px-1">
          <Link
            href="/"
            className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>← Go to Trending Gemini Prompts Directory</span>
          </Link>
        </div>

        {/* Privacy Note */}
        <div className="mt-8 text-center text-[11px] text-neutral-400 dark:text-neutral-500">
          <span>Trending Photo Prompts Editorial Suite • Secured Platform</span>
        </div>

      </div>
    </div>
  );
};
