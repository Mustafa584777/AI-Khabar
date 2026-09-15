'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useApp } from '@/context/AppContext';
import { PromptRequestItem } from '@/types/prompt';
import {
  Sparkles,
  Heart,
  MessageSquarePlus,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Send,
  User,
} from 'lucide-react';

export const RequestedPromptsFeed = () => {
  const {
    promptRequests,
    submitPromptRequest,
    userAccount,
    openAuthModal,
    showToast,
    posts,
    setSelectedPost,
  } = useApp();

  const [requestText, setRequestText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Photorealistic & Portraits');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [likedRequests, setLikedRequests] = useState<Record<string, boolean>>({});

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestText.trim()) return;

    if (!userAccount) {
      openAuthModal('Please sign in or create an account to submit a prompt request.');
      return;
    }

    try {
      await submitPromptRequest(requestText.trim(), selectedCategory);
      setRequestText('');
      showToast('Your prompt request has been submitted to the community creators!');
    } catch {
      showToast('Failed to submit request. Please try again.');
    }
  };

  const handleLike = (id: string) => {
    setLikedRequests((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const filteredRequests = promptRequests.filter((req) => {
    if (statusFilter === 'pending') return req.status === 'pending' || req.status === 'in_progress';
    if (statusFilter === 'completed') return req.status === 'completed';
    return true;
  });

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-8">
      {/* Header Banner */}
      <div className="bg-linear-to-r from-red-500/10 via-amber-500/10 to-purple-500/10 dark:from-red-950/30 dark:via-neutral-900 dark:to-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-3xl p-6 sm:p-8 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 dark:bg-red-950/60 text-[#E60023] text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Community Requested Prompts</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white tracking-tight">
            Can&apos;t find the exact prompt?
          </h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-xl">
            Request custom photo & art concepts from expert AI prompt engineers. Our creators craft high-fidelity Midjourney, Gemini, and FLUX prompts for community ideas.
          </p>
        </div>

        <div className="shrink-0">
          <a
            href="#request-form"
            className="px-5 py-3 rounded-full bg-[#E60023] hover:bg-[#ad081b] text-white text-xs sm:text-sm font-bold shadow-md transition-all flex items-center gap-2"
          >
            <MessageSquarePlus className="w-4 h-4" />
            <span>Request a Prompt</span>
          </a>
        </div>
      </div>

      {/* Submit Request Box */}
      <div
        id="request-form"
        className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-3xl p-6 shadow-xs space-y-4"
      >
        <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
          <Send className="w-4 h-4 text-[#E60023]" />
          <span>Submit a New Prompt Request</span>
        </h2>
        <form onSubmit={handleCreateRequest} className="space-y-3">
          <textarea
            value={requestText}
            onChange={(e) => setRequestText(e.target.value)}
            placeholder="Describe the image, lighting, subject, or camera style you need (e.g. 90s vintage film portrait in neon Tokyo rain)..."
            rows={3}
            className="w-full p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#E60023]"
          />
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 focus:outline-none"
            >
              <option value="Photorealistic & Portraits">Photorealistic & Portraits</option>
              <option value="Anime & Manga">Anime & Manga</option>
              <option value="3D Disney & Pixar">3D Disney & Pixar</option>
              <option value="Cinematic & Moody">Cinematic & Moody</option>
              <option value="Fashion & Editorial">Fashion & Editorial</option>
              <option value="Sci-Fi & Cyberpunk">Sci-Fi & Cyberpunk</option>
            </select>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 text-xs font-bold hover:bg-neutral-800 transition-all flex items-center justify-center gap-2"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit Request</span>
            </button>
          </div>
        </form>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-3">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
            statusFilter === 'all'
              ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950'
              : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          All Requests ({promptRequests.length})
        </button>
        <button
          onClick={() => setStatusFilter('pending')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
            statusFilter === 'pending'
              ? 'bg-amber-500 text-white'
              : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          In Progress
        </button>
        <button
          onClick={() => setStatusFilter('completed')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
            statusFilter === 'completed'
              ? 'bg-emerald-600 text-white'
              : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          Fulfilled
        </button>
      </div>

      {/* Feed List */}
      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800">
            <Clock className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">
              No prompt requests in this category yet.
            </p>
          </div>
        ) : (
          filteredRequests.map((req) => {
            const isLiked = !!likedRequests[req.id];
            const currentLikes = (req.likesCount || 0) + (isLiked ? 1 : 0);
            const fulfilledPost = req.fulfilledPostId
              ? posts.find((p) => p.id === req.fulfilledPostId)
              : null;

            return (
              <div
                key={req.id}
                className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-3xl p-5 shadow-xs transition-all hover:border-neutral-300 dark:hover:border-neutral-700"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden relative bg-neutral-100 dark:bg-neutral-800 shrink-0">
                      {req.userAvatar ? (
                        <Image
                          src={req.userAvatar}
                          alt={req.userName || 'User'}
                          fill
                          sizes="40px"
                          className="object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <User className="w-5 h-5 text-neutral-400 m-auto mt-2.5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-neutral-900 dark:text-white">
                          {req.userName || 'Anonymous Creator'}
                        </span>
                        {req.category && (
                          <span className="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 text-[10px] font-medium">
                            {req.category}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-neutral-800 dark:text-neutral-200 mt-2 font-medium">
                        &ldquo;{req.requestText}&rdquo;
                      </p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="shrink-0">
                    {req.status === 'completed' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Fulfilled</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-xs font-bold">
                        <Clock className="w-3.5 h-3.5" />
                        <span>In Progress</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer action bar */}
                <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800/60 flex items-center justify-between text-xs text-neutral-500">
                  <button
                    onClick={() => handleLike(req.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors ${
                      isLiked
                        ? 'text-[#E60023] bg-red-50 dark:bg-red-950/40 font-bold'
                        : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500'
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
                    <span>{currentLikes}</span>
                  </button>

                  {fulfilledPost && (
                    <button
                      onClick={() => setSelectedPost(fulfilledPost)}
                      className="inline-flex items-center gap-1 text-[#E60023] hover:underline font-bold"
                    >
                      <span>View Created Prompt</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </main>
  );
};
