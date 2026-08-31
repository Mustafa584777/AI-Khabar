'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { PromptPost, AIHistoryItem } from '@/types/prompt';
import { StorageService } from '@/lib/storage';
import { getPromptSlug, getOptimizedImageUrl } from '@/lib/utils';
import {
  User,
  Bookmark,
  Sparkles,
  SlidersHorizontal,
  ArrowLeft,
  Copy,
  Check,
  Compass,
  History,
  Trash2,
  Download,
  Layers,
  Wand2,
  Clock,
  ArrowUpRight,
  LogOut,
  LogIn,
  Search,
  Filter,
  Trophy,
  Target,
  Send,
  Upload,
  Camera,
} from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export const UserDashboard = () => {
  const router = useRouter();
  const {
    posts,
    bookmarkedIds,
    toggleBookmark,
    setSelectedPost,
    setCurrentView,
    tasteProfile,
    updateTasteProfile,
    userAccount,
    logoutUser,
    openAuthModal,
    aiHistory,
    deleteAiHistoryItem,
    clearAiHistory,
    showToast,
    persistentRefImage,
    setPersistentRefImage,
    promptRequests,
    addPromptRequest,
    awardPoints,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'saved' | 'history' | 'taste' | 'request' | 'leaderboard'>('saved');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'image_to_prompt'>('all');
  const [historySearch, setHistorySearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Request a prompt form state
  const [requestText, setRequestText] = useState('');
  const [requestCategory, setRequestCategory] = useState('Photorealistic');

  const handleRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestText.trim()) {
      showToast('Please enter your prompt request description');
      return;
    }
    const success = addPromptRequest(requestText, requestCategory);
    if (success) {
      setRequestText('');
    }
  };

  // Filtered saved posts
  const savedPosts = posts.filter((p) => bookmarkedIds.includes(p.id));

  // Filtered AI history
  const filteredHistory = aiHistory.filter((item) => {
    const matchesType = historyFilter === 'all' || item.type === historyFilter;
    const matchesSearch =
      !historySearch ||
      item.title.toLowerCase().includes(historySearch.toLowerCase()) ||
      item.promptText.toLowerCase().includes(historySearch.toLowerCase()) ||
      (item.modelUsed && item.modelUsed.toLowerCase().includes(historySearch.toLowerCase()));
    return matchesType && matchesSearch;
  });

  // Top category
  const topCategory =
    Object.entries(tasteProfile.categoryAffinities || {}).sort((a, b) => b[1] - a[1])[0]?.[0] ||
    'Photorealistic';

  const handleCopyPrompt = (e: React.MouseEvent, text: string, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('Prompt copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadImage = (e: React.MouseEvent, imageUrl: string, title: string) => {
    e.stopPropagation();
    try {
      const a = document.createElement('a');
      a.href = imageUrl;
      a.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'aura-generated-art'}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast('Image download started');
    } catch {
      window.open(imageUrl, '_blank');
    }
  };

  const formatTimestamp = (timestamp: number) => {
    if (!timestamp) return 'Recently';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <main className="min-h-screen bg-[#fafafa] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 pb-24">
      {/* Top Banner Navigation */}
      <div className="sticky top-0 z-30 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl border-b border-neutral-200 dark:border-neutral-800 px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={() => setCurrentView('public')}
            className="flex items-center gap-2 text-xs sm:text-sm font-bold text-neutral-600 dark:text-neutral-300 hover:text-[#E60023] dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Feed</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentView('studio-tool')}
              className="px-3.5 py-1.5 rounded-full bg-[#E60023] hover:bg-[#ad081b] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Studio (+ Create)</span>
            </button>

            {userAccount?.isLoggedIn ? (
              <button
                onClick={logoutUser}
                className="px-3 py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-bold transition-colors flex items-center gap-1.5"
                title="Log Out of Account"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            ) : (
              <button
                onClick={() => openAuthModal('Sign in to sync your saved prompts and AI history across all devices.')}
                className="px-3.5 py-1.5 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5 text-amber-400 dark:text-amber-600" />
                <span>Sign In / Sign Up</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8">
        {/* Profile Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-[#E60023] to-amber-500 text-white flex items-center justify-center font-black text-2xl sm:text-3xl shadow-lg shadow-red-500/20 shrink-0 overflow-hidden relative">
              {userAccount?.avatar ? (
                <Image
                  src={userAccount.avatar}
                  alt={userAccount.name || 'User'}
                  fill
                  sizes="80px"
                  className="object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <User className="w-8 h-8 sm:w-10 sm:h-10" />
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white">
                  {userAccount?.isLoggedIn ? userAccount.name : 'Creator Dashboard'}
                </h1>
                {userAccount?.isLoggedIn ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">
                    Logged In
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 text-[11px] font-medium">
                    Guest Session
                  </span>
                )}
                <span className="px-2.5 py-0.5 rounded-full bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800/60 text-[#E60023] text-[11px] font-bold">
                  {tasteProfile.genderVibe === 'all'
                    ? 'All Aesthetics'
                    : `${tasteProfile.genderVibe.toUpperCase()} Focus`}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
                {userAccount?.isLoggedIn ? userAccount.email : 'Personal AI Prompt Studio'} • Top Style:{' '}
                <span className="font-semibold text-neutral-800 dark:text-neutral-200">{topCategory}</span>
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 border-t md:border-t-0 md:border-l border-neutral-100 dark:border-neutral-800 pt-4 md:pt-0 md:pl-6">
            <div className="text-center md:text-left">
              <div className="text-lg sm:text-xl font-black text-neutral-900 dark:text-white">
                {savedPosts.length}
              </div>
              <div className="text-[11px] text-neutral-500 font-medium">Saved Prompts</div>
            </div>
            <div className="text-center md:text-left">
              <div className="text-lg sm:text-xl font-black text-neutral-900 dark:text-white">
                {aiHistory.length}
              </div>
              <div className="text-[11px] text-neutral-500 font-medium">AI Generations</div>
            </div>
            <div className="text-center md:text-left">
              <div className="text-lg sm:text-xl font-black text-neutral-900 dark:text-white">
                {Object.values(tasteProfile.categoryAffinities || {}).reduce((a, b) => a + b, 0)}
              </div>
              <div className="text-[11px] text-neutral-500 font-medium">Taste Points</div>
            </div>
          </div>
        </div>

        {/* Guest Banner if not logged in */}
        {!userAccount?.isLoggedIn && (
          <div className="p-5 rounded-3xl bg-gradient-to-r from-red-500/10 via-amber-500/10 to-transparent border border-red-200 dark:border-red-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#E60023] text-white flex items-center justify-center shrink-0 shadow-md shadow-red-500/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-neutral-900 dark:text-white">
                  Save Your AI History & Prompts Forever
                </h3>
                <p className="text-[11px] sm:text-xs text-neutral-600 dark:text-neutral-400">
                  Create a free account to automatically back up your AI generations, bookmarks, and style preferences.
                </p>
              </div>
            </div>
            <button
              onClick={() => openAuthModal('Create a free account to permanently save your generations.')}
              className="px-4 py-2 rounded-full bg-[#E60023] hover:bg-[#ad081b] text-white text-xs font-bold shadow-md shadow-red-500/20 shrink-0 self-start sm:self-auto"
            >
              Create Free Account
            </button>
          </div>
        )}



        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('saved')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'saved'
                ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Bookmark className="w-4 h-4 fill-current" />
            <span>Saved Prompts ({savedPosts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'history'
                ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            <span>AI Studio History ({aiHistory.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('request')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'request'
                ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Target className="w-4 h-4 text-[#E60023]" />
            <span>Request a Prompt</span>
          </button>

          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'leaderboard'
                ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>Points Leaderboard</span>
          </button>

          <button
            onClick={() => setActiveTab('taste')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'taste'
                ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>AI Taste Preferences</span>
          </button>
        </div>

        {/* TAB 1: Saved Prompts */}
        {activeTab === 'saved' && (
          <div>
            {savedPosts.length === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-8 space-y-4">
                <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-950/50 text-[#E60023] flex items-center justify-center mx-auto">
                  <Bookmark className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                    No saved prompts yet
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-500 max-w-md mx-auto">
                    Browse prompts on the home feed and click the red bookmark icon to save them to your private collection.
                  </p>
                </div>
                <button
                  onClick={() => setCurrentView('public')}
                  className="px-5 py-2.5 rounded-full bg-[#E60023] hover:bg-[#ad081b] text-white text-xs font-bold transition-all inline-flex items-center gap-1.5 shadow-md shadow-red-500/20"
                >
                  <Compass className="w-4 h-4" />
                  <span>Explore Prompt Feed</span>
                </button>
              </div>
            ) : (
              <div className="columns-2 sm:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4">
                {savedPosts.map((post) => (
                  <div
                    key={post.id}
                    onClick={() => {
                      setSelectedPost(post);
                      if (typeof window !== 'undefined') {
                        window.history.pushState({ postId: post.id }, '', `/prompt/${getPromptSlug(post)}`);
                      }
                    }}
                    className="break-inside-avoid group relative rounded-2xl overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer"
                  >
                    {/* Image */}
                    <div className="relative w-full aspect-[3/4] bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                      {post.imageUrl ? (
                        <Image
                          src={post.imageUrl}
                          alt={post.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-400">
                          <Sparkles className="w-8 h-8" />
                        </div>
                      )}

                      {/* Top Overlay Badge */}
                      <div className="absolute top-2.5 left-2.5 z-10">
                        <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-bold">
                          {post.aiTool}
                        </span>
                      </div>

                      {/* Top Right Unsave Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleBookmark(post.id);
                        }}
                        className="absolute top-2.5 right-2.5 z-10 w-8 h-8 rounded-full bg-white/90 dark:bg-neutral-900/90 text-[#E60023] shadow-md flex items-center justify-center hover:scale-110 transition-transform"
                        title="Remove from saved"
                      >
                        <Bookmark className="w-4 h-4 fill-current" />
                      </button>
                    </div>

                    {/* Card Content */}
                    <div className="p-3.5 space-y-2">
                      <h4 className="text-xs font-bold text-neutral-900 dark:text-white line-clamp-1">
                        {post.title}
                      </h4>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-2 leading-relaxed">
                        {post.promptText}
                      </p>

                      <div className="pt-1 flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-neutral-400">
                          {post.category}
                        </span>
                        <button
                          onClick={(e) => handleCopyPrompt(e, post.promptText, post.id)}
                          className="px-2.5 py-1 rounded-full bg-[#efefef] dark:bg-neutral-800 hover:bg-[#E60023] hover:text-white text-neutral-800 dark:text-neutral-200 text-[10px] font-bold transition-colors flex items-center gap-1"
                        >
                          {copiedId === post.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-500" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: AI Studio History */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center gap-2 overflow-x-auto">
                <button
                  onClick={() => setHistoryFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    historyFilter === 'all'
                      ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  All ({aiHistory.length})
                </button>
                <button
                  onClick={() => setHistoryFilter('image_to_prompt')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    historyFilter === 'image_to_prompt'
                      ? 'bg-[#E60023] text-white'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Image to Prompt ({aiHistory.filter((i) => i.type === 'image_to_prompt').length})</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-60">
                  <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Search history..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                {aiHistory.length > 0 && (
                  <button
                    onClick={clearAiHistory}
                    className="p-2 rounded-xl text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    title="Clear All History"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* History Items Grid */}
            {filteredHistory.length === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-8 space-y-4">
                <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-950/50 text-[#E60023] flex items-center justify-center mx-auto">
                  <History className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                    No generation history found
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-500 max-w-md mx-auto">
                    Use our AI Studio to reverse engineer prompts from images or generate custom visual artwork. Your creations will appear here.
                  </p>
                </div>
                <button
                  onClick={() => setCurrentView('studio-tool')}
                  className="px-5 py-2.5 rounded-full bg-[#E60023] hover:bg-[#ad081b] text-white text-xs font-bold transition-all inline-flex items-center gap-1.5 shadow-md shadow-red-500/20"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Launch AI Studio</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-3 flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Badges & Timestamp */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                            item.type === 'image_to_prompt'
                              ? 'bg-red-50 dark:bg-red-950/60 text-[#E60023] border border-red-200 dark:border-red-900'
                              : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900'
                          }`}
                        >
                          {item.type === 'image_to_prompt' ? (
                            <>
                              <Sparkles className="w-3 h-3" />
                              <span>Image to Prompt</span>
                            </>
                          ) : (
                            <>
                              <Wand2 className="w-3 h-3" />
                              <span>Prompt to Image</span>
                            </>
                          )}
                        </span>

                        <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{formatTimestamp(item.createdAt)}</span>
                        </span>
                      </div>

                      {/* Visual Thumbnail */}
                      {item.imageUrl && (
                        <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 mb-3 group">
                          <Image
                            src={getOptimizedImageUrl(item.imageUrl, 400)}
                            alt={item.title}
                            fill
                            sizes="(max-width: 640px) 100vw, 300px"
                            className="object-cover"
                            referrerPolicy="no-referrer"
                          />
                          {item.modelUsed && (
                            <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-white text-[10px] font-bold">
                              {item.modelUsed}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Title & Prompt Text */}
                      <h4 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white line-clamp-1 mb-1">
                        {item.title}
                      </h4>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-3 bg-neutral-50 dark:bg-neutral-950 p-2.5 rounded-xl font-mono leading-relaxed select-all">
                        {item.promptText}
                      </p>

                      {/* Parameters breakdown if available */}
                      {(item.camera || item.lighting || item.aspectRatio) && (
                        <div className="mt-2.5 flex flex-wrap gap-1 text-[10px]">
                          {item.aspectRatio && (
                            <span className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-semibold">
                              AR: {item.aspectRatio}
                            </span>
                          )}
                          {item.camera && (
                            <span className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-semibold">
                              📷 {item.camera}
                            </span>
                          )}
                          {item.lighting && (
                            <span className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-semibold">
                              💡 {item.lighting}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action Bar */}
                    <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-2">
                      <button
                        onClick={(e) => handleCopyPrompt(e, item.promptText, item.id)}
                        className="px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-[#E60023] hover:text-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-bold transition-all flex items-center gap-1.5"
                      >
                        {copiedId === item.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Prompt</span>
                          </>
                        )}
                      </button>

                      <div className="flex items-center gap-1">
                        {item.imageUrl && (
                          <button
                            onClick={(e) => handleDownloadImage(e, item.imageUrl!, item.title)}
                            className="p-2 rounded-xl text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                            title="Download Art"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => deleteAiHistoryItem(item.id)}
                          className="p-2 rounded-xl text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                          title="Delete from history"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: AI Taste Profile Controls */}
        {activeTab === 'taste' && (
          <div className="space-y-6">
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-6">
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#E60023]" />
                  <span>Persona & Subject Vibe</span>
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  Tell our AI recommendation algorithm which subjects you prefer on your homepage.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { id: 'all', label: 'All Aesthetics' },
                  { id: 'male', label: 'Men & Male Portraits' },
                  { id: 'female', label: 'Women & Fashion' },
                  { id: 'anime', label: 'Anime & Manga' },
                  { id: 'tech', label: 'Sci-Fi & Cyberpunk' },
                  { id: 'aesthetic', label: 'Nature & Aesthetics' },
                  { id: 'creative', label: 'Creative & 3D Art' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => updateTasteProfile({ genderVibe: item.id as any })}
                    className={`p-3.5 rounded-2xl border text-xs font-bold transition-all text-left flex items-center justify-between ${
                      tasteProfile.genderVibe === item.id
                        ? 'bg-[#E60023] text-white border-[#E60023] shadow-md shadow-red-500/20'
                        : 'bg-neutral-50 dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 hover:border-neutral-400'
                    }`}
                  >
                    <span>{item.label}</span>
                    {tasteProfile.genderVibe === item.id && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Favorite Styles */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  Favorite Visual Aesthetics
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Select key lighting, optical, and stylistic tags you want boosted in your feed.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  'Cinematic 8K',
                  'Photorealistic',
                  'Editorial 35mm',
                  'Studio Portrait',
                  'Volumetric Lighting',
                  'Anime Masterpiece',
                  'Cyberpunk Neon',
                  'Unreal Engine 5',
                  'Minimalist Vector',
                  'Fantasy Mythological',
                  'Vintage Film Grain',
                  'Dark Luxury',
                ].map((style) => {
                  const isSelected = tasteProfile.favoriteStyles?.includes(style);
                  return (
                    <button
                      key={style}
                      onClick={() => {
                        const current = tasteProfile.favoriteStyles || [];
                        const updated = isSelected
                          ? current.filter((s) => s !== style)
                          : [...current, style];
                        updateTasteProfile({ favoriteStyles: updated });
                      }}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-neutral-900 dark:border-white shadow-sm'
                          : 'bg-neutral-50 dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:border-neutral-400'
                      }`}
                    >
                      <span>{style}</span>
                      {isSelected && <Check className="w-3 h-3" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Interaction Points */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Live Category Engagement Scores
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(tasteProfile.categoryAffinities || {}).map(([cat, pts]) => (
                  <div
                    key={cat}
                    className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between"
                  >
                    <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                      {cat}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/70 text-[#E60023] text-[11px] font-black">
                      +{pts} pts
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Request a Prompt */}
        {activeTab === 'request' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black text-neutral-900 dark:text-white flex items-center gap-2">
                    <Target className="w-5 h-5 text-[#E60023]" />
                    <span>Request a Custom AI Prompt</span>
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    Complete activities to fill your 10-point progress bar and request custom AI prompt generation from our expert creators.
                  </p>
                </div>

                {/* Progress Bar Badge */}
                <div className="px-4 py-2 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-right">
                  <div className="text-xs font-bold text-neutral-500">Current Cycle Points</div>
                  <div className="text-lg font-black text-[#E60023]">
                    {userAccount?.points || 0} / 10 Points
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>Progress to Request</span>
                  <span>{Math.min(100, ((userAccount?.points || 0) % 10) * 10)}%</span>
                </div>
                <div className="w-full h-3 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#E60023] to-amber-500 transition-all duration-500 rounded-full"
                    style={{ width: `${Math.min(100, ((userAccount?.points || 0) % 10) * 10)}%` }}
                  />
                </div>
              </div>

              {/* Activity Guide */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs space-y-1">
                  <div className="font-bold text-neutral-900 dark:text-white">10 Likes</div>
                  <div className="text-neutral-500">+1 Point</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs space-y-1">
                  <div className="font-bold text-neutral-900 dark:text-white">5 Saves / Bookmarks</div>
                  <div className="text-neutral-500">+1 Point</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs space-y-1">
                  <div className="font-bold text-neutral-900 dark:text-white">AI Image / Prompt Gen</div>
                  <div className="text-neutral-500">+1 Point</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs space-y-1">
                  <div className="font-bold text-neutral-900 dark:text-white">Share with Friend</div>
                  <div className="text-neutral-500">+2 Points</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs space-y-1">
                  <div className="font-bold text-neutral-900 dark:text-white">Friend Login / Referral</div>
                  <div className="text-neutral-500">+5 Points</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                  <span className="text-xs font-bold">Quick Test Activity</span>
                  <button
                    onClick={() => awardPoints(2, 'generation')}
                    className="px-3 py-1 rounded-xl bg-[#E60023] text-white text-[11px] font-bold hover:bg-red-700"
                  >
                    +2 Points
                  </button>
                </div>
              </div>

              {/* Request Form */}
              <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 space-y-4">
                <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Submit Prompt Request {((userAccount?.points || 0) < 10) && '(Requires 10 Points)'}
                </h4>

                <form onSubmit={handleRequestSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                      Category
                    </label>
                    <select
                      value={requestCategory}
                      onChange={(e) => setRequestCategory(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white font-bold"
                    >
                      <option value="Photorealistic">Photorealistic & Portraits</option>
                      <option value="Cyberpunk">Cyberpunk & Sci-Fi</option>
                      <option value="Cinematic">Cinematic 8K</option>
                      <option value="Anime">Anime Masterpiece</option>
                      <option value="3D Render">3D Unreal Engine</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                      Describe what you want the prompt to generate
                    </label>
                    <textarea
                      rows={3}
                      value={requestText}
                      onChange={(e) => setRequestText(e.target.value)}
                      placeholder="e.g. A futuristic cyberpunk geisha standing in a neon Tokyo alleyway with volumetric teal lighting..."
                      className="w-full p-3.5 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white font-medium focus:ring-2 focus:ring-red-500 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={(userAccount?.points || 0) < 10}
                    className="px-6 py-3 rounded-2xl bg-[#E60023] hover:bg-[#ad081b] disabled:opacity-50 text-white text-xs font-black shadow-md flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>Submit Prompt Request (10 Points)</span>
                  </button>
                </form>
              </div>
            </div>

            {/* User's Previous Requests */}
            {promptRequests && promptRequests.length > 0 && (
              <div className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Your Submitted Requests
                </h3>
                <div className="space-y-3">
                  {promptRequests.map((req) => (
                    <div key={req.id} className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-950/60 text-[#E60023]">
                          {req.category}
                        </span>
                        <p className="text-xs font-medium text-neutral-800 dark:text-neutral-200">
                          {req.promptDescription}
                        </p>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-xl">
                        {req.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: Points Leaderboard */}
        {activeTab === 'leaderboard' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-neutral-900 dark:text-white flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    <span>Global Points Leaderboard</span>
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    Top creators ranked by total earned activity points across AI generations, likes, and saves.
                  </p>
                </div>
              </div>

              {/* Leaderboard Table */}
              <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {StorageService.getLeaderboardUsers().map((u, index) => {
                  const isTop3 = index < 3;
                  const rankColors = index === 0 ? 'bg-amber-500 text-white' : index === 1 ? 'bg-neutral-400 text-white' : index === 2 ? 'bg-amber-700 text-white' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300';
                  return (
                    <div key={u.id} className="py-4 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center shrink-0 ${rankColors}`}>
                          #{index + 1}
                        </div>
                        <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden shrink-0 relative">
                          {u.avatar ? (
                            <Image src={u.avatar} alt={u.name} fill sizes="40px" className="object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <User className="w-full h-full p-2 text-neutral-500" />
                          )}
                        </div>
                        <div>
                          <div className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                            <span>{u.name}</span>
                            {u.email === userAccount?.email && (
                              <span className="px-2 py-0.5 rounded-full bg-red-50 text-[#E60023] text-[9px] font-black">
                                You
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-neutral-500">{u.email}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm sm:text-base font-black text-neutral-900 dark:text-white">
                          {u.points} pts
                        </div>
                        <span className="text-[10px] text-neutral-400 font-semibold">Rank {index + 1}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};
