'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { PromptCard } from '@/components/public/PromptCard';
import {
  Sparkles,
  Search,
  X,
  User,
  Mail,
  FileText,
  PlusCircle,
  CheckCircle2,
  Filter,
  ArrowRight,
} from 'lucide-react';
import Image from 'next/image';

export const RequestedPromptsFeed = () => {
  const {
    posts,
    isLoadingPosts,
    categories,
    userAccount,
    openAuthModal,
    addPromptRequest,
    showToast,
    setCurrentView,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'mine' | string>('all');
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestText, setRequestText] = useState('');
  const [requestCategory, setRequestCategory] = useState('Photorealistic & Portraits');
  const [requestEmail, setRequestEmail] = useState(userAccount?.email || '');
  const [requestName, setRequestName] = useState(userAccount?.name || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter only published requested posts
  const requestedPosts = useMemo(() => {
    return posts.filter((p) => p.status === 'published' && p.isRequested === true);
  }, [posts]);

  // Filter by search query and category/mine
  const filteredPosts = useMemo(() => {
    let result = requestedPosts;

    // Filter by 'mine' (if logged in user matches email or name)
    if (activeFilter === 'mine') {
      if (userAccount?.email || userAccount?.name) {
        const uEmail = userAccount.email?.toLowerCase() || '';
        const uName = userAccount.name?.toLowerCase() || '';
        const uHandle = userAccount.username?.toLowerCase().replace('@', '') || '';

        result = result.filter((p) => {
          const matchEmail = p.requestedByEmail && p.requestedByEmail.toLowerCase() === uEmail;
          const matchName =
            p.requestedByName &&
            (p.requestedByName.toLowerCase() === uName ||
              p.requestedByName.toLowerCase() === uHandle ||
              p.requestedByName.toLowerCase().includes(uName));
          return matchEmail || matchName;
        });
      }
    } else if (activeFilter !== 'all') {
      result = result.filter(
        (p) => p.category?.toLowerCase() === activeFilter.toLowerCase()
      );
    }

    // Apply Search Query across Name, Email, Description, Title, Prompt Text, and Tags
    const q = searchQuery.trim().toLowerCase();
    if (!q) return result;

    return result.filter((p) => {
      const matchName = p.requestedByName?.toLowerCase().includes(q);
      const matchEmail = p.requestedByEmail?.toLowerCase().includes(q);
      const matchDesc = p.requestedPromptDescription?.toLowerCase().includes(q);
      const matchTitle = p.title?.toLowerCase().includes(q);
      const matchPrompt = p.promptText?.toLowerCase().includes(q);
      const matchCategory = p.category?.toLowerCase().includes(q);
      const matchTags = p.tags?.some((t) => t.toLowerCase().includes(q));

      return (
        matchName ||
        matchEmail ||
        matchDesc ||
        matchTitle ||
        matchPrompt ||
        matchCategory ||
        matchTags
      );
    });
  }, [requestedPosts, activeFilter, searchQuery, userAccount]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestText.trim()) {
      showToast('Please enter your prompt description');
      return;
    }

    setIsSubmitting(true);
    try {
      const emailToUse = requestEmail.trim() || userAccount?.email || undefined;
      const success = await addPromptRequest(requestText, requestCategory, emailToUse);
      if (success) {
        showToast('Your prompt request was submitted to our creators!');
        setIsRequestModalOpen(false);
        setRequestText('');
      }
    } catch {
      showToast('Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950 text-white p-6 sm:p-8 shadow-xl border border-neutral-800">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E60023]/20 border border-red-500/30 text-red-400 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Community Requested Prompts</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
            Custom Prompts Requested by You & Community
          </h1>

          <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
            Browse all photorealistic AI photo prompts fulfilled from user requests. Search by your
            name, email, or submitted prompt description to find your customized prompt instantly.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                if (!userAccount) {
                  openAuthModal('Sign in to submit and track your custom prompt requests');
                } else {
                  setIsRequestModalOpen(true);
                }
              }}
              id="submit-prompt-request-btn"
              className="px-5 py-2.5 rounded-full bg-[#E60023] hover:bg-[#ad081b] text-white text-xs sm:text-sm font-bold shadow-lg shadow-red-500/30 flex items-center gap-2 transition-all transform active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Request a Custom Prompt</span>
            </button>

            {userAccount && (
              <button
                onClick={() => {
                  setCurrentView('user-dashboard');
                }}
                className="px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-neutral-200 hover:text-white text-xs sm:text-sm font-bold border border-white/10 transition-colors flex items-center gap-2"
              >
                <User className="w-4 h-4" />
                <span>My Dashboard Requests</span>
              </button>
            )}
          </div>
        </div>

        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-white dark:bg-neutral-900 p-4 sm:p-5 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
        {/* Search Bar with Search Button */}
        <form onSubmit={handleSearchSubmit} className="relative flex items-center gap-2">
          <div className="relative flex-1 flex items-center">
            <Search className="w-5 h-5 text-neutral-400 absolute left-4 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by your Name, Email, or Request Description (e.g. 'Rahul', 'saree', 'portrait')..."
              className="w-full pl-11 pr-10 py-3 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-[#E60023] focus:outline-none text-neutral-900 dark:text-white placeholder-neutral-400"
              id="requested-prompts-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3.5 p-1 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            type="submit"
            id="requested-prompts-search-btn"
            className="px-5 py-3 rounded-2xl bg-[#E60023] hover:bg-[#ad081b] text-white text-xs sm:text-sm font-bold shadow-md shadow-red-500/25 flex items-center gap-2 transition-all shrink-0"
          >
            <Search className="w-4 h-4" />
            <span className="hidden sm:inline">Search</span>
          </button>
        </form>

        {/* Quick Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3.5 py-1.5 rounded-full font-bold transition-all shrink-0 ${
              activeFilter === 'all'
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-xs'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
            }`}
          >
            All Requested ({requestedPosts.length})
          </button>

          {userAccount && (
            <button
              onClick={() => setActiveFilter('mine')}
              className={`px-3.5 py-1.5 rounded-full font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                activeFilter === 'mine'
                  ? 'bg-[#E60023] text-white shadow-xs'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>My Requests Only</span>
            </button>
          )}

          {categories.slice(0, 6).map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveFilter(cat.name)}
              className={`px-3.5 py-1.5 rounded-full font-medium transition-all shrink-0 ${
                activeFilter === cat.name
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 font-bold'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 px-1">
        <div className="flex items-center gap-2">
          <span className="font-bold text-neutral-800 dark:text-neutral-200">
            {filteredPosts.length} Requested {filteredPosts.length === 1 ? 'Prompt' : 'Prompts'} Found
          </span>
          {searchQuery && (
            <span className="px-2 py-0.5 rounded-md bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 font-medium">
              matching &quot;{searchQuery}&quot;
            </span>
          )}
        </div>
      </div>

      {/* Grid of Requested Prompts */}
      {isLoadingPosts ? (
        <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-4 space-y-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="w-full h-64 bg-neutral-200 dark:bg-neutral-800 rounded-3xl animate-pulse"
            />
          ))}
        </div>
      ) : filteredPosts.length > 0 ? (
        <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-3 sm:gap-4 [column-fill:_balance]">
          {filteredPosts.map((post, idx) => (
            <PromptCard key={post.id} post={post} priority={idx < 4} />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-8 sm:p-12 text-center border border-neutral-200 dark:border-neutral-800 shadow-sm max-w-lg mx-auto space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-950/30 text-[#E60023] flex items-center justify-center mx-auto shadow-inner">
            <Sparkles className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
              {searchQuery
                ? `No requested prompts found for "${searchQuery}"`
                : 'No requested prompts found in this filter'}
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-sm mx-auto">
              Did you submit a request that isn&apos;t live yet? You can submit your custom prompt idea
              right now, and our team will fulfill it!
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="px-4 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-bold transition-colors"
              >
                Clear Search Query
              </button>
            )}

            <button
              onClick={() => {
                if (!userAccount) {
                  openAuthModal('Sign in to submit your prompt request');
                } else {
                  setIsRequestModalOpen(true);
                  if (searchQuery) {
                    setRequestText(searchQuery);
                  }
                }
              }}
              className="px-5 py-2.5 rounded-xl bg-[#E60023] hover:bg-[#ad081b] text-white text-xs font-bold shadow-md shadow-red-500/25 flex items-center justify-center gap-2 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Request This Prompt Now</span>
            </button>
          </div>
        </div>
      )}

      {/* Submit Prompt Request Modal */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
            <div className="p-6 bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900 text-white relative">
              <button
                onClick={() => setIsRequestModalOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-7 h-7 rounded-full bg-[#E60023] flex items-center justify-center text-white">
                  <Sparkles className="w-3.5 h-3.5" />
                </span>
                <span className="text-xs font-black uppercase tracking-wider text-red-400">
                  New Request
                </span>
              </div>

              <h2 className="text-xl font-black">Submit Your Prompt Request</h2>
              <p className="text-xs text-neutral-300 mt-0.5">
                Tell us what photo or prompt style you want, and we will create and publish it for
                you.
              </p>
            </div>

            <form onSubmit={handleCreateRequest} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Prompt Request Description *
                </label>
                <textarea
                  required
                  rows={3}
                  value={requestText}
                  onChange={(e) => setRequestText(e.target.value)}
                  placeholder="Describe your desired photo prompt in detail (e.g., 'Cinematic portrait of a woman in an emerald green saree with sunset golden hour bokeh...')"
                  className="w-full p-3 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white font-medium focus:ring-2 focus:ring-[#E60023] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={requestName}
                    onChange={(e) => setRequestName(e.target.value)}
                    placeholder="Rahul Sharma"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white font-medium focus:ring-2 focus:ring-[#E60023] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Your Email (for notification)
                  </label>
                  <input
                    type="email"
                    value={requestEmail}
                    onChange={(e) => setRequestEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white font-medium focus:ring-2 focus:ring-[#E60023] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Category
                </label>
                <select
                  value={requestCategory}
                  onChange={(e) => setRequestCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white font-medium focus:ring-2 focus:ring-[#E60023] focus:outline-none"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRequestModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-[#E60023] hover:bg-[#ad081b] text-white text-xs font-bold shadow-md shadow-red-500/25 flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Submitting...</span>
                  ) : (
                    <>
                      <span>Submit Request</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
