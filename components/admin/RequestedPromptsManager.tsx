'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { PromptRequestItem } from '@/types/prompt';
import {
  MessageSquare,
  Search,
  RefreshCw,
  Clock,
  CheckCircle2,
  Sparkles,
  Copy,
  Check,
  Trash2,
  Mail,
  Filter,
  Send,
  X,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  Layers,
  Wand2,
  UserCheck,
} from 'lucide-react';

export const RequestedPromptsManager = () => {
  const {
    promptRequests,
    refreshPromptRequests,
    fulfillPromptRequest,
    deletePromptRequest,
    showToast,
    currentUser,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fulfillment Modal State
  const [activeFulfillRequest, setActiveFulfillRequest] = useState<PromptRequestItem | null>(null);
  const [fulfillmentText, setFulfillmentText] = useState('');
  const [fulfillmentNotes, setFulfillmentNotes] = useState('');
  const [isSubmittingFulfillment, setIsSubmittingFulfillment] = useState(false);

  // Delete Confirmation State
  const [requestToDelete, setRequestToDelete] = useState<PromptRequestItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Copied state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshPromptRequests();
      showToast('Requested prompts refreshed');
    } catch (e) {
      console.error('Error refreshing prompt requests:', e);
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshPromptRequests, showToast]);

  // Auto refresh on mount
  useEffect(() => {
    refreshPromptRequests();
  }, [refreshPromptRequests]);

  // Open fulfillment editor
  const handleOpenFulfill = (req: PromptRequestItem) => {
    setActiveFulfillRequest(req);
    setFulfillmentText(req.fulfilledPrompt || '');
    setFulfillmentNotes(req.adminNotes || '');
  };

  // Submit fulfillment
  const handleSubmitFulfillment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFulfillRequest) return;
    if (!fulfillmentText.trim()) {
      showToast('Please enter the crafted prompt text to fulfill this request');
      return;
    }

    setIsSubmittingFulfillment(true);
    try {
      const success = await fulfillPromptRequest(
        activeFulfillRequest.id,
        fulfillmentText.trim(),
        fulfillmentNotes.trim() || undefined
      );

      if (success) {
        showToast(`Prompt fulfilled and delivered to ${activeFulfillRequest.userEmail || 'user'}!`);
        setActiveFulfillRequest(null);
        setFulfillmentText('');
        setFulfillmentNotes('');
      } else {
        showToast('Failed to fulfill request. Please try again.');
      }
    } catch (err: any) {
      showToast(`Error: ${err.message || 'Failed to fulfill'}`);
    } finally {
      setIsSubmittingFulfillment(false);
    }
  };

  // Confirm delete
  const handleConfirmDelete = async () => {
    if (!requestToDelete) return;
    setIsDeleting(true);
    try {
      const success = await deletePromptRequest(requestToDelete.id);
      if (success) {
        showToast('Prompt request deleted');
        setRequestToDelete(null);
      } else {
        showToast('Failed to delete request');
      }
    } catch (err: any) {
      showToast(`Error: ${err.message || 'Failed to delete'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Copy helper
  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('Copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Metrics
  const totalCount = promptRequests.length;
  const pendingCount = promptRequests.filter((r) => r.status === 'pending').length;
  const completedCount = promptRequests.filter((r) => r.status === 'completed').length;
  const uniqueUsersCount = useMemo(() => {
    const emails = new Set<string>();
    promptRequests.forEach((r) => {
      if (r.userEmail) emails.add(r.userEmail.toLowerCase());
    });
    return emails.size;
  }, [promptRequests]);

  // Available categories for filter dropdown
  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>();
    promptRequests.forEach((r) => {
      if (r.category) cats.add(r.category);
    });
    return Array.from(cats);
  }, [promptRequests]);

  // Filtered requests list
  const filteredRequests = useMemo(() => {
    return promptRequests.filter((req) => {
      // Status filter
      if (statusFilter !== 'all' && req.status !== statusFilter) {
        return false;
      }
      // Category filter
      if (categoryFilter !== 'all' && req.category !== categoryFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesEmail = req.userEmail?.toLowerCase().includes(q);
        const matchesText = req.requestText?.toLowerCase().includes(q);
        const matchesFulfilled = req.fulfilledPrompt?.toLowerCase().includes(q);
        const matchesCategory = req.category?.toLowerCase().includes(q);
        const matchesAiTool = req.aiTool?.toLowerCase().includes(q);
        if (!matchesEmail && !matchesText && !matchesFulfilled && !matchesCategory && !matchesAiTool) {
          return false;
        }
      }
      return true;
    });
  }, [promptRequests, statusFilter, categoryFilter, searchQuery]);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-red-600 text-white shadow-md shadow-red-500/20">
              <MessageSquare className="w-5 h-5" />
            </span>
            <h1 className="text-xl md:text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
              Requested Prompts Manager
            </h1>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Review prompts submitted by logged-in users, craft custom AI prompts, and deliver them directly to their personal dashboard.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>{isRefreshing ? 'Syncing...' : 'Sync Requests'}</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-1">
          <div className="text-[11px] font-semibold text-neutral-500">Total Requests</div>
          <div className="text-2xl font-black text-neutral-900 dark:text-white">{totalCount}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-amber-200 dark:border-amber-900/40 shadow-sm space-y-1">
          <div className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Pending Fulfillment</span>
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{pendingCount}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-emerald-200 dark:border-emerald-900/40 shadow-sm space-y-1">
          <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Fulfilled Prompts</span>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{completedCount}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-1">
          <div className="text-[11px] font-semibold text-neutral-500 flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5" />
            <span>Unique Requesting Users</span>
          </div>
          <div className="text-2xl font-black text-neutral-900 dark:text-white">{uniqueUsersCount}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by user email, requested prompt, or tool..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex rounded-xl bg-neutral-100 dark:bg-neutral-950 p-1 border border-neutral-200 dark:border-neutral-800">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                statusFilter === 'all'
                  ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              All ({totalCount})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                statusFilter === 'pending'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                statusFilter === 'completed'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              Fulfilled ({completedCount})
            </button>
          </div>

          {/* Category Dropdown */}
          {uniqueCategories.length > 0 && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 font-bold focus:outline-none"
            >
              <option value="all">All Categories</option>
              {uniqueCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
              No prompt requests found
            </h3>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'all' || categoryFilter !== 'all'
                ? 'No requests match your current filters.'
                : 'When users submit prompt ideas from their dashboard, they will appear here for you to fulfill.'}
            </p>
          </div>
        ) : (
          filteredRequests.map((req) => (
            <div
              key={req.id}
              className="p-5 md:p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4 transition-all hover:border-neutral-300 dark:hover:border-neutral-700"
            >
              {/* Header Bar: User email, badges, and actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800 pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-neutral-900 dark:text-white bg-neutral-100 dark:bg-neutral-800 px-3 py-1 rounded-xl">
                    <Mail className="w-3.5 h-3.5 text-neutral-400" />
                    <span>{req.userEmail || 'Guest User'}</span>
                    {req.userEmail && (
                      <button
                        onClick={() => handleCopyText(req.userEmail!, `email-${req.id}`)}
                        className="text-neutral-400 hover:text-neutral-600 dark:hover:text-white ml-1"
                        title="Copy email"
                      >
                        {copiedId === `email-${req.id}` ? (
                          <Check className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </div>

                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-950/60 text-[#E60023]">
                    {req.category || 'General'}
                  </span>

                  {req.aiTool && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                      {req.aiTool}
                    </span>
                  )}

                  <span className="text-[11px] text-neutral-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(req.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {req.status === 'completed' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Fulfilled</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 text-[11px] font-bold">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Pending Fulfillment</span>
                    </span>
                  )}

                  <button
                    onClick={() => setRequestToDelete(req)}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    title="Delete Request"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Requested Text */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  User Requested Prompt Concept:
                </span>
                <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs font-medium text-neutral-800 dark:text-neutral-200 leading-relaxed whitespace-pre-wrap">
                  {req.requestText}
                </div>
              </div>

              {/* Fulfilled Prompt Display or Fulfill Action */}
              {req.status === 'completed' && req.fulfilledPrompt ? (
                <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-xs font-black text-emerald-800 dark:text-emerald-300">
                        Delivered Prompt {req.fulfilledAt ? `(on ${new Date(req.fulfilledAt).toLocaleDateString()})` : ''}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopyText(req.fulfilledPrompt!, `fulfilled-${req.id}`)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-sm transition-all"
                      >
                        {copiedId === `fulfilled-${req.id}` ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy Prompt</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleOpenFulfill(req)}
                        className="px-2.5 py-1 rounded-lg bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 text-[11px] font-bold border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                      >
                        Edit
                      </button>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-white dark:bg-neutral-900 border border-emerald-100 dark:border-emerald-900/50 font-mono text-xs text-neutral-900 dark:text-white leading-relaxed select-all">
                    {req.fulfilledPrompt}
                  </div>

                  {req.adminNotes && (
                    <div className="text-[11px] text-emerald-800 dark:text-emerald-300">
                      <strong className="font-bold">Creator Note:</strong> {req.adminNotes}
                    </div>
                  )}
                </div>
              ) : (
                <div className="pt-2 flex items-center justify-between">
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                    Awaiting admin fulfillment. Once fulfilled, the prompt will automatically sync to {req.userEmail}&apos;s dashboard.
                  </span>

                  <button
                    id={`btn-fulfill-req-${req.id}`}
                    onClick={() => handleOpenFulfill(req)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Fulfill This Request</span>
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* FULFILLMENT MODAL / DIALOG */}
      {activeFulfillRequest && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-neutral-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  <span>Fulfill Prompt Request</span>
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Delivering to: <strong className="text-neutral-800 dark:text-neutral-200">{activeFulfillRequest.userEmail}</strong>
                </p>
              </div>

              <button
                onClick={() => setActiveFulfillRequest(null)}
                className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitFulfillment} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* User concept reminder */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  User&apos;s Requested Idea ({activeFulfillRequest.category} / {activeFulfillRequest.aiTool || 'Any Engine'}):
                </span>
                <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  &ldquo;{activeFulfillRequest.requestText}&rdquo;
                </div>
              </div>

              {/* Crafted Prompt Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-neutral-900 dark:text-white">
                  Crafted AI Prompt <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={5}
                  required
                  value={fulfillmentText}
                  onChange={(e) => setFulfillmentText(e.target.value)}
                  placeholder="Paste or write the professional, high-precision prompt here (e.g. Masterpiece 8k portrait of... --ar 16:9 --v 6.1)..."
                  className="w-full p-3.5 text-xs font-mono rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Recommended Settings / Creator Tip */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-neutral-900 dark:text-white">
                  Creator Usage Tips / Settings (Optional)
                </label>
                <input
                  type="text"
                  value={fulfillmentNotes}
                  onChange={(e) => setFulfillmentNotes(e.target.value)}
                  placeholder="e.g. Aspect ratio 16:9, Midjourney v6.1, works great with negative prompt: blur, oversaturated"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setActiveFulfillRequest(null)}
                  className="px-4 py-2 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                >
                  Cancel
                </button>

                <button
                  id="btn-confirm-fulfill"
                  type="submit"
                  disabled={isSubmittingFulfillment || !fulfillmentText.trim()}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black shadow-md flex items-center gap-1.5 transition-all"
                >
                  {isSubmittingFulfillment ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Delivering...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Deliver to User Dashboard</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {requestToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Delete Prompt Request?
                </h3>
                <p className="text-xs text-neutral-500">
                  This request from {requestToDelete.userEmail || 'user'} will be permanently removed.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRequestToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-neutral-600 dark:text-neutral-400"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
