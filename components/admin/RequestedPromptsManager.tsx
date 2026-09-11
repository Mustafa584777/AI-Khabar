'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  ExternalLink,
  Trash2,
  Crown,
  Zap,
  User,
  ArrowRight,
  RefreshCw,
  MessageSquarePlus,
  PlusCircle,
} from 'lucide-react';
import Image from 'next/image';

interface PromptRequestItem {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string;
  userAvatar?: string;
  planTier?: string;
  isProUser?: boolean;
  paymentMethod?: 'plan_quota' | 'points';
  pointsUsed?: number;
  promptRequestsRemaining?: number;
  requestText: string;
  category: string;
  status: 'pending' | 'in_progress' | 'fulfilled' | 'rejected';
  createdAt: string;
  fulfilledPostId?: string;
  adminNotes?: string;
}

export const RequestedPromptsManager: React.FC = () => {
  const { setAdminSubView, setEditingPostId, showToast, posts } = useApp();

  const [requests, setRequests] = useState<PromptRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'fulfilled' | 'rejected'>('all');
  const [isUpdatingId, setIsUpdatingId] = useState<string | null>(null);

  // Fetch all requested prompts from server
  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/prompt-requests', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.requests)) {
          setRequests(data.requests);
        }
      }
    } catch (err) {
      console.error('Failed to load prompt requests:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // Update status of a request
  const handleUpdateStatus = async (
    id: string,
    newStatus: 'pending' | 'in_progress' | 'fulfilled' | 'rejected'
  ) => {
    setIsUpdatingId(id);
    try {
      const res = await fetch('/api/prompt-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (res.ok) {
        setRequests((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
        );
        showToast(`Request marked as ${newStatus.replace('_', ' ')}`);
      } else {
        showToast('Failed to update status');
      }
    } catch (err) {
      showToast('Error updating status');
    } finally {
      setIsUpdatingId(null);
    }
  };

  // Delete a request
  const handleDeleteRequest = async (id: string) => {
    if (!confirm('Are you sure you want to delete this prompt request?')) return;
    try {
      const res = await fetch(`/api/prompt-requests?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setRequests((prev) => prev.filter((r) => r.id !== id));
        showToast('Prompt request deleted');
      }
    } catch (err) {
      showToast('Failed to delete request');
    }
  };

  // Open Post Editor to fulfill prompt
  const handleFulfillPrompt = (req: PromptRequestItem) => {
    // If not fulfilled, set to in_progress first
    if (req.status === 'pending') {
      handleUpdateStatus(req.id, 'in_progress');
    }
    // Set editing post id to null (new post) and route to new-post
    setEditingPostId(null);
    // Pre-populate session storage for PostEditor to pick up
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(
        'promptcms_fulfill_request',
        JSON.stringify({
          requestId: req.id,
          title: req.requestText.slice(0, 60),
          category: req.category,
          description: req.requestText,
          requestedBy: req.userName,
          requestedByEmail: req.userEmail,
        })
      );
    }
    setAdminSubView('new-post');
  };

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        r.requestText.toLowerCase().includes(q) ||
        r.userName.toLowerCase().includes(q) ||
        (r.userEmail && r.userEmail.toLowerCase().includes(q)) ||
        r.category.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [requests, statusFilter, searchQuery]);

  // Stats
  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const inProgressCount = requests.filter((r) => r.status === 'in_progress').length;
  const fulfilledCount = requests.filter((r) => r.status === 'fulfilled').length;
  const proCount = requests.filter((r) => r.isProUser || (r.planTier && r.planTier !== 'free')).length;

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 dark:text-white flex items-center gap-2.5">
            <MessageSquarePlus className="w-6 h-6 text-blue-600" />
            <span>User Requested Prompts</span>
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Review custom AI prompt requests submitted by logged-in users and Monthly Premium subscribers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchRequests}
            disabled={isLoading}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500">Total Requests</span>
            <Sparkles className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-neutral-900 dark:text-white">
            {requests.length}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400">Pending Review</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700 dark:text-amber-400">
            {pendingCount}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Fulfilled</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
            {fulfilledCount}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-700 dark:text-purple-400">Monthly Pro Users</span>
            <Crown className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-700 dark:text-purple-400">
            {proCount}
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white dark:bg-neutral-900 p-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {(
            [
              { id: 'all', label: 'All', count: requests.length },
              { id: 'pending', label: 'Pending', count: pendingCount },
              { id: 'in_progress', label: 'In Progress', count: inProgressCount },
              { id: 'fulfilled', label: 'Fulfilled', count: fulfilledCount },
            ] as const
          ).map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    isActive ? 'bg-blue-800 text-white' : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search prompt requests..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Requests List */}
      {isLoading ? (
        <div className="text-center py-16 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600" />
          <p className="text-xs text-neutral-500 mt-2">Loading prompt requests...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto text-neutral-400">
            <MessageSquarePlus className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
            No Prompt Requests Found
          </h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            {searchQuery
              ? 'No requests match your search criteria.'
              : 'Logged-in users will submit custom prompt ideas here when they complete 10 points or use their monthly plan quota.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((req) => {
            const isPro = req.isProUser || (req.planTier && req.planTier !== 'free');
            const formattedDate = new Date(req.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={req.id}
                className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm hover:border-neutral-300 dark:hover:border-neutral-700 transition-all space-y-4"
              >
                {/* Header Row: User Info & Plan Badge */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-neutral-200 dark:border-neutral-700 relative bg-neutral-100 dark:bg-neutral-800">
                      <Image
                        src={req.userAvatar || '/logo.png'}
                        alt={req.userName}
                        fill
                        className="object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-neutral-900 dark:text-white">
                          {req.userName}
                        </span>
                        {isPro ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            <Crown className="w-3 h-3 text-purple-600" />
                            <span>{(req.planTier || 'Pro').toUpperCase()} Member</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                            <Zap className="w-3 h-3 text-amber-500" />
                            <span>10 Points Redeemed</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-neutral-500 mt-0.5">
                        {req.userEmail && <span>{req.userEmail}</span>}
                        <span>•</span>
                        <span>{formattedDate}</span>
                      </div>
                    </div>
                  </div>

                  {/* Plan Quota Details */}
                  <div className="flex items-center gap-2">
                    {isPro ? (
                      <div className="text-right text-xs">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          Included in Monthly Plan
                        </span>
                        {req.promptRequestsRemaining !== undefined && (
                          <p className="text-[10px] text-neutral-400">
                            {req.promptRequestsRemaining} requests left in cycle
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="text-right text-xs">
                        <span className="font-bold text-amber-600 dark:text-amber-400">
                          Activity Points
                        </span>
                        <p className="text-[10px] text-neutral-400">
                          10 community points spent
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Body Row: Category & Requested Text */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50">
                      {req.category}
                    </span>
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                        req.status === 'fulfilled'
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 border border-emerald-200 dark:border-emerald-800'
                          : req.status === 'in_progress'
                          ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 border border-blue-200 dark:border-blue-800'
                          : req.status === 'rejected'
                          ? 'bg-red-50 dark:bg-red-950/50 text-red-600 border border-red-200 dark:border-red-800'
                          : 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 border border-amber-200 dark:border-amber-800'
                      }`}
                    >
                      {req.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm font-medium text-neutral-800 dark:text-neutral-200 bg-neutral-50 dark:bg-neutral-950 p-3.5 rounded-xl border border-neutral-100 dark:border-neutral-800 leading-relaxed">
                    &ldquo;{req.requestText}&rdquo;
                  </p>
                </div>

                {/* Footer Action Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2">
                    {/* Status Changer Buttons */}
                    <button
                      onClick={() => handleUpdateStatus(req.id, 'pending')}
                      disabled={isUpdatingId === req.id || req.status === 'pending'}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                        req.status === 'pending'
                          ? 'bg-amber-500 text-white'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-amber-100'
                      }`}
                    >
                      Pending
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(req.id, 'in_progress')}
                      disabled={isUpdatingId === req.id || req.status === 'in_progress'}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                        req.status === 'in_progress'
                          ? 'bg-blue-600 text-white'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-blue-100'
                      }`}
                    >
                      In Progress
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(req.id, 'fulfilled')}
                      disabled={isUpdatingId === req.id || req.status === 'fulfilled'}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                        req.status === 'fulfilled'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-emerald-100'
                      }`}
                    >
                      Fulfilled
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(req.id, 'rejected')}
                      disabled={isUpdatingId === req.id || req.status === 'rejected'}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                        req.status === 'rejected'
                          ? 'bg-red-600 text-white'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-red-100'
                      }`}
                    >
                      Reject
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Fulfill & Create Prompt Button */}
                    <button
                      onClick={() => handleFulfillPrompt(req)}
                      className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Fulfill & Create Prompt</span>
                    </button>

                    {/* Delete Request */}
                    <button
                      onClick={() => handleDeleteRequest(req.id)}
                      className="p-1.5 rounded-xl text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                      title="Delete request"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
