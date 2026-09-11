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
  Target,
  Send,
  Upload,
  Camera,
  Crown,
  ShieldCheck,
  Cloud,
  RefreshCw,
  Lock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  FileText,
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
    userPromptRequests,
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
  const [requestCategory, setRequestCategory] = useState('Photorealistic');
  const [requestAiTool, setRequestAiTool] = useState('Midjourney v6.1');
  const [requestAspectRatio, setRequestAspectRatio] = useState('16:9');
  const [requestRefUrl, setRequestRefUrl] = useState('');
  const [requestSourceChoice, setRequestSourceChoice] = useState<'plan' | 'points'>('plan');
  const [userRequestStatusFilter, setUserRequestStatusFilter] = useState<'all' | 'fulfilled' | 'pending'>('all');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAccount?.isLoggedIn) {
      openAuthModal('Please sign in or create an account to submit a prompt request.');
      return;
    }
    if (!requestText.trim()) {
      showToast('Please describe what kind of prompt you want engineered');
      return;
    }

    const hasPlanQuota = promptRequestsRemaining > 0;
    const hasPoints = (userAccount?.points || 0) >= 10;

    if (!hasPlanQuota && !hasPoints) {
      showToast('You need 10 points or an active plan request quota to submit.');
      return;
    }

    const source = (hasPlanQuota && requestSourceChoice === 'plan') || !hasPoints ? 'plan' : 'points';

    setIsSubmittingRequest(true);
    try {
      const success = await addPromptRequest(requestText, requestCategory, {
        aiToolPreference: requestAiTool,
        aspectRatio: requestAspectRatio,
        referenceImageUrl: requestRefUrl.trim() || undefined,
        source,
      });

      if (success) {
        setRequestText('');
        setRequestRefUrl('');
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
            {/* Login Barrier if user is not logged in */}
            {!userAccount?.isLoggedIn ? (
              <div className="p-8 sm:p-10 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xl text-center space-y-5">
                <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-950/60 text-[#E60023] flex items-center justify-center mx-auto shadow-inner">
                  <Lock className="w-7 h-7" />
                </div>
                <div className="max-w-md mx-auto space-y-2">
                  <h3 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
                    Login Required to Request Custom Prompts
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                    Custom AI prompt requests and point accumulation are exclusively available to authenticated members. Sign in or register to request custom prompts, earn activity points, and track your orders.
                  </p>
                </div>
                <div className="pt-2 flex flex-wrap justify-center gap-3">
                  <button
                    onClick={() => openAuthModal('Sign in to submit custom prompt requests and track your fulfilled prompts.')}
                    className="px-6 py-3 rounded-2xl bg-[#E60023] hover:bg-[#ad081b] text-white text-xs font-black shadow-lg shadow-red-600/25 transition-all flex items-center gap-2"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Sign In / Create Account</span>
                  </button>
                  <button
                    onClick={() => setIsProCheckoutModalOpen(true)}
                    className="px-5 py-3 rounded-2xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-bold transition-all flex items-center gap-2"
                  >
                    <Crown className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span>View Pro Plans</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* 1. Monthly Premium Requests & Points Status Card */}
                <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="p-1.5 rounded-xl bg-red-100 dark:bg-red-950/60 text-[#E60023]">
                          <Target className="w-4 h-4" />
                        </span>
                        <h3 className="text-lg font-black text-neutral-900 dark:text-white">
                          Custom Prompt Request Quota & Points
                        </h3>
                      </div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        Request tailored AI prompts crafted by experts. Use your monthly plan quota or complete 10 points through community engagement.
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <span className="px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5 border border-neutral-200 dark:border-neutral-700">
                        <Crown className={`w-3.5 h-3.5 ${planTier !== 'free' ? 'text-amber-500 fill-amber-500' : 'text-neutral-400'}`} />
                        <span>{planTier.toUpperCase()} Member</span>
                      </span>
                      {planTier === 'free' && (
                        <button
                          onClick={() => setIsProCheckoutModalOpen(true)}
                          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-red-600 text-white text-xs font-bold shadow-sm hover:opacity-95 transition-opacity"
                        >
                          Upgrade Plan
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Quota Highlights Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Card A: Monthly Plan Quota */}
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-red-500/5 to-transparent dark:from-amber-950/40 dark:via-red-950/20 dark:to-transparent border border-amber-200 dark:border-amber-800/60 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-amber-700 dark:text-amber-300">
                        <span className="flex items-center gap-1.5">
                          <Crown className="w-4 h-4 text-amber-500 fill-amber-500" />
                          Monthly Plan Requests
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-amber-200/60 dark:bg-amber-900/60 font-black">
                          {planTier === 'free' ? '0 / mo' : planTier === 'starter' ? '1 / mo' : planTier === 'vip' ? '10 / mo' : '3 / mo'}
                        </span>
                      </div>
                      <div className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white">
                        {promptRequestsRemaining}{' '}
                        <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400 font-normal">
                          available this month
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-600 dark:text-neutral-400">
                        {promptRequestsRemaining > 0
                          ? 'Included with your active membership tier.'
                          : planTier === 'free'
                          ? 'Upgrade to Pro to receive 3 to 10 prompt requests every month.'
                          : 'Monthly quota exhausted. You can use 10 activity points to submit extra requests!'}
                      </p>
                    </div>

                    {/* Card B: Activity Points Balance */}
                    <div className="p-5 rounded-2xl bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-neutral-700 dark:text-neutral-300">
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-[#E60023]" />
                          Activity Points
                        </span>
                        <span className="text-[11px] font-black text-neutral-500">
                          Goal: 10 pts = 1 request
                        </span>
                      </div>
                      <div className="text-2xl sm:text-3xl font-black text-[#E60023]">
                        {userAccount?.points || 0}{' '}
                        <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400 font-normal">
                          / 10 points
                        </span>
                      </div>
                      {/* Progress Bar */}
                      <div className="w-full h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#E60023] to-amber-500 rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(100, Math.round(((userAccount?.points || 0) % 10) * 10))}%`,
                          }}
                        />
                      </div>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                        {(userAccount?.points || 0) >= 10
                          ? '🎉 10 points complete! You can redeem a custom prompt right now.'
                          : `${10 - ((userAccount?.points || 0) % 10)} more point(s) needed to unlock a free request.`}
                      </p>
                    </div>

                    {/* Card C: Plan Allowance Reference */}
                    <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-2 sm:col-span-2 lg:col-span-1">
                      <div className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center justify-between">
                        <span>Plan Allowances</span>
                        <ShieldCheck className="w-4 h-4 text-blue-500" />
                      </div>
                      <div className="text-xs space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-400">
                          <span>Free Plan</span>
                          <span className="font-bold text-neutral-800 dark:text-neutral-200">10 Pts / Request</span>
                        </div>
                        <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-400">
                          <span>Starter (₹199)</span>
                          <span className="font-bold text-neutral-800 dark:text-neutral-200">1 Request / mo</span>
                        </div>
                        <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-400">
                          <span>Pro Plan (₹499)</span>
                          <span className="font-bold text-amber-600 dark:text-amber-400">3 Requests / mo</span>
                        </div>
                        <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-400">
                          <span>VIP Plan (₹999)</span>
                          <span className="font-bold text-red-600 dark:text-red-400">10 Requests / mo</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Activity Points Earning Guide */}
                  <div className="pt-2">
                    <div className="text-xs font-bold text-neutral-600 dark:text-neutral-400 mb-2">
                      Ways to Earn Points (Completed 10 Points = 1 Prompt Request):
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                      <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-center">
                        <div className="text-[11px] font-bold text-neutral-900 dark:text-white">10 Likes</div>
                        <div className="text-[10px] text-[#E60023] font-black">+1 Point</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-center">
                        <div className="text-[11px] font-bold text-neutral-900 dark:text-white">5 Saves</div>
                        <div className="text-[10px] text-[#E60023] font-black">+1 Point</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-center">
                        <div className="text-[11px] font-bold text-neutral-900 dark:text-white">AI Gen</div>
                        <div className="text-[10px] text-[#E60023] font-black">+1 Point</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-center">
                        <div className="text-[11px] font-bold text-neutral-900 dark:text-white">Share</div>
                        <div className="text-[10px] text-[#E60023] font-black">+2 Points</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-center">
                        <div className="text-[11px] font-bold text-neutral-900 dark:text-white">Referral</div>
                        <div className="text-[10px] text-[#E60023] font-black">+5 Points</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center">
                        <button
                          onClick={() => awardPoints(2, 'generation')}
                          className="w-full py-1 rounded-lg bg-[#E60023] text-white text-[11px] font-bold hover:bg-red-700 transition-colors"
                          title="Click to simulate points from activity"
                        >
                          +2 Test Pts
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Submit Prompt Request Form */}
                <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-base font-black text-neutral-900 dark:text-white">
                        Submit a New Custom Prompt Request
                      </h4>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                        Our prompt engineers will craft and test this prompt, then deliver it directly to this dashboard.
                      </p>
                    </div>
                  </div>

                  {/* Submission Source Selector (Plan Quota vs 10 Points) */}
                  {(promptRequestsRemaining > 0 && (userAccount?.points || 0) >= 10) && (
                    <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                        Select redemption method:
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setRequestSourceChoice('plan')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                            requestSourceChoice === 'plan'
                              ? 'bg-amber-500 text-white'
                              : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                          }`}
                        >
                          Use Plan Request ({promptRequestsRemaining} Left)
                        </button>
                        <button
                          type="button"
                          onClick={() => setRequestSourceChoice('points')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                            requestSourceChoice === 'points'
                              ? 'bg-[#E60023] text-white'
                              : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                          }`}
                        >
                          Use 10 Points ({userAccount?.points || 0} Total)
                        </button>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleRequestSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      <div>
                        <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                          Visual Category
                        </label>
                        <select
                          value={requestCategory}
                          onChange={(e) => setRequestCategory(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white font-bold"
                        >
                          <option value="Photorealistic">Photorealistic & Portraits</option>
                          <option value="Cyberpunk">Cyberpunk & Sci-Fi</option>
                          <option value="Cinematic">Cinematic 8K Film</option>
                          <option value="Anime">Anime & Manga Masterpiece</option>
                          <option value="3D Render">3D Unreal Engine 5</option>
                          <option value="Fantasy">Fantasy & Concept Art</option>
                          <option value="Commercial">Product & Commercial</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                          Preferred AI Tool
                        </label>
                        <select
                          value={requestAiTool}
                          onChange={(e) => setRequestAiTool(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white font-bold"
                        >
                          <option value="Midjourney v6.1">Midjourney v6.1</option>
                          <option value="Flux.1 Dev">Flux.1 Dev / Schnell</option>
                          <option value="Ideogram 2.0">Ideogram 2.0 (Typography)</option>
                          <option value="DALL-E 3">OpenAI DALL-E 3</option>
                          <option value="Stable Diffusion XL">Stable Diffusion XL</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                          Aspect Ratio
                        </label>
                        <select
                          value={requestAspectRatio}
                          onChange={(e) => setRequestAspectRatio(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white font-bold"
                        >
                          <option value="16:9">16:9 Landscape (Desktop/YouTube)</option>
                          <option value="9:16">9:16 Vertical (Stories/Reels)</option>
                          <option value="1:1">1:1 Square (Instagram/Avatar)</option>
                          <option value="4:5">4:5 Social Portrait</option>
                          <option value="21:9">21:9 Ultra Cinematic</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                        Describe what you want the prompt to generate
                      </label>
                      <textarea
                        rows={3}
                        value={requestText}
                        onChange={(e) => setRequestText(e.target.value)}
                        placeholder="e.g. Ultra-realistic portrait of an Indian bride with intricate royal gold jewelry, volumetric warm sunset lighting, 85mm portrait lens bokeh, sharp skin textures..."
                        className="w-full p-3.5 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white font-medium focus:ring-2 focus:ring-red-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                        Reference Image URL (Optional)
                      </label>
                      <input
                        type="url"
                        value={requestRefUrl}
                        onChange={(e) => setRequestRefUrl(e.target.value)}
                        placeholder="https://example.com/reference-image.jpg"
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white font-medium focus:ring-2 focus:ring-red-500 focus:outline-none"
                      />
                    </div>

                    <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="text-xs text-neutral-500">
                        {promptRequestsRemaining > 0
                          ? `Will use 1 of your ${promptRequestsRemaining} included monthly requests.`
                          : (userAccount?.points || 0) >= 10
                          ? 'Will redeem 10 activity points upon submission.'
                          : `Requires 10 points (You currently have ${userAccount?.points || 0}/10 points).`}
                      </div>

                      <button
                        type="submit"
                        disabled={
                          isSubmittingRequest ||
                          (promptRequestsRemaining === 0 && (userAccount?.points || 0) < 10)
                        }
                        className="px-6 py-3 rounded-2xl bg-[#E60023] hover:bg-[#ad081b] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-black shadow-md flex items-center justify-center gap-2 transition-all"
                      >
                        {isSubmittingRequest ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Submitting Request...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            <span>
                              {promptRequestsRemaining > 0
                                ? 'Submit with Monthly Plan Quota'
                                : (userAccount?.points || 0) >= 10
                                ? 'Submit Request (Use 10 Points)'
                                : 'Need 10 Points to Submit'}
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>

                {/* 3. User's Private Requested Prompts List */}
                <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-black text-neutral-900 dark:text-white flex items-center gap-2">
                        <span>Your Requested Prompts</span>
                        <span className="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs font-bold text-neutral-700 dark:text-neutral-300">
                          {userPromptRequests.length}
                        </span>
                      </h3>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                        Track your prompt requests. Fulfilled prompts are delivered privately to you below.
                      </p>
                    </div>

                    {/* Filter Tabs */}
                    {userPromptRequests.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setUserRequestStatusFilter('all')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                            userRequestStatusFilter === 'all'
                              ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
                          }`}
                        >
                          All ({userPromptRequests.length})
                        </button>
                        <button
                          onClick={() => setUserRequestStatusFilter('fulfilled')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                            userRequestStatusFilter === 'fulfilled'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
                          }`}
                        >
                          Fulfilled ({userPromptRequests.filter((r) => r.status === 'fulfilled' || r.status === 'completed').length})
                        </button>
                        <button
                          onClick={() => setUserRequestStatusFilter('pending')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                            userRequestStatusFilter === 'pending'
                              ? 'bg-amber-500 text-white'
                              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
                          }`}
                        >
                          Pending ({userPromptRequests.filter((r) => r.status === 'pending' || r.status === 'in_progress').length})
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Privacy notice banner */}
                  <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-2.5 text-xs text-emerald-800 dark:text-emerald-300">
                    <Lock className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                    <div>
                      <span className="font-bold">Private & Exclusive Delivery:</span> Once fulfilled by the admin team, your engineered prompt and artwork appear exclusively right here in your private account dashboard. They are never published to the public feed or visible to other users.
                    </div>
                  </div>

                  {/* Request Cards */}
                  {userPromptRequests.length === 0 ? (
                    <div className="py-12 text-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 flex items-center justify-center mx-auto">
                        <Target className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-bold text-neutral-600 dark:text-neutral-400">
                        You have not submitted any prompt requests yet.
                      </p>
                      <p className="text-[11px] text-neutral-400 max-w-sm mx-auto">
                        Complete activities to gain 10 points or use your monthly plan quota to request custom prompt engineering.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {userPromptRequests
                        .filter((r) => {
                          if (userRequestStatusFilter === 'fulfilled')
                            return r.status === 'fulfilled' || r.status === 'completed';
                          if (userRequestStatusFilter === 'pending')
                            return r.status === 'pending' || r.status === 'in_progress';
                          return true;
                        })
                        .map((req) => {
                          const isFulfilled = req.status === 'fulfilled' || req.status === 'completed';

                          return (
                            <div
                              key={req.id}
                              className={`p-5 rounded-2xl border transition-all ${
                                isFulfilled
                                  ? 'bg-gradient-to-br from-emerald-500/5 via-white to-white dark:from-emerald-950/30 dark:via-neutral-900 dark:to-neutral-900 border-emerald-300 dark:border-emerald-800 shadow-sm'
                                  : 'bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800'
                              }`}
                            >
                              {/* Card Header */}
                              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-neutral-100 dark:border-neutral-800/80">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-[#E60023]">
                                    {req.category}
                                  </span>
                                  {req.aiToolPreference && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                                      {req.aiToolPreference}
                                    </span>
                                  )}
                                  {req.aspectRatio && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                                      {req.aspectRatio}
                                    </span>
                                  )}
                                  {req.requestSource === 'plan' && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                                      Plan Quota
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] text-neutral-400">
                                    {formatTimestamp(req.createdAt)}
                                  </span>
                                  <span
                                    className={`text-[11px] font-black px-3 py-1 rounded-xl flex items-center gap-1.5 ${
                                      isFulfilled
                                        ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                        : req.status === 'in_progress'
                                        ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300'
                                        : req.status === 'rejected'
                                        ? 'bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300'
                                        : 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300'
                                    }`}
                                  >
                                    {isFulfilled ? (
                                      <>
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>Fulfilled & Ready</span>
                                      </>
                                    ) : req.status === 'in_progress' ? (
                                      <>
                                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                                        <span>Engineering Prompt</span>
                                      </>
                                    ) : req.status === 'rejected' ? (
                                      <>
                                        <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                                        <span>Declined</span>
                                      </>
                                    ) : (
                                      <>
                                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                                        <span>Pending Review</span>
                                      </>
                                    )}
                                  </span>
                                </div>
                              </div>

                              {/* User Request Description */}
                              <div className="pt-3 space-y-1">
                                <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                                  Your Request
                                </div>
                                <p className="text-xs font-medium text-neutral-800 dark:text-neutral-200 leading-relaxed">
                                  {req.requestText}
                                </p>
                              </div>

                              {/* FULFILLED PROMPT SECTION (Private delivery) */}
                              {isFulfilled && req.fulfilledPrompt && (
                                <div className="mt-4 p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-emerald-200 dark:border-emerald-800/60 shadow-sm space-y-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 text-xs font-black text-emerald-700 dark:text-emerald-400">
                                      <Lock className="w-3.5 h-3.5" />
                                      <span>Your Fulfilled Master Prompt (Private)</span>
                                    </div>
                                    <button
                                      onClick={(e) => handleCopyPrompt(e, req.fulfilledPrompt!, req.id)}
                                      className="px-3 py-1.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-black hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-sm"
                                    >
                                      {copiedId === req.id ? (
                                        <>
                                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                                          <span>Copied!</span>
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="w-3.5 h-3.5" />
                                          <span>Copy Master Prompt</span>
                                        </>
                                      )}
                                    </button>
                                  </div>

                                  {/* Prompt Text Container */}
                                  <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 font-mono text-xs text-neutral-800 dark:text-neutral-200 select-all leading-relaxed break-words">
                                    {req.fulfilledPrompt}
                                  </div>

                                  {/* Fulfilled Image Preview (if provided by Admin) */}
                                  {req.fulfilledImageUrl && (
                                    <div className="pt-2 space-y-2">
                                      <div className="text-[11px] font-bold text-neutral-500 flex items-center justify-between">
                                        <span>Generated Sample Preview</span>
                                        <button
                                          onClick={(e) =>
                                            handleDownloadImage(
                                              e,
                                              req.fulfilledImageUrl!,
                                              req.requestText.slice(0, 30)
                                            )
                                          }
                                          className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                                        >
                                          <Download className="w-3 h-3" />
                                          <span>Download Image</span>
                                        </button>
                                      </div>
                                      <div className="relative h-64 sm:h-80 w-full rounded-xl overflow-hidden bg-neutral-950 border border-neutral-200 dark:border-neutral-800 group">
                                        <Image
                                          src={getOptimizedImageUrl(req.fulfilledImageUrl, 1200)}
                                          alt="Fulfilled Prompt Artwork"
                                          fill
                                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                                          referrerPolicy="no-referrer"
                                          unoptimized
                                        />
                                      </div>
                                    </div>
                                  )}

                                  {/* AI Tool & Aspect Ratio details */}
                                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-neutral-500 dark:text-neutral-400 pt-1">
                                    {req.fulfilledAiTool && (
                                      <span>
                                        Engineered for: <strong className="text-neutral-800 dark:text-neutral-200">{req.fulfilledAiTool}</strong>
                                      </span>
                                    )}
                                    {req.fulfilledAt && (
                                      <span>
                                        Delivered: <strong className="text-neutral-800 dark:text-neutral-200">{formatTimestamp(req.fulfilledAt)}</strong>
                                      </span>
                                    )}
                                  </div>

                                  {/* Admin Notes */}
                                  {(req.fulfilledNotes || req.adminNotes) && (
                                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/40 text-xs text-amber-900 dark:text-amber-200">
                                      <span className="font-bold">Engineer&apos;s Advice: </span>
                                      {req.fulfilledNotes || req.adminNotes}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Pending Status Banner */}
                              {!isFulfilled && req.status !== 'rejected' && (
                                <div className="mt-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
                                  <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                  <span>
                                    Our prompt engineers are testing your request. Once fulfilled, your prompt and preview will appear right here.
                                  </span>
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
