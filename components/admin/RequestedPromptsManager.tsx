'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { PromptRequestItem, PLAN_MONTHLY_REQUEST_LIMITS } from '@/types/prompt';
import {
  Target,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Search,
  Filter,
  RefreshCw,
  Crown,
  User,
  ExternalLink,
  Copy,
  Check,
  Send,
  Trash2,
  Eye,
  Sliders,
  Image as ImageIcon,
  MessageSquare,
  Lock,
  Zap,
} from 'lucide-react';
import Image from 'next/image';

const SAMPLE_IMAGE_PRESETS = [
  {
    name: 'Cyberpunk Tokyo',
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
    tool: 'Midjourney v6.1',
  },
  {
    name: 'Cinematic Portrait',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=80',
    tool: 'Midjourney v6.1',
  },
  {
    name: 'Fantasy Castle',
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
    tool: 'Flux.1 Dev',
  },
  {
    name: 'Futuristic Architecture',
    url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
    tool: 'Midjourney v6.1',
  },
];

export const RequestedPromptsManager = () => {
  const {
    promptRequests,
    refreshPromptRequests,
    fulfillPromptRequest,
    updatePromptRequestStatus,
    deletePromptRequest,
    showToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'in_progress' | 'fulfilled' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<'all' | 'premium' | 'free'>('all');
  const [selectedRequestToFulfill, setSelectedRequestToFulfill] = useState<PromptRequestItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Stats calculation
  const totalCount = promptRequests.length;
  const pendingCount = promptRequests.filter((r) => r.status === 'pending').length;
  const inProgressCount = promptRequests.filter((r) => r.status === 'in_progress').length;
  const fulfilledCount = promptRequests.filter((r) => r.status === 'fulfilled' || r.status === 'completed').length;
  const premiumCount = promptRequests.filter((r) => r.userPlanTier && r.userPlanTier !== 'free').length;

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return promptRequests.filter((req) => {
      // Tab filter
      if (activeTab === 'pending' && req.status !== 'pending') return false;
      if (activeTab === 'in_progress' && req.status !== 'in_progress') return false;
      if (activeTab === 'fulfilled' && req.status !== 'fulfilled' && req.status !== 'completed') return false;
      if (activeTab === 'rejected' && req.status !== 'rejected') return false;

      // Tier filter
      if (tierFilter === 'premium' && (!req.userPlanTier || req.userPlanTier === 'free')) return false;
      if (tierFilter === 'free' && req.userPlanTier && req.userPlanTier !== 'free') return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = req.userName?.toLowerCase().includes(q);
        const matchesEmail = req.userEmail?.toLowerCase().includes(q);
        const matchesText = req.requestText?.toLowerCase().includes(q);
        const matchesCat = req.category?.toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesText && !matchesCat) return false;
      }

      return true;
    });
  }, [promptRequests, activeTab, tierFilter, searchQuery]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshPromptRequests();
    setTimeout(() => setIsRefreshing(false), 600);
    showToast('Prompt requests updated from server');
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('Prompt text copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (id: string, text: string) => {
    if (confirm(`Delete prompt request "${text.slice(0, 30)}..."?`)) {
      await deletePromptRequest(id);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-red-100 dark:bg-red-950/60 text-[#E60023]">
              <Target className="w-5 h-5" />
            </span>
            <h1 className="text-xl md:text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
              Requested Prompts Queue
            </h1>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Fulfill user-submitted prompt requests. Once fulfilled, prompts are delivered <span className="font-bold text-neutral-800 dark:text-neutral-200">privately to each user&apos;s dashboard</span> and never published to the public feed.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-bold transition-colors flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh Queue</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-1">
          <div className="text-xs font-bold text-neutral-500 flex items-center justify-between">
            <span>Total Requests</span>
            <Target className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="text-2xl font-black text-neutral-900 dark:text-white">{totalCount}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-1">
          <div className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center justify-between">
            <span>Pending Review</span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{pendingCount}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-1">
          <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
            <span>Fulfilled & Delivered</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{fulfilledCount}</div>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 to-red-500/10 dark:from-amber-950/40 dark:to-red-950/40 border border-amber-200/60 dark:border-amber-800/60 shadow-sm space-y-1">
          <div className="text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center justify-between">
            <span>Pro / VIP Requests</span>
            <Crown className="w-4 h-4 text-amber-500 fill-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-700 dark:text-amber-300">{premiumCount}</div>
        </div>
      </div>

      {/* Monthly Premium Users Plan Quota & Allowance Reference Banner */}
      <div className="p-4 sm:p-5 rounded-3xl bg-neutral-900 text-white border border-neutral-800 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span className="text-xs font-black uppercase tracking-wider text-neutral-200">
              Monthly Premium Users Plan Request Quotas & Limits
            </span>
          </div>
          <span className="text-[11px] text-neutral-400">
            Requests allocated each month per subscription plan tier
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-2xl bg-neutral-800/80 border border-neutral-700/60 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-300">Starter Plan</span>
              <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[10px] font-bold">1 / month</span>
            </div>
            <div className="text-lg font-black text-white">1 Request</div>
            <p className="text-[10px] text-neutral-400">Included in Starter plan quota</p>
          </div>

          <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500/15 to-red-500/15 border border-amber-500/30 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                <Crown className="w-3 h-3 fill-amber-400" /> Pro Plan
              </span>
              <span className="px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-300 text-[10px] font-bold">3 / month</span>
            </div>
            <div className="text-lg font-black text-amber-400">3 Requests</div>
            <p className="text-[10px] text-neutral-400">Included in Pro plan quota</p>
          </div>

          <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500/15 to-indigo-500/15 border border-purple-500/30 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-300 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-purple-400" /> VIP Plan
              </span>
              <span className="px-1.5 py-0.5 rounded bg-purple-500/30 text-purple-300 text-[10px] font-bold">10 / month</span>
            </div>
            <div className="text-lg font-black text-purple-400">10 Requests</div>
            <p className="text-[10px] text-neutral-400">Included in VIP plan quota</p>
          </div>

          <div className="p-3 rounded-2xl bg-neutral-800/80 border border-neutral-700/60 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-300">Free Members</span>
              <span className="px-1.5 py-0.5 rounded bg-neutral-700 text-neutral-300 text-[10px] font-bold">Points Based</span>
            </div>
            <div className="text-lg font-black text-neutral-300">10 Points</div>
            <p className="text-[10px] text-neutral-400">0 in plan • Earned via 10 pts</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
              activeTab === 'all'
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200'
            }`}
          >
            All ({totalCount})
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'pending'
                ? 'bg-amber-500 text-white'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setActiveTab('in_progress')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
              activeTab === 'in_progress'
                ? 'bg-blue-600 text-white'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200'
            }`}
          >
            In Progress ({inProgressCount})
          </button>
          <button
            onClick={() => setActiveTab('fulfilled')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
              activeTab === 'fulfilled'
                ? 'bg-emerald-600 text-white'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200'
            }`}
          >
            Fulfilled ({fulfilledCount})
          </button>
          <button
            onClick={() => setActiveTab('rejected')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
              activeTab === 'rejected'
                ? 'bg-red-600 text-white'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200'
            }`}
          >
            Rejected
          </button>
        </div>

        {/* Tier filter & Search */}
        <div className="flex items-center gap-2.5">
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value as any)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 focus:outline-none"
          >
            <option value="all">All Members</option>
            <option value="premium">👑 Pro / VIP Only</option>
            <option value="free">Free Members</option>
          </select>

          <div className="relative flex-1 md:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search requests or user..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>
        </div>
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-3">
          <Target className="w-10 h-10 text-neutral-300 dark:text-neutral-600 mx-auto" />
          <h3 className="text-sm font-bold text-neutral-700 dark:text-neutral-300">
            No Prompt Requests Found
          </h3>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            {searchQuery
              ? 'Try clearing the search query or adjusting your filters.'
              : 'When users complete 10 points or use their monthly premium plan quota to request a prompt, they will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((req) => {
            const isFulfilled = req.status === 'fulfilled' || req.status === 'completed';
            const isPending = req.status === 'pending';
            const isInProgress = req.status === 'in_progress';
            const isPremiumUser = req.userPlanTier && req.userPlanTier !== 'free';
            const planAllowance = PLAN_MONTHLY_REQUEST_LIMITS[req.userPlanTier || 'free'] || 0;

            return (
              <div
                key={req.id}
                className={`p-5 md:p-6 rounded-3xl bg-white dark:bg-neutral-900 border transition-all duration-200 shadow-sm space-y-4 ${
                  isFulfilled
                    ? 'border-emerald-200 dark:border-emerald-900/40 bg-emerald-500/[0.01]'
                    : isPending && isPremiumUser
                    ? 'border-amber-300 dark:border-amber-700/60 ring-1 ring-amber-400/20'
                    : 'border-neutral-200 dark:border-neutral-800'
                }`}
              >
                {/* Top Row: User details & Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100 dark:border-neutral-800/80">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden relative shrink-0 border border-neutral-200 dark:border-neutral-700">
                      {req.userAvatar ? (
                        <Image
                          src={req.userAvatar}
                          alt={req.userName || 'User'}
                          fill
                          className="object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-xs text-neutral-500">
                          {req.userName?.charAt(0) || 'U'}
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-black text-neutral-900 dark:text-white">
                          {req.userName || 'Anonymous Creator'}
                        </span>
                        {/* Plan Badge & Quota in Plan */}
                        {isPremiumUser ? (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-red-500 text-white flex items-center gap-1 shadow-xs">
                              <Crown className="w-2.5 h-2.5 fill-white" />
                              <span>{req.userPlanTier} Plan</span>
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                              <Zap className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                              <span>{planAllowance} Requests/mo in Plan</span>
                            </span>
                            {req.planRequestsRemaining !== undefined && (
                              <span className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400">
                                ({req.planRequestsRemaining} remaining)
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
                              Free Member
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                              10 Points Redeemed
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="text-[11px] text-neutral-400 flex items-center gap-2 mt-0.5">
                        {req.userEmail && <span>{req.userEmail}</span>}
                        <span>•</span>
                        <span>{new Date(req.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {isFulfilled && (
                      <span className="px-3 py-1 rounded-xl text-xs font-black bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Fulfilled & Delivered</span>
                      </span>
                    )}
                    {isInProgress && (
                      <span className="px-3 py-1 rounded-xl text-xs font-black bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 flex items-center gap-1.5 border border-blue-200 dark:border-blue-800">
                        <Clock className="w-3.5 h-3.5 animate-spin" />
                        <span>In Engineering</span>
                      </span>
                    )}
                    {isPending && (
                      <span className="px-3 py-1 rounded-xl text-xs font-black bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center gap-1.5 border border-amber-200 dark:border-amber-800">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Pending Fulfillment</span>
                      </span>
                    )}
                    {req.status === 'rejected' && (
                      <span className="px-3 py-1 rounded-xl text-xs font-black bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 flex items-center gap-1.5 border border-red-200 dark:border-red-800">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Rejected</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Request Details */}
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-950/50 text-[#E60023] text-xs font-black border border-red-100 dark:border-red-900/40">
                      {req.category || 'Photorealistic'}
                    </span>
                    {req.aiToolPreference && (
                      <span className="px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-bold">
                        Tool: {req.aiToolPreference}
                      </span>
                    )}
                    {req.aspectRatio && (
                      <span className="px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-bold">
                        Ratio: {req.aspectRatio}
                      </span>
                    )}

                    {/* How request was funded */}
                    <span className="px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-bold flex items-center gap-1.5">
                      {req.requestedVia === 'plan_quota' || (isPremiumUser && req.requestedVia !== 'points') ? (
                        <>
                          <Crown className="w-3 h-3 text-amber-500 fill-amber-500" />
                          <span>Submitted via Monthly {req.userPlanTier ? req.userPlanTier.toUpperCase() : 'PRO'} Quota ({planAllowance} Req/mo)</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3 text-emerald-500" />
                          <span>Submitted via 10 Points Redeemed</span>
                        </>
                      )}
                    </span>

                    <span className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-500 text-[10px] font-medium flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" />
                      <span>Private User Delivery</span>
                    </span>
                  </div>

                  {/* User's Request Description */}
                  <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/80 dark:border-neutral-800/80">
                    <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                      User Request Description:
                    </div>
                    <p className="text-xs md:text-sm font-medium text-neutral-800 dark:text-neutral-200 leading-relaxed whitespace-pre-wrap">
                      {req.requestText}
                    </p>
                  </div>

                  {/* Reference Image (if attached) */}
                  {req.referenceImageUrl && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-xs">
                      <div className="w-12 h-12 rounded-lg overflow-hidden relative border border-neutral-300 dark:border-neutral-700 shrink-0">
                        <Image
                          src={req.referenceImageUrl}
                          alt="Reference"
                          fill
                          className="object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div>
                        <div className="font-bold text-neutral-700 dark:text-neutral-300">User Reference Image Attached</div>
                        <a
                          href={req.referenceImageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-blue-500 hover:underline flex items-center gap-1"
                        >
                          <span>View Full Image</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {/* Delivered / Fulfilled Card (If already fulfilled) */}
                {isFulfilled && req.fulfilledPrompt && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Delivered Prompt (Private to User Dashboard)</span>
                      </span>
                      {req.fulfilledAt && (
                        <span className="text-[11px] text-emerald-700 dark:text-emerald-400">
                          Fulfilled on {new Date(req.fulfilledAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col md:flex-row gap-4">
                      {req.fulfilledImageUrl && (
                        <div className="w-full md:w-36 h-28 rounded-xl overflow-hidden relative border border-emerald-300 dark:border-emerald-800 shrink-0">
                          <Image
                            src={req.fulfilledImageUrl}
                            alt="Fulfilled artwork preview"
                            fill
                            className="object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}

                      <div className="flex-1 space-y-2">
                        <div className="p-3 rounded-xl bg-white dark:bg-neutral-900 border border-emerald-200 dark:border-emerald-900 text-xs font-mono text-neutral-800 dark:text-neutral-200 leading-relaxed">
                          {req.fulfilledPrompt}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-[11px] text-neutral-500">
                            {req.fulfilledAiTool && <span className="font-bold text-neutral-700 dark:text-neutral-300">Tool: {req.fulfilledAiTool}</span>}
                            {req.fulfilledNotes && <span>• Note: {req.fulfilledNotes}</span>}
                          </div>

                          <button
                            onClick={() => handleCopy(req.fulfilledPrompt || '', req.id)}
                            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-colors flex items-center gap-1 shadow-xs"
                          >
                            {copiedId === req.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedId === req.id ? 'Copied' : 'Copy Delivered Prompt'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedRequestToFulfill(req)}
                      className="px-4 py-2 rounded-xl bg-[#E60023] hover:bg-[#ad081b] text-white text-xs font-black shadow-sm flex items-center gap-1.5 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isFulfilled ? 'Edit Fulfillment' : '🚀 Fulfill & Deliver to User'}</span>
                    </button>

                    {!isInProgress && !isFulfilled && (
                      <button
                        onClick={() => updatePromptRequestStatus(req.id, 'in_progress')}
                        className="px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 text-xs font-bold transition-colors"
                      >
                        Set In Progress
                      </button>
                    )}

                    {req.status !== 'rejected' && !isFulfilled && (
                      <button
                        onClick={() => updatePromptRequestStatus(req.id, 'rejected')}
                        className="px-3 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 text-xs font-bold transition-colors"
                      >
                        Reject
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => handleDelete(req.id, req.requestText)}
                    className="p-2 text-neutral-400 hover:text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                    title="Delete Request"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Fulfillment Modal Dialog */}
      {selectedRequestToFulfill && (
        <FulfillPromptModal
          request={selectedRequestToFulfill}
          onClose={() => setSelectedRequestToFulfill(null)}
          onFulfill={async (data) => {
            const success = await fulfillPromptRequest(selectedRequestToFulfill.id, data);
            if (success) {
              setSelectedRequestToFulfill(null);
            }
          }}
        />
      )}
    </div>
  );
};

interface FulfillPromptModalProps {
  request: PromptRequestItem;
  onClose: () => void;
  onFulfill: (data: {
    fulfilledPrompt: string;
    fulfilledImageUrl?: string;
    fulfilledAiTool?: string;
    fulfilledNotes?: string;
    adminNotes?: string;
  }) => Promise<void>;
}

const FulfillPromptModal: React.FC<FulfillPromptModalProps> = ({ request, onClose, onFulfill }) => {
  const [promptText, setPromptText] = useState(request.fulfilledPrompt || '');
  const [imageUrl, setImageUrl] = useState(request.fulfilledImageUrl || '');
  const [aiTool, setAiTool] = useState(request.fulfilledAiTool || request.aiToolPreference || 'Midjourney v6.1');
  const [aspectRatio, setAspectRatio] = useState(request.aspectRatio || '16:9');
  const [notes, setNotes] = useState(request.fulfilledNotes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick helper to append Midjourney params
  const appendMidjourneyParam = (param: string) => {
    if (!promptText.includes(param)) {
      setPromptText((prev) => `${prev.trim()} ${param}`.trim());
    }
  };

  const handleApplyPreset = (preset: { url: string; tool: string }) => {
    setImageUrl(preset.url);
    setAiTool(preset.tool);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptText.trim()) {
      alert('Please provide the engineered master prompt.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onFulfill({
        fulfilledPrompt: promptText.trim(),
        fulfilledImageUrl: imageUrl.trim() || undefined,
        fulfilledAiTool: aiTool,
        fulfilledNotes: notes.trim() || `Aspect Ratio: ${aspectRatio}. Best results rendered in ${aiTool}.`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-950">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[#E60023] text-white">
                <Sparkles className="w-4 h-4" />
              </span>
              <h2 className="text-base font-black text-neutral-900 dark:text-white">
                Fulfill Prompt Request
              </h2>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Delivering to <span className="font-bold text-neutral-800 dark:text-neutral-200">{request.userName}</span> ({request.userEmail || 'Member'})
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* User Request Summary */}
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs space-y-1">
            <div className="font-bold text-neutral-500 uppercase tracking-wider text-[10px]">
              User Asked For ({request.category} • {request.aiToolPreference || 'Any AI Tool'} • {request.aspectRatio || '16:9'}):
            </div>
            <p className="font-medium text-neutral-800 dark:text-neutral-200 italic">
              &ldquo;{request.requestText}&rdquo;
            </p>
          </div>

          {/* Master Engineered Prompt */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                Master Engineered Prompt Text <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] text-neutral-400 font-mono">
                {promptText.length} characters
              </span>
            </div>
            <textarea
              rows={4}
              required
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="e.g. Ultra-realistic cinematic 8k portrait of a cybernetic geisha in neo-Tokyo rain, volumetric reflections, shot on Hasselblad H6D-100c, 80mm lens --ar 16:9 --v 6.1 --style raw --stylize 250"
              className="w-full p-3.5 rounded-xl text-xs font-mono bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:outline-none leading-relaxed"
            />

            {/* Quick Parameter Helper Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] text-neutral-400 font-bold uppercase mr-1">Add Param:</span>
              <button
                type="button"
                onClick={() => appendMidjourneyParam('--ar 16:9')}
                className="px-2 py-1 rounded-md bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-[10px] font-mono font-bold"
              >
                + --ar 16:9
              </button>
              <button
                type="button"
                onClick={() => appendMidjourneyParam('--ar 9:16')}
                className="px-2 py-1 rounded-md bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-[10px] font-mono font-bold"
              >
                + --ar 9:16
              </button>
              <button
                type="button"
                onClick={() => appendMidjourneyParam('--v 6.1')}
                className="px-2 py-1 rounded-md bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-[10px] font-mono font-bold"
              >
                + --v 6.1
              </button>
              <button
                type="button"
                onClick={() => appendMidjourneyParam('--style raw')}
                className="px-2 py-1 rounded-md bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-[10px] font-mono font-bold"
              >
                + --style raw
              </button>
              <button
                type="button"
                onClick={() => appendMidjourneyParam('--stylize 250')}
                className="px-2 py-1 rounded-md bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-[10px] font-mono font-bold"
              >
                + --stylize 250
              </button>
            </div>
          </div>

          {/* AI Tool & Aspect Ratio Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                Engineered For AI Tool
              </label>
              <select
                value={aiTool}
                onChange={(e) => setAiTool(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs font-bold bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white"
              >
                <option value="Midjourney v6.1">Midjourney v6.1</option>
                <option value="Flux.1 Dev">Flux.1 Dev</option>
                <option value="Flux.1 Schnell">Flux.1 Schnell</option>
                <option value="Gemini Imagen 3">Gemini Imagen 3</option>
                <option value="Stable Diffusion XL">Stable Diffusion XL</option>
                <option value="DALL-E 3">DALL-E 3</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                Aspect Ratio
              </label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs font-bold bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white"
              >
                <option value="16:9">16:9 (Cinematic Landscape)</option>
                <option value="9:16">9:16 (Story / Phone Portrait)</option>
                <option value="1:1">1:1 (Square Feed)</option>
                <option value="4:5">4:5 (Instagram Portrait)</option>
                <option value="21:9">21:9 (Ultrawide Panoramic)</option>
              </select>
            </div>
          </div>

          {/* Generated Result Image URL */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center justify-between">
              <span>Result Preview Image URL</span>
              <span className="text-[11px] text-neutral-400 font-normal">Optional high-res preview</span>
            </label>
            <div className="flex items-center gap-3">
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="flex-1 p-3 rounded-xl text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-red-500"
              />
              {imageUrl && (
                <div className="w-10 h-10 rounded-lg overflow-hidden relative border border-neutral-300 shrink-0">
                  <Image
                    src={imageUrl}
                    alt="Preview"
                    fill
                    className="object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
            </div>

            {/* Presets */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[10px] text-neutral-400 font-bold uppercase">Quick Samples:</span>
              {SAMPLE_IMAGE_PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-[10px] font-medium"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Engineer Advice & Parameters */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
              AI Architect Notes & Recommended Settings
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Recommended seed: 42890, best rendered with Midjourney v6.1 at --stylize 250."
              className="w-full p-3 rounded-xl text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white focus:outline-none"
            />
          </div>

          {/* Private Delivery Notice */}
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
            <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold">Private Delivery Guarantee:</span> This fulfilled prompt will be delivered <span className="font-bold underline">only</span> to this user&apos;s personal dashboard. It will never be visible on the public feed or to any other users.
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-200 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-xs font-bold text-neutral-700 dark:text-neutral-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-[#E60023] hover:bg-[#ad081b] disabled:opacity-50 text-white text-xs font-black shadow-md flex items-center gap-2 transition-colors"
            >
              {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>Deliver Directly to User Dashboard</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
