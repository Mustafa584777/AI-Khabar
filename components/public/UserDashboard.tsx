'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  Edit3,
  RefreshCw,
  X,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { CARTOON_AVATARS } from '@/lib/avatar-constants';
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
    setUserAccount,
    updateUserProfile,
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
    refreshPromptRequests,
    awardPoints,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'saved' | 'history' | 'my-requested' | 'taste' | 'request'>(() => {
    if (typeof window !== 'undefined') {
      const tab = sessionStorage.getItem('promptcms_dashboard_tab');
      if (tab === 'request' || tab === 'saved' || tab === 'history' || tab === 'my-requested' || tab === 'taste') {
        sessionStorage.removeItem('promptcms_dashboard_tab');
        return tab as any;
      }
    }
    return 'saved';
  });
  const [historyFilter, setHistoryFilter] = useState<'all' | 'image_to_prompt'>('all');
  const [historySearch, setHistorySearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Profile editing state
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarFileInputRef = React.useRef<HTMLInputElement>(null);
  const [isRefreshingPoints, setIsRefreshingPoints] = useState(false);

  // Request a prompt form state (category select removed per user request)
  const [requestText, setRequestText] = useState('');

  // Auto-refresh user account & requests on mount and tab changes
  useEffect(() => {
    const acc = StorageService.getUserAccount();
    if (acc) {
      setUserAccount(acc);
    }
    void refreshPromptRequests();
  }, [activeTab, setUserAccount, refreshPromptRequests]);

  const handleOpenEditProfile = () => {
    if (!userAccount?.isLoggedIn) {
      openAuthModal('Sign in or create an account to customize your profile avatar and details.');
      return;
    }
    setEditName(userAccount.name || '');
    setEditUsername(userAccount.username || '');
    setEditAvatar(userAccount.avatar || CARTOON_AVATARS[0].url);
    setIsEditProfileOpen(true);
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be under 5MB');
      return;
    }
    setIsUploadingAvatar(true);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setEditAvatar(dataUrl);
      setIsUploadingAvatar(false);
      showToast('Profile photo selected');
    };
    reader.onerror = () => {
      setIsUploadingAvatar(false);
      showToast('Failed to load image');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      showToast('Name cannot be empty');
      return;
    }
    const cleanHandle = editUsername.trim()
      ? editUsername.startsWith('@')
        ? editUsername
        : '@' + editUsername
      : '@' + editName.toLowerCase().replace(/[^a-z0-9]/g, '');

    updateUserProfile({
      name: editName.trim(),
      username: cleanHandle,
      avatar: editAvatar || CARTOON_AVATARS[0].url,
    });
    setIsEditProfileOpen(false);
  };

  const handleRefreshPoints = () => {
    setIsRefreshingPoints(true);
    const acc = StorageService.getUserAccount();
    if (acc) {
      setUserAccount(acc);
    }
    void refreshPromptRequests();
    setTimeout(() => {
      setIsRefreshingPoints(false);
      showToast('Points & request status refreshed!');
    }, 400);
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestText.trim()) {
      showToast('Please enter your prompt request description');
      return;
    }
    const success = await addPromptRequest(requestText, 'Photorealistic & Portraits');
    if (success) {
      setRequestText('');
      const acc = StorageService.getUserAccount();
      if (acc) setUserAccount(acc);
    }
  };

  // Filtered saved posts
  const savedPosts = posts.filter((p) => bookmarkedIds.includes(p.id));

  // Fulfilled Requested posts matching current logged-in user (by email, name, handle, or fulfilled request ID)
  const myFulfilledRequestedPosts = useMemo(() => {
    if (!userAccount) return [];
    const uEmail = userAccount.email?.toLowerCase().trim() || '';
    const uName = userAccount.name?.toLowerCase().trim() || '';
    const uHandle = userAccount.username?.toLowerCase().replace('@', '').trim() || '';

    return posts.filter((p) => {
      if (p.status !== 'published' || !p.isRequested) return false;

      const pEmail = p.requestedByEmail?.toLowerCase().trim();
      const pName = p.requestedByName?.toLowerCase().trim();

      const matchEmail = Boolean(uEmail && pEmail && pEmail === uEmail);
      const matchName = Boolean(
        uName &&
          pName &&
          (pName === uName ||
            pName === uHandle ||
            pName.includes(uName) ||
            uName.includes(pName))
      );

      const matchReqItem = promptRequests.some(
        (r) =>
          r.fulfilledPostId === p.id ||
          (r.userEmail && uEmail && r.userEmail.toLowerCase().trim() === uEmail)
      );

      return matchEmail || matchName || matchReqItem;
    });
  }, [posts, userAccount, promptRequests]);

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
                <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setActiveTab('saved')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'saved'
                ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <span>Saved Pins</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'history'
                ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <span>AI History</span>
          </button>
          <button
            onClick={() => setActiveTab('my-requested')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'my-requested'
                ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <span>My Requests</span>
          </button>
          <button
            onClick={() => setActiveTab('request')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'request'
                ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
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
            <span>AI Taste Preferences</span>
          </button>
        </div>

        {/* TAB: My Requested Prompts */}
        {activeTab === 'my-requested' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {myFulfilledRequestedPosts.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-8 space-y-4">
                <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-950/50 text-[#E60023] flex items-center justify-center mx-auto shadow-inner">
                  <Sparkles className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                    No fulfilled requested prompts yet
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-500 max-w-md mx-auto">
                    When our creators publish a prompt created specifically from your custom request (matching your email or name), it will appear right here!
                  </p>
                </div>
                <div className="pt-2 flex items-center justify-center gap-3">
                  <button
                    onClick={() => setActiveTab('request')}
                    className="px-5 py-2.5 rounded-full bg-[#E60023] hover:bg-[#ad081b] text-white text-xs font-bold transition-all inline-flex items-center gap-1.5 shadow-md shadow-red-500/20"
                  >
                    <Target className="w-4 h-4" />
                    <span>Submit a Prompt Request</span>
                  </button>
                  <button
                    onClick={() => setCurrentView('for-you')}
                    className="px-4 py-2.5 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-bold transition-colors inline-flex items-center gap-1.5"
                  >
                    <Sparkles className="w-4 h-4 text-[#E60023]" />
                    <span>Explore Community Requests</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black text-neutral-900 dark:text-white flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-[#E60023]" />
                      <span>My Fulfilled Custom Prompts</span>
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      Prompts crafted especially for your creative requests. Ready to copy, refine in AI Studio, or download.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {myFulfilledRequestedPosts.map((post) => {
                    const promptSlug = getPromptSlug(post);
                    const isBookmarked = bookmarkedIds.includes(post.id);

                    return (
                      <div
                        key={post.id}
                        className="rounded-3xl overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col"
                      >
                        {/* Image Header */}
                        <div
                          className="relative aspect-video w-full bg-neutral-100 dark:bg-neutral-800 cursor-pointer overflow-hidden group"
                          onClick={() => {
                            setSelectedPost(post);
                            if (typeof window !== 'undefined') {
                              window.history.pushState({ postId: post.id }, '', `/${promptSlug}`);
                            }
                          }}
                        >
                          {post.imageUrl ? (
                            <Image
                              src={getOptimizedImageUrl(post.imageUrl, 600)}
                              alt={post.title}
                              fill
                              sizes="(max-width: 768px) 100vw, 33vw"
                              className="object-cover group-hover:scale-105 transition-transform duration-500"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-neutral-400">
                              <Sparkles className="w-8 h-8 opacity-40" />
                            </div>
                          )}

                          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-black shadow-md flex items-center gap-1">
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>Fulfilled Request</span>
                          </div>

                          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold">
                            {post.category}
                          </div>
                        </div>

                        {/* Card Body */}
                        <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                          <div className="space-y-2">
                            <h4
                              onClick={() => {
                                setSelectedPost(post);
                                if (typeof window !== 'undefined') {
                                  window.history.pushState({ postId: post.id }, '', `/${promptSlug}`);
                                }
                              }}
                              className="text-sm font-bold text-neutral-900 dark:text-white hover:text-[#E60023] transition-colors cursor-pointer line-clamp-1"
                            >
                              {post.title}
                            </h4>

                            {post.requestedPromptDescription && (
                              <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-[11px] text-neutral-600 dark:text-neutral-400">
                                <span className="font-bold text-neutral-700 dark:text-neutral-300">
                                  Original Request:
                                </span>{' '}
                                &quot;{post.requestedPromptDescription}&quot;
                              </div>
                            )}

                            <p className="text-xs text-neutral-600 dark:text-neutral-300 line-clamp-3 bg-neutral-50 dark:bg-neutral-950 p-2.5 rounded-xl font-mono text-[11px] border border-neutral-200/60 dark:border-neutral-800/60">
                              {post.promptText}
                            </p>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                            <button
                              onClick={(e) => handleCopyPrompt(e, post.promptText, post.id)}
                              className="flex-1 py-2 px-3 rounded-xl bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                            >
                              {copiedId === post.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copy Prompt</span>
                                </>
                              )}
                            </button>

                            <button
                              onClick={() => {
                                if (typeof window !== 'undefined') {
                                  sessionStorage.setItem('promptcms_studio_preload', post.promptText);
                                  if (post.imageUrl) {
                                    sessionStorage.setItem('promptcms_studio_image_preload', post.imageUrl);
                                  }
                                }
                                setCurrentView('studio-tool');
                                showToast('Loaded into AI Studio!');
                              }}
                              className="p-2 rounded-xl bg-red-50 dark:bg-red-950/60 text-[#E60023] hover:bg-red-100 transition-colors"
                              title="Open in AI Studio"
                            >
                              <Sparkles className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => toggleBookmark(post.id)}
                              className={`p-2 rounded-xl transition-colors ${
                                isBookmarked
                                  ? 'bg-red-50 dark:bg-red-950/60 text-[#E60023]'
                                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                              }`}
                              title={isBookmarked ? 'Saved' : 'Save'}
                            >
                              <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

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
                        window.history.pushState({ postId: post.id }, '', `/${getPromptSlug(post)}`);
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

            

            {/* User's Previous Requests */}
            {promptRequests && promptRequests.length > 0 && (
              <div className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Your Submitted Requests
                </h3>
                <div className="space-y-3">
                  {promptRequests.map((req) => {
                    const matchedPost = posts.find(
                      (p) =>
                        p.id === req.fulfilledPostId ||
                        (p.isRequested &&
                          p.requestedPromptDescription &&
                          p.requestedPromptDescription.toLowerCase() === req.requestText.toLowerCase())
                    );

                    return (
                      <div
                        key={req.id}
                        className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-950/60 text-[#E60023]">
                              {req.category}
                            </span>
                            <span className="text-[10px] text-neutral-400">
                              {formatTimestamp(req.createdAt)}
                            </span>
                          </div>
                          <p className="text-xs font-medium text-neutral-800 dark:text-neutral-200">
                            {req.requestText}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                          {matchedPost ? (
                            <button
                              onClick={() => {
                                setSelectedPost(matchedPost);
                                if (typeof window !== 'undefined') {
                                  window.history.pushState(
                                    { postId: matchedPost.id },
                                    '',
                                    `/${getPromptSlug(matchedPost)}`
                                  );
                                }
                              }}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition-colors"
                            >
                              <span>View Live Prompt</span>
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span
                              className={`text-[11px] font-bold px-2.5 py-1 rounded-xl ${
                                req.status === 'completed'
                                  ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50'
                                  : 'text-amber-600 bg-amber-50 dark:bg-amber-950/50'
                              }`}
                            >
                              {req.status === 'completed' ? 'Fulfilled' : 'Under Creation'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </main>
  );
};
