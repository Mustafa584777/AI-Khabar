'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { PromptPost, AIHistoryItem, PLAN_MONTHLY_REQUEST_LIMITS } from '@/types/prompt';
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
  Target,
  Send,
  Upload,
  Camera,
  Crown,
  ShieldCheck,
  Cloud,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Lock,
  ExternalLink,
  Zap,
} from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { RazorpayCheckoutButton } from './RazorpayCheckoutButton';

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
    isProUser,
    setIsProCheckoutModalOpen,
    planTier,
    toolCredits,
    promptRequestsRemaining,
    syncUserCloudData,
    isSyncingUserData,
    unlockedPromptIds,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'saved' | 'history' | 'taste' | 'request'>('saved');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'image_to_prompt'>('all');
  const [historySearch, setHistorySearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Request a prompt form state
  const [requestText, setRequestText] = useState('');
  const [requestCategory, setRequestCategory] = useState('Photorealistic & Portraits');
  const [aiToolPreference, setAiToolPreference] = useState('Midjourney v6.1');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [referenceImageUrl, setReferenceImageUrl] = useState('');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const activePlanAllowance = PLAN_MONTHLY_REQUEST_LIMITS[planTier || 'free'] || 0;

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAccount || !userAccount.isLoggedIn) {
      openAuthModal('Please sign in to submit a custom prompt request.');
      return;
    }
    if (!requestText.trim()) {
      showToast('Please describe the prompt you want our architects to engineer');
      return;
    }

    const hasPlanQuota = promptRequestsRemaining > 0;
    const hasPoints = (userAccount.points || 0) >= 10;
    if (!hasPlanQuota && !hasPoints) {
      showToast('You need 10 points or an active plan request quota to submit.');
      return;
    }

    setIsSubmittingRequest(true);
    try {
      const success = await addPromptRequest(requestText.trim(), requestCategory, {
        aiToolPreference,
        aspectRatio,
        referenceImageUrl: referenceImageUrl.trim() || persistentRefImage || undefined,
      });
      if (success) {
        setRequestText('');
        setReferenceImageUrl('');
      }
    } finally {
      setIsSubmittingRequest(false);
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
            onClick={() => {
              setCurrentView('public');
              router.push('/');
            }}
            className="flex items-center gap-2 text-xs sm:text-sm font-bold text-neutral-600 dark:text-neutral-300 hover:text-[#E60023] dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Feed</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                router.push('/create');
              }}
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
                {userAccount?.isLoggedIn && (
                  <button
                    onClick={() => void syncUserCloudData()}
                    disabled={isSyncingUserData}
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-[11px] font-medium transition-colors disabled:opacity-50"
                    title="Synchronize bookmarks and taste profile with Supabase cloud"
                  >
                    <Cloud className="w-3 h-3 text-emerald-500" />
                    <RefreshCw className={`w-3 h-3 ${isSyncingUserData ? 'animate-spin text-[#E60023]' : ''}`} />
                    <span>{isSyncingUserData ? 'Syncing...' : 'Cloud Synced'}</span>
                  </button>
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 border-t md:border-t-0 md:border-l border-neutral-100 dark:border-neutral-800 pt-4 md:pt-0 md:pl-6">
            <div className="text-center md:text-left">
              <div className="text-lg sm:text-xl font-black text-amber-600 dark:text-amber-400">
                {toolCredits}
              </div>
              <div className="text-[11px] text-neutral-500 font-medium">Credits Available</div>
            </div>
            <div className="text-center md:text-left">
              <div className="text-lg sm:text-xl font-black text-neutral-900 dark:text-white">
                {isProUser ? 'All (Pro)' : unlockedPromptIds.length}
              </div>
              <div className="text-[11px] text-neutral-500 font-medium">Unlocked Prompts</div>
            </div>
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

        {/* Razorpay Pro Membership Banner */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-500 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
              <Crown className="w-6 h-6" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-neutral-900 dark:text-white">
                  {isProUser ? `${(planTier || 'pro').toUpperCase()} Membership Active` : 'Upgrade to Creator Pro with Razorpay'}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-[10px] font-mono font-bold">
                  {isProUser ? 'PRO MEMBER' : 'FREE TIER'}
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {isProUser
                  ? `${toolCredits} prompt tools credits available • ${promptRequestsRemaining} prompt requests remaining • All premium prompts unlocked.`
                  : `${toolCredits} credits available. 1 credit unlocks any premium prompt • 3 credits per image extraction. Top up credits anytime.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start md:self-auto">
            {!isProUser ? (
              <>
                <RazorpayCheckoutButton
                  amount={19900}
                  planName="Pro Creator"
                  buttonText="Get Pro (₹199)"
                  variant="pill"
                  size="sm"
                />
                <button
                  onClick={() => router.push('/pricing')}
                  className="px-3.5 py-2 rounded-full border border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 text-xs font-bold text-neutral-700 dark:text-neutral-200 transition-colors"
                >
                  All Plans
                </button>
              </>
            ) : (
              <button
                onClick={() => router.push('/pricing')}
                className="px-4 py-2 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-bold hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
              >
                View Plans & Upgrade
              </button>
            )}
          </div>
        </div>



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
                  onClick={() => {
                    setCurrentView('public');
                    router.push('/');
                  }}
                  className="px-5 py-2.5 rounded-full bg-[#E60023] hover:bg-[#ad081b] text-white text-xs font-bold transition-all inline-flex items-center gap-1.5 shadow-md shadow-red-500/20"
                >
                  <Compass className="w-4 h-4" />
                  <span>Explore Prompt Feed</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                {savedPosts.map((post) => (
                  <div
                    key={post.id}
                    onClick={() => {
                      setSelectedPost(post);
                      if (typeof window !== 'undefined') {
                        window.history.pushState({ postId: post.id }, '', `/${getPromptSlug(post)}`);
                      }
                    }}
                    className="group relative rounded-2xl overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer w-full"
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
                          {post.category}
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
                  onClick={() => router.push('/create')}
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
            {/* Login Enforcement Gate */}
            {!userAccount || !userAccount.isLoggedIn ? (
              <div className="p-8 sm:p-12 text-center rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-5 max-w-2xl mx-auto my-8">
                <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/60 text-[#E60023] flex items-center justify-center mx-auto shadow-inner">
                  <Lock className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-neutral-900 dark:text-white tracking-tight">
                    Sign In to Request Custom Prompts
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed max-w-md mx-auto">
                    Only logged-in creators can submit bespoke prompt requests. Complete 10 points or use your monthly premium plan quota to have expert AI prompt architects craft your custom prompts, delivered directly and privately to your personal dashboard.
                  </p>
                </div>
                <button
                  onClick={() => openAuthModal('Sign in to submit custom prompt requests and view your private fulfilled prompts.')}
                  className="px-8 py-3.5 rounded-full bg-[#E60023] hover:bg-[#ad081b] text-white text-xs font-black transition-all inline-flex items-center gap-2 shadow-lg shadow-red-500/25 active:scale-95"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In / Create Free Account</span>
                </button>
              </div>
            ) : (
              <>
                {/* Active Request Form & Quota Section */}
                <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-6">
                  {/* Header & Plan Quota */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-100 dark:border-neutral-800">
                    <div>
                      <h3 className="text-lg font-black text-neutral-900 dark:text-white flex items-center gap-2">
                        <Target className="w-5 h-5 text-[#E60023]" />
                        <span>Request a Custom AI Prompt</span>
                      </h3>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                        Our expert prompt architects will engineer a master prompt for your vision. Once fulfilled, your custom prompt and artwork are delivered <span className="font-bold text-neutral-800 dark:text-neutral-200">privately to this dashboard</span>.
                      </p>
                    </div>

                    {/* Member Quota & Points Status Box */}
                    <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-right space-y-1 shrink-0">
                      <div className="flex items-center justify-end gap-1.5">
                        {isProUser ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-gradient-to-r from-amber-500 to-red-500 text-white flex items-center gap-1 shadow-xs">
                            <Crown className="w-2.5 h-2.5 fill-white" />
                            <span>{planTier ? planTier.toUpperCase() : 'PRO'} Member</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                            Free Member
                          </span>
                        )}
                      </div>

                      {isProUser ? (
                        <div>
                          <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                            {promptRequestsRemaining} / {activePlanAllowance} Requests Available
                          </div>
                          <div className="text-[10px] font-semibold text-neutral-400">
                            {activePlanAllowance} Monthly Requests in {planTier ? planTier.toUpperCase() : 'PRO'} Plan
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="text-sm font-black text-[#E60023]">
                            {userAccount?.points || 0} / 10 Points
                          </div>
                          <div className="text-[10px] font-semibold text-neutral-400">
                            0 in Free Plan • 10 Pts per Request
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Monthly Premium Users Plan Quotas & Limits Overview */}
                  <div className="p-4 sm:p-5 rounded-3xl bg-neutral-900 text-white border border-neutral-800 shadow-sm space-y-3.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-neutral-800">
                      <div className="flex items-center gap-2">
                        <Crown className="w-4 h-4 text-amber-400 fill-amber-400" />
                        <span className="text-xs font-black uppercase tracking-wider text-neutral-200">
                          Monthly Subscription Plan Request Quotas
                        </span>
                      </div>
                      <span className="text-[11px] text-neutral-400">
                        {isProUser ? (
                          <span className="text-amber-400 font-bold">
                            Your active {planTier ? planTier.toUpperCase() : 'PRO'} plan includes {activePlanAllowance} custom prompt requests each month
                          </span>
                        ) : (
                          <span>Monthly plans include instant prompt requests without points</span>
                        )}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {/* Starter */}
                      <div
                        className={`p-3 rounded-2xl border transition-all ${
                          planTier === 'starter'
                            ? 'bg-blue-950/50 border-blue-500/80 ring-1 ring-blue-500/30'
                            : 'bg-neutral-800/80 border-neutral-700/60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-neutral-200">Starter Plan</span>
                          {planTier === 'starter' ? (
                            <span className="px-1.5 py-0.5 rounded bg-blue-500 text-white text-[9px] font-black uppercase">Active</span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[10px] font-bold">1 / month</span>
                          )}
                        </div>
                        <div className="text-base sm:text-lg font-black text-white mt-1">1 Custom Request</div>
                        <p className="text-[10px] text-neutral-400 mt-0.5">
                          {planTier === 'starter'
                            ? `${promptRequestsRemaining} / 1 remaining this month`
                            : 'Available in Starter plan'}
                        </p>
                      </div>

                      {/* Pro */}
                      <div
                        className={`p-3 rounded-2xl border transition-all ${
                          planTier === 'pro'
                            ? 'bg-amber-950/50 border-amber-500/80 ring-1 ring-amber-500/30'
                            : 'bg-gradient-to-br from-amber-500/10 to-red-500/10 border-amber-500/30'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                            <Crown className="w-3 h-3 fill-amber-400" /> Pro Plan
                          </span>
                          {planTier === 'pro' ? (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500 text-black text-[9px] font-black uppercase">Active</span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-300 text-[10px] font-bold">3 / month</span>
                          )}
                        </div>
                        <div className="text-base sm:text-lg font-black text-amber-400 mt-1">3 Custom Requests</div>
                        <p className="text-[10px] text-neutral-400 mt-0.5">
                          {planTier === 'pro'
                            ? `${promptRequestsRemaining} / 3 remaining this month`
                            : 'Available in Pro plan'}
                        </p>
                      </div>

                      {/* VIP */}
                      <div
                        className={`p-3 rounded-2xl border transition-all ${
                          planTier === 'vip'
                            ? 'bg-purple-950/50 border-purple-500/80 ring-1 ring-purple-500/30'
                            : 'bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border-purple-500/30'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-purple-300 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-purple-400" /> VIP Plan
                          </span>
                          {planTier === 'vip' ? (
                            <span className="px-1.5 py-0.5 rounded bg-purple-500 text-white text-[9px] font-black uppercase">Active</span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded bg-purple-500/30 text-purple-300 text-[10px] font-bold">10 / month</span>
                          )}
                        </div>
                        <div className="text-base sm:text-lg font-black text-purple-400 mt-1">10 Custom Requests</div>
                        <p className="text-[10px] text-neutral-400 mt-0.5">
                          {planTier === 'vip'
                            ? `${promptRequestsRemaining} / 10 remaining this month`
                            : 'Available in VIP plan'}
                        </p>
                      </div>

                      {/* Free */}
                      <div
                        className={`p-3 rounded-2xl border transition-all ${
                          !isProUser
                            ? 'bg-neutral-800 border-neutral-600 ring-1 ring-neutral-500/30'
                            : 'bg-neutral-800/80 border-neutral-700/60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-neutral-300">Free Member</span>
                          {!isProUser ? (
                            <span className="px-1.5 py-0.5 rounded bg-neutral-700 text-neutral-200 text-[9px] font-black uppercase">Active</span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded bg-neutral-700 text-neutral-300 text-[10px] font-bold">Points</span>
                          )}
                        </div>
                        <div className="text-base sm:text-lg font-black text-neutral-300 mt-1">10 Points</div>
                        <p className="text-[10px] text-neutral-400 mt-0.5">
                          {!isProUser
                            ? `Current: ${userAccount?.points || 0}/10 Points`
                            : '0 in plan • Earned via 10 pts'}
                        </p>
                      </div>
                    </div>

                    {!isProUser && (
                      <div className="flex items-center justify-between pt-2 border-t border-neutral-800/80 text-xs">
                        <span className="text-neutral-400 text-[11px]">
                          Want monthly prompt requests without having to complete points?
                        </span>
                        <button
                          onClick={() => setIsProCheckoutModalOpen(true)}
                          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-red-500 hover:from-amber-600 hover:to-red-600 text-white font-black text-[11px] flex items-center gap-1 shadow-sm"
                        >
                          <Crown className="w-3 h-3 fill-white" />
                          <span>View Monthly Plans</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Quota / Points Eligibility Banner */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="flex items-center gap-1.5 text-neutral-800 dark:text-neutral-200">
                        {promptRequestsRemaining > 0 ? (
                          <>
                            <Zap className="w-4 h-4 text-emerald-500 fill-emerald-500" />
                            <span className="text-emerald-600 dark:text-emerald-400">
                              Monthly Plan Quota Active ({promptRequestsRemaining} requests included in your {planTier ? planTier.toUpperCase() : 'PRO'} plan)
                            </span>
                          </>
                        ) : (userAccount?.points || 0) >= 10 ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <span className="text-emerald-600 dark:text-emerald-400">
                              10 Activity Points Completed — Ready to submit!
                            </span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-4 h-4 text-amber-500" />
                            <span className="text-neutral-600 dark:text-neutral-400">
                              Progress to Request: {userAccount?.points || 0}/10 Points (Need {Math.max(0, 10 - (userAccount?.points || 0))} more points)
                            </span>
                          </>
                        )}
                      </span>
                      <span className="font-mono text-neutral-500">
                        {promptRequestsRemaining > 0 ? '100%' : `${Math.min(100, ((userAccount?.points || 0) % 10) * 10)}%`}
                      </span>
                    </div>

                    <div className="w-full h-2.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 rounded-full ${
                          promptRequestsRemaining > 0 || (userAccount?.points || 0) >= 10
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                            : 'bg-gradient-to-r from-[#E60023] to-amber-500'
                        }`}
                        style={{
                          width: promptRequestsRemaining > 0 || (userAccount?.points || 0) >= 10
                            ? '100%'
                            : `${Math.min(100, ((userAccount?.points || 0) % 10) * 10)}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* How to Earn Points Guide */}
                  {promptRequestsRemaining === 0 && (userAccount?.points || 0) < 10 && (
                    <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                          <span>Earn Points with Daily Creative Activities</span>
                        </span>
                        <button
                          onClick={() => awardPoints(2, 'generation')}
                          className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold shadow-xs"
                        >
                          +2 Bonus Points
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div className="p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-amber-200/60 dark:border-amber-800/40">
                          <div className="font-bold text-neutral-800 dark:text-neutral-200">10 Likes</div>
                          <div className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">+1 Point</div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-amber-200/60 dark:border-amber-800/40">
                          <div className="font-bold text-neutral-800 dark:text-neutral-200">5 Bookmarks</div>
                          <div className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">+1 Point</div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-amber-200/60 dark:border-amber-800/40">
                          <div className="font-bold text-neutral-800 dark:text-neutral-200">AI Studio Gen</div>
                          <div className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">+1 Point</div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-amber-200/60 dark:border-amber-800/40">
                          <div className="font-bold text-neutral-800 dark:text-neutral-200">Share Prompt</div>
                          <div className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">+2 Points</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Submission Form */}
                  <form onSubmit={handleRequestSubmit} className="space-y-4 pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                          Category
                        </label>
                        <select
                          value={requestCategory}
                          onChange={(e) => setRequestCategory(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white font-semibold focus:outline-none"
                        >
                          <option value="Photorealistic & Portraits">Photorealistic & Portraits</option>
                          <option value="Cyberpunk & Sci-Fi">Cyberpunk & Sci-Fi</option>
                          <option value="Cinematic 8K">Cinematic 8K</option>
                          <option value="Anime Masterpiece">Anime Masterpiece</option>
                          <option value="3D Render & Unreal Engine">3D Unreal Engine</option>
                          <option value="Nature & Landscapes">Nature & Landscapes</option>
                          <option value="Architecture & Interior">Architecture & Interior</option>
                          <option value="Dark Fantasy & Mythological">Dark Fantasy & Mythological</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                          Preferred AI Tool
                        </label>
                        <select
                          value={aiToolPreference}
                          onChange={(e) => setAiToolPreference(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white font-semibold focus:outline-none"
                        >
                          <option value="Midjourney v6.1">Midjourney v6.1</option>
                          <option value="Flux.1 Dev">Flux.1 Dev</option>
                          <option value="Flux.1 Schnell">Flux.1 Schnell</option>
                          <option value="Gemini Imagen 3">Gemini Imagen 3</option>
                          <option value="Stable Diffusion XL">Stable Diffusion XL</option>
                          <option value="DALL-E 3">DALL-E 3</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                          Desired Aspect Ratio
                        </label>
                        <select
                          value={aspectRatio}
                          onChange={(e) => setAspectRatio(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white font-semibold focus:outline-none"
                        >
                          <option value="16:9">16:9 (Cinematic Landscape)</option>
                          <option value="9:16">9:16 (Story / Phone Portrait)</option>
                          <option value="1:1">1:1 (Square Feed)</option>
                          <option value="4:5">4:5 (Portrait Feed)</option>
                          <option value="21:9">21:9 (Ultrawide)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Describe the image or concept you want engineered <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        rows={3}
                        required
                        value={requestText}
                        onChange={(e) => setRequestText(e.target.value)}
                        placeholder="e.g. Ultra-realistic portrait of an Indian classical dancer in traditional attire with rain pouring around her in Varanasi ghats at twilight, volumetric lantern lighting, golden hour rim lights, shot on Hasselblad..."
                        className="w-full p-3.5 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white font-medium focus:ring-2 focus:ring-red-500 focus:outline-none leading-relaxed"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Reference Image URL (Optional)
                      </label>
                      <input
                        type="url"
                        value={referenceImageUrl}
                        onChange={(e) => setReferenceImageUrl(e.target.value)}
                        placeholder={persistentRefImage ? `Using your saved reference photo: ${persistentRefImage.slice(0, 40)}...` : 'https://... (image link to guide composition)'}
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white focus:outline-none"
                      />
                    </div>

                    <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="text-[11px] text-neutral-400 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-neutral-500" />
                        <span>Private Delivery Guarantee: Fulfilled prompts only appear in your account.</span>
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmittingRequest || (promptRequestsRemaining === 0 && (userAccount?.points || 0) < 10)}
                        className="px-6 py-3 rounded-2xl bg-[#E60023] hover:bg-[#ad081b] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black shadow-md flex items-center justify-center gap-2 transition-all active:scale-95"
                      >
                        {isSubmittingRequest ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        <span>
                          {promptRequestsRemaining > 0
                            ? `Submit Request (Use 1 Plan Quota • ${promptRequestsRemaining} Left)`
                            : (userAccount?.points || 0) >= 10
                            ? 'Submit Request (Redeem 10 Points)'
                            : '10 Points Required to Submit'}
                        </span>
                      </button>
                    </div>
                  </form>
                </div>

                {/* User's Submitted & Fulfilled Requests Section */}
                <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-black text-neutral-900 dark:text-white flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#E60023]" />
                        <span>Your Requested & Fulfilled Prompts</span>
                      </h3>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                        Delivered prompts are private to your dashboard and never published on the public site feed.
                      </p>
                    </div>

                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                      {promptRequests.filter((r) => r.userId === userAccount.id || (userAccount.email && r.userEmail === userAccount.email)).length} Total
                    </span>
                  </div>

                  {promptRequests.filter((r) => r.userId === userAccount.id || (userAccount.email && r.userEmail === userAccount.email)).length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 space-y-2">
                      <Target className="w-8 h-8 text-neutral-300 dark:text-neutral-600 mx-auto" />
                      <div className="text-xs font-bold text-neutral-600 dark:text-neutral-400">
                        No requests submitted yet
                      </div>
                      <p className="text-[11px] text-neutral-400 max-w-sm mx-auto">
                        Use the form above to submit your first prompt request. Once our admin team fulfills it, your custom prompt and image will appear right here!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {promptRequests
                        .filter((r) => r.userId === userAccount.id || (userAccount.email && r.userEmail === userAccount.email))
                        .map((req) => {
                          const isFulfilled = req.status === 'fulfilled' || req.status === 'completed';
                          const isInProgress = req.status === 'in_progress';
                          const isPending = req.status === 'pending';

                          return (
                            <div
                              key={req.id}
                              className={`p-5 rounded-3xl border transition-all duration-200 space-y-4 ${
                                isFulfilled
                                  ? 'bg-emerald-500/[0.03] border-emerald-300 dark:border-emerald-800/80 shadow-sm'
                                  : 'bg-neutral-50 dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800'
                              }`}
                            >
                              {/* Request Metadata Header */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-200/70 dark:border-neutral-800/70">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="px-2.5 py-1 rounded-lg bg-red-100 dark:bg-red-950/60 text-[#E60023] text-xs font-black">
                                    {req.category}
                                  </span>
                                  {req.aiToolPreference && (
                                    <span className="px-2.5 py-1 rounded-lg bg-neutral-200/80 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-bold">
                                      {req.aiToolPreference}
                                    </span>
                                  )}
                                  {req.aspectRatio && (
                                    <span className="px-2.5 py-1 rounded-lg bg-neutral-200/80 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-bold">
                                      Ratio: {req.aspectRatio}
                                    </span>
                                  )}
                                  {req.requestedVia === 'plan_quota' || (req.userPlanTier && req.userPlanTier !== 'free') ? (
                                    <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[10px] font-bold border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                                      <Crown className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                                      <span>Monthly {req.userPlanTier ? req.userPlanTier.toUpperCase() : 'PRO'} Quota</span>
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-md bg-neutral-200/80 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 text-[10px] font-bold flex items-center gap-1">
                                      <Sparkles className="w-2.5 h-2.5 text-emerald-500" />
                                      <span>10 Points Redeemed</span>
                                    </span>
                                  )}
                                  <span className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-500 text-[10px] font-medium flex items-center gap-1">
                                    <Lock className="w-2.5 h-2.5" />
                                    <span>Private to You</span>
                                  </span>
                                  <span className="text-[11px] text-neutral-400 ml-1">
                                    Submitted {new Date(req.createdAt).toLocaleDateString()}
                                  </span>
                                </div>

                                {/* Status Badge */}
                                <div>
                                  {isFulfilled && (
                                    <span className="px-3 py-1 rounded-xl text-xs font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 border border-emerald-300 dark:border-emerald-800">
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>Fulfilled & Delivered</span>
                                    </span>
                                  )}
                                  {isInProgress && (
                                    <span className="px-3 py-1 rounded-xl text-xs font-black bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 flex items-center gap-1.5 border border-blue-200 dark:border-blue-800">
                                      <Clock className="w-3.5 h-3.5 animate-spin" />
                                      <span>In Engineering</span>
                                    </span>
                                  )}
                                  {isPending && (
                                    <span className="px-3 py-1 rounded-xl text-xs font-black bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 flex items-center gap-1.5 border border-amber-200 dark:border-amber-800">
                                      <AlertCircle className="w-3.5 h-3.5" />
                                      <span>In Queue (Pending Admin Review)</span>
                                    </span>
                                  )}
                                  {req.status === 'rejected' && (
                                    <span className="px-3 py-1 rounded-xl text-xs font-black bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 flex items-center gap-1.5 border border-red-200 dark:border-red-800">
                                      Declined (Points Refunded)
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Your Request Vision */}
                              <div className="text-xs space-y-1">
                                <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                                  Your Request:
                                </div>
                                <p className="font-medium text-neutral-800 dark:text-neutral-200 leading-relaxed italic">
                                  &ldquo;{req.requestText}&rdquo;
                                </p>
                              </div>

                              {/* Fulfilled Delivery Card (Exclusive to this user) */}
                              {isFulfilled && req.fulfilledPrompt && (
                                <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-emerald-300 dark:border-emerald-800/80 shadow-md space-y-4">
                                  {/* Delivery Guarantee Banner */}
                                  <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-emerald-100 dark:border-emerald-950">
                                    <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-xs font-black">
                                      <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                      <span>Bespoke Prompt Engineered by AI Architect</span>
                                    </div>
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center gap-1 border border-emerald-200 dark:border-emerald-800">
                                      <Lock className="w-2.5 h-2.5" />
                                      <span>Private to Your Dashboard</span>
                                    </span>
                                  </div>

                                  <div className="flex flex-col md:flex-row gap-4 items-start">
                                    {/* Fulfilled Image Preview */}
                                    {req.fulfilledImageUrl && (
                                      <div className="w-full md:w-56 h-36 rounded-2xl overflow-hidden relative border border-emerald-200 dark:border-emerald-900 shrink-0 shadow-sm">
                                        <Image
                                          src={req.fulfilledImageUrl}
                                          alt="Engineered result artwork"
                                          fill
                                          className="object-cover"
                                          referrerPolicy="no-referrer"
                                        />
                                      </div>
                                    )}

                                    {/* Fulfilled Master Prompt Text & Controls */}
                                    <div className="flex-1 w-full space-y-3">
                                      <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-emerald-200 dark:border-emerald-900/60 font-mono text-xs text-neutral-900 dark:text-white leading-relaxed select-all">
                                        {req.fulfilledPrompt}
                                      </div>

                                      {/* Engineer Advice & Parameters */}
                                      {req.fulfilledNotes && (
                                        <div className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">
                                          <span className="font-bold text-neutral-700 dark:text-neutral-300">Architect Notes: </span>
                                          {req.fulfilledNotes}
                                        </div>
                                      )}

                                      {/* Copy & Launch Buttons */}
                                      <div className="flex flex-wrap items-center gap-2 pt-1">
                                        <button
                                          onClick={(e) => handleCopyPrompt(e, req.fulfilledPrompt || '', req.id)}
                                          className="px-4 py-2 rounded-xl bg-[#E60023] hover:bg-[#ad081b] text-white text-xs font-black shadow-sm flex items-center gap-1.5 transition-colors active:scale-95"
                                        >
                                          {copiedId === req.id ? (
                                            <>
                                              <Check className="w-3.5 h-3.5" />
                                              <span>Copied to Clipboard!</span>
                                            </>
                                          ) : (
                                            <>
                                              <Copy className="w-3.5 h-3.5" />
                                              <span>Copy Master Prompt</span>
                                            </>
                                          )}
                                        </button>

                                        <button
                                          onClick={() => router.push(`/create?prompt=${encodeURIComponent(req.fulfilledPrompt || '')}`)}
                                          className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-bold transition-colors flex items-center gap-1.5"
                                        >
                                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                          <span>Open in AI Studio</span>
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
};
