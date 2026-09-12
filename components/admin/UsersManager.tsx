'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useApp } from '@/context/AppContext';
import { RegisteredUserRecord, PlanTier, UsersBackupPayload } from '@/types/prompt';
import {
  Users,
  RefreshCw,
  Download,
  Upload,
  Search,
  CheckCircle2,
  AlertTriangle,
  Mail,
  Crown,
  Zap,
  Coins,
  Copy,
  Lock,
  Calendar,
  ShieldCheck,
  Sparkles,
  FileCheck,
  Database,
  SlidersHorizontal,
} from 'lucide-react';

export const UsersManager = () => {
  const { showToast } = useApp();

  const [users, setUsers] = useState<RegisteredUserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTier, setSelectedTier] = useState<string>('all');

  // Backup & Restore State
  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [previewBackupData, setPreviewBackupData] = useState<UsersBackupPayload | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch Users function (runs automatically on mount and on manual refresh)
  const handleSyncUsers = async (isAuto: boolean = false) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache' },
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.success && Array.isArray(data.users)) {
        setUsers(data.users);
        setHasFetched(true);
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLastSyncedTime(timeStr);
        if (!isAuto) {
          showToast(`Successfully refreshed ${data.users.length} registered users from Supabase!`);
        }
      } else {
        throw new Error(data.error || 'Failed to parse users data');
      }
    } catch (err: any) {
      console.error('Error syncing users:', err);
      if (!isAuto) {
        showToast(err?.message || 'Could not sync users from Supabase. Check database connection.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Automatically fetch users data on mount so admin sees all users without pressing sync button
  useEffect(() => {
    void handleSyncUsers(true);
  }, []);

  // Copy email to clipboard
  const copyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    showToast(`Copied ${email} to clipboard!`);
  };

  // Export All Users Data as JSON Backup
  const handleExportUsers = () => {
    if (users.length === 0) {
      showToast('No user records loaded. Click "Sync Users from Supabase" first before exporting.');
      return;
    }

    setIsExporting(true);
    try {
      const payload: UsersBackupPayload = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        system: 'Trending Photo Prompts SaaS User Registry',
        totalUsers: users.length,
        users,
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `saas-all-users-backup-${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast(`Exported ${users.length} user accounts backup successfully!`);
    } catch (err: any) {
      console.error('Export error:', err);
      showToast('Failed to export users backup.');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle file select for Restore
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoreError(null);
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        let userList: any[] = [];
        if (Array.isArray(parsed)) {
          userList = parsed;
        } else if (parsed && Array.isArray(parsed.users)) {
          userList = parsed.users;
        } else {
          throw new Error('Invalid backup structure: Expected an array of users or a "users" field.');
        }

        if (userList.length === 0) {
          throw new Error('Backup file contains 0 user records.');
        }

        setPreviewBackupData({
          version: parsed.version || '1.0',
          exportedAt: parsed.exportedAt || new Date().toISOString(),
          system: parsed.system || 'External Backup',
          totalUsers: userList.length,
          users: userList,
        });
        setRestoreModalOpen(true);
      } catch (err: any) {
        console.error('Parse backup file error:', err);
        setRestoreError(err?.message || 'Could not parse JSON file. Please ensure it is a valid backup.');
      }
    };

    reader.readAsText(file);
    e.target.value = '';
  };

  // Confirm Restore to Supabase
  const confirmRestore = async () => {
    if (!previewBackupData || !Array.isArray(previewBackupData.users)) return;

    setIsRestoring(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'restore_users',
          users: previewBackupData.users,
          mode: 'merge',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || 'Users restored successfully!');
        setRestoreModalOpen(false);
        setPreviewBackupData(null);
        // Refresh users list
        await handleSyncUsers();
      } else {
        throw new Error(data.error || 'Restore failed on server');
      }
    } catch (err: any) {
      console.error('Restore error:', err);
      showToast(err?.message || 'Failed to restore users to Supabase.');
    } finally {
      setIsRestoring(false);
    }
  };

  // Computed Filters
  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      u.email.toLowerCase().includes(q) ||
      u.name.toLowerCase().includes(q) ||
      (u.username && u.username.toLowerCase().includes(q));

    const isPaid = u.isProUser || (u.planTier && u.planTier !== 'free') || (u.toolCredits && u.toolCredits > 2);
    const matchesTier =
      selectedTier === 'all' ||
      (selectedTier === 'paid' && isPaid) ||
      (selectedTier === 'free' && !isPaid) ||
      u.planTier === selectedTier;

    return matchesQuery && matchesTier;
  });

  // KPI Calculations
  const totalUsersCount = users.length;
  const paidUsersCount = users.filter((u) => u.isProUser || (u.planTier && u.planTier !== 'free') || (u.toolCredits && u.toolCredits > 2)).length;
  const freeUsersCount = users.length - paidUsersCount;
  const totalCreditsInSystem = users.reduce((acc, u) => acc + (u.toolCredits || 0), 0);

  const getTierBadgeClass = (tier: PlanTier) => {
    switch (tier) {
      case 'vip':
        return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800';
      case 'pro':
        return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800';
      case 'starter':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800';
      default:
        return 'bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700';
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Hidden File Input for User Restore */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept=".json,application/json"
        className="hidden"
      />

      {/* Top Header Card with Sync & Backup Controls */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                <Users className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
                Registered Users & SaaS Members
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 max-w-2xl">
              Live user accounts, subscription tiers, and tool credit balances fetched directly from Supabase & Razorpay.
            </p>
            {lastSyncedTime && (
              <div className="flex items-center gap-2 pt-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Live data synced at {lastSyncedTime}</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Refresh Users Button */}
            <button
              onClick={() => handleSyncUsers(false)}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
              id="admin-sync-supabase-users-btn"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Refreshing...' : 'Refresh Users Data'}</span>
            </button>

            {/* Export Backup Button */}
            <button
              onClick={handleExportUsers}
              disabled={isExporting || users.length === 0}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-bold transition-all disabled:opacity-40"
              title="Export complete user accounts backup as JSON"
            >
              <Download className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
              <span>Backup All Users</span>
            </button>

            {/* Restore Backup Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-bold transition-all"
              title="Upload and restore users from a previous JSON backup"
            >
              <Upload className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
              <span>Restore Backup</span>
            </button>
          </div>
        </div>

        {/* Error notice if restore failed during file read */}
        {restoreError && (
          <div className="mt-4 p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{restoreError}</span>
          </div>
        )}
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Users</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white">
            {hasFetched ? totalUsersCount : (isLoading ? '...' : '—')}
          </div>
          <span className="text-[11px] text-neutral-400">
            {hasFetched ? 'Registered Accounts' : 'Loading data...'}
          </span>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-bold uppercase tracking-wider">Paid Members</span>
            <Crown className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white">
            {hasFetched ? paidUsersCount : (isLoading ? '...' : '—')}
          </div>
          <span className="text-[11px] text-neutral-400">
            Starter / Pro / VIP
          </span>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-bold uppercase tracking-wider">Free Accounts</span>
            <Sparkles className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white">
            {hasFetched ? freeUsersCount : (isLoading ? '...' : '—')}
          </div>
          <span className="text-[11px] text-neutral-400">Standard Tier</span>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Credits</span>
            <Zap className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white">
            {hasFetched ? totalCreditsInSystem : (isLoading ? '...' : '—')}
          </div>
          <span className="text-[11px] text-neutral-400">Tool Credits in circulation</span>
        </div>
      </div>

      {/* Main Content Area */}
      {!hasFetched ? (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto shadow-sm">
            {isLoading ? <RefreshCw className="w-8 h-8 animate-spin" /> : <Database className="w-8 h-8" />}
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
              {isLoading ? 'Loading Users & Razorpay Data...' : 'Connecting to Database...'}
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {isLoading
                ? 'Retrieving registered accounts, payment records, and credit balances...'
                : 'Could not automatically load users. Click below to retry.'}
            </p>
          </div>
          <button
            onClick={() => handleSyncUsers(false)}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Fetching Data...' : 'Load Users Now'}</span>
          </button>
        </div>
      ) : (
        /* Synced Users Table & Controls */
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl overflow-hidden shadow-sm">
          {/* Filter Bar */}
          <div className="p-4 sm:p-6 border-b border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by email / Gmail, name, username..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 border-none text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Plan Tier Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all', label: 'All Users' },
                { id: 'paid', label: 'Paid Plans' },
                { id: 'vip', label: 'VIP' },
                { id: 'pro', label: 'Pro' },
                { id: 'starter', label: 'Starter' },
                { id: 'free', label: 'Free' },
              ].map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => setSelectedTier(pill.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedTier === pill.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          {/* Table Container */}
          {filteredUsers.length === 0 ? (
            <div className="p-12 text-center text-neutral-400 space-y-2">
              <Users className="w-8 h-8 mx-auto text-neutral-300 dark:text-neutral-700" />
              <p className="text-xs font-semibold">No users found matching your filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-850/50 text-[11px] uppercase tracking-wider font-bold text-neutral-500">
                    <th className="py-3.5 px-4 sm:px-6">User / Name</th>
                    <th className="py-3.5 px-4">Email / Gmail</th>
                    <th className="py-3.5 px-4">Plan Tier</th>
                    <th className="py-3.5 px-4">Tool Credits</th>
                    <th className="py-3.5 px-4">Points</th>
                    <th className="py-3.5 px-4">Unlocked</th>
                    <th className="py-3.5 px-4">Joined</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 text-xs">
                  {filteredUsers.map((u) => (
                    <tr
                      key={u.id || u.email}
                      className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors"
                    >
                      {/* User Info */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-700 shrink-0 relative flex items-center justify-center font-bold text-xs text-neutral-600 dark:text-neutral-300">
                            {u.avatar ? (
                              <Image
                                src={u.avatar}
                                alt={u.name || 'Avatar'}
                                width={32}
                                height={32}
                                unoptimized
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              (u.name || u.email || 'U')[0].toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-neutral-900 dark:text-white truncate max-w-[140px]">
                              {u.name || 'Creator'}
                            </div>
                            <div className="text-[11px] text-neutral-400 font-mono truncate max-w-[140px]">
                              {u.username || '@creator'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Email with copy */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-mono text-neutral-700 dark:text-neutral-300">
                          <Mail className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                          <span className="truncate max-w-[180px] sm:max-w-[240px]">{u.email}</span>
                          <button
                            onClick={() => copyEmail(u.email)}
                            className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
                            title="Copy email"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      {/* Plan Tier Badge */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col items-start gap-1">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border uppercase tracking-wider ${getTierBadgeClass(
                              u.planTier
                            )}`}
                          >
                            {u.isProUser || (u.planTier && u.planTier !== 'free') ? (
                              <>
                                <Crown className="w-3 h-3 shrink-0 text-amber-500 fill-amber-500" />
                                <span>PAID ({u.planTier ? u.planTier.toUpperCase() : 'PRO'})</span>
                              </>
                            ) : (
                              <span>FREE TIER</span>
                            )}
                          </span>
                          {u.paymentAmount ? (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Razorpay: ₹{u.paymentAmount}</span>
                            </span>
                          ) : u.source === 'razorpay_verified' ? (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                              ✓ Razorpay Verified
                            </span>
                          ) : null}
                        </div>
                      </td>

                      {/* Tool Credits */}
                      <td className="py-3.5 px-4">
                        <div
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border font-bold text-xs ${
                            (u.toolCredits || 0) > 2
                              ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200'
                              : 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-900/60 text-indigo-700 dark:text-indigo-300'
                          }`}
                        >
                          <Zap
                            className={`w-3.5 h-3.5 ${
                              (u.toolCredits || 0) > 2
                                ? 'text-amber-500 fill-amber-500'
                                : 'text-indigo-500 fill-indigo-500'
                            }`}
                          />
                          <span>{u.toolCredits ?? 2} Credits</span>
                        </div>
                      </td>

                      {/* Points */}
                      <td className="py-3.5 px-4">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 font-bold text-amber-700 dark:text-amber-300 text-xs">
                          <Coins className="w-3.5 h-3.5 text-amber-500" />
                          <span>{u.points ?? 10} pts</span>
                        </div>
                      </td>

                      {/* Unlocked Prompts */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1 text-neutral-600 dark:text-neutral-400 font-semibold">
                          <Lock className="w-3.5 h-3.5 text-neutral-400" />
                          <span>{u.unlockedPromptIds?.length || 0} unlocked</span>
                        </div>
                      </td>

                      {/* Joined Date */}
                      <td className="py-3.5 px-4 text-neutral-500 text-[11px] whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-neutral-400" />
                          <span>{u.joinedDate || 'Recent'}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => copyEmail(u.email)}
                          className="px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-[11px] font-semibold transition-colors"
                        >
                          Copy
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Table Footer with Summary Stats */}
          <div className="p-4 bg-neutral-50/50 dark:bg-neutral-850/50 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-500">
            <span>
              Showing {filteredUsers.length} of {totalUsersCount} user accounts
            </span>
            <span className="font-mono text-[11px] text-neutral-400">
              Fetched from Supabase Database
            </span>
          </div>
        </div>
      )}

      {/* Restore Confirmation Modal */}
      {restoreModalOpen && previewBackupData && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="space-y-2 text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <FileCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                Confirm User Accounts Restore
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                You are about to restore user records from your backup file into the Supabase database.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 space-y-2 text-xs">
              <div className="flex justify-between text-neutral-600 dark:text-neutral-300">
                <span>Backup Source:</span>
                <span className="font-bold">{previewBackupData.system}</span>
              </div>
              <div className="flex justify-between text-neutral-600 dark:text-neutral-300">
                <span>Total Users to Restore:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {previewBackupData.totalUsers} accounts
                </span>
              </div>
              <div className="flex justify-between text-neutral-600 dark:text-neutral-300">
                <span>Exported Timestamp:</span>
                <span className="font-mono text-[11px]">
                  {new Date(previewBackupData.exportedAt).toLocaleString()}
                </span>
              </div>
              <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700 text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-semibold">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Non-Destructive Safe Merge: Highest credits, paid tiers, and unlocked prompts will be preserved!</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setRestoreModalOpen(false);
                  setPreviewBackupData(null);
                }}
                className="flex-1 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmRestore}
                disabled={isRestoring}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isRestoring ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Restoring to Database...</span>
                  </>
                ) : (
                  <span>Restore {previewBackupData.totalUsers} Users</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
