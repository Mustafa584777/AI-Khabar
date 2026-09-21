'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Lock, Mail, Key, X, ArrowRight, ShieldCheck } from 'lucide-react';

export const AdminLoginModal = () => {
  const { showLoginModal, setShowLoginModal, login, setCurrentView, setAdminSubView } = useApp();
  const [email, setEmail] = useState('admin@trendinggeminiprompts.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');

  if (!showLoginModal) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = login(email, password);
    if (ok) {
      setError('');
      setAdminSubView('dashboard');
      setCurrentView('admin');
    } else {
      setError('Invalid credentials. You can use the Demo Admin button below.');
    }
  };

  const handleDemoLogin = () => {
    setEmail('admin@trendinggeminiprompts.com');
    setPassword('admin123');
    login('admin@trendinggeminiprompts.com', 'admin123');
    setAdminSubView('dashboard');
    setCurrentView('admin');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-[28px] shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden p-6 sm:p-8">
        {/* Close */}
        <button
          onClick={() => setShowLoginModal(false)}
          className="absolute top-4 right-4 p-2 rounded-full text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Logo Icon */}
        <div className="w-12 h-12 rounded-full bg-[#E60023]/10 text-[#E60023] flex items-center justify-center mb-4">
          <Lock className="w-6 h-6" />
        </div>

        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-1">
          Account & Admin Login
        </h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-6">
          Access the prompt engineering catalog and editorial management suite.
        </p>

        {error && (
          <div className="p-3 mb-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs font-semibold text-red-600 dark:text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
              Admin Email / Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#efefef] dark:bg-neutral-800 border-0 rounded-full text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E60023]/40"
                placeholder="admin@trendinggeminiprompts.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                <Key className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#efefef] dark:bg-neutral-800 border-0 rounded-full text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E60023]/40"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 rounded-full bg-[#E60023] hover:bg-[#ad081b] text-white font-bold text-sm shadow-md shadow-[#E60023]/30 flex items-center justify-center gap-2 transition-all mt-2 active:scale-98"
          >
            <span>Log In</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Demo Login Quick Button */}
        <div className="mt-6 pt-5 border-t border-neutral-100 dark:border-neutral-800">
          <button
            onClick={handleDemoLogin}
            className="w-full py-2.5 px-3 rounded-full bg-[#efefef] dark:bg-neutral-800 hover:bg-[#e2e2e2] dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <ShieldCheck className="w-4 h-4 text-[#E60023]" />
            <span>1-Click Auto Demo Login</span>
          </button>
        </div>
      </div>
    </div>
  );
};
