'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { X, Bookmark, Copy, Trash2, ExternalLink, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { getPromptSlug, getOptimizedImageUrl } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export const BookmarksDrawer = () => {
  const router = useRouter();
  const {
    isBookmarksDrawerOpen,
    setIsBookmarksDrawerOpen,
    bookmarkedIds,
    posts,
    setSelectedPost,
    toggleBookmark,
    copyPromptToClipboard,
  } = useApp();

  if (!isBookmarksDrawerOpen) return null;

  const bookmarkedPosts = posts.filter((p) => bookmarkedIds.includes(p.id));

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm animate-fade-in flex justify-end">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 h-full shadow-2xl flex flex-col border-l border-neutral-200 dark:border-neutral-800">
        {/* Header */}
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#E60023]/10 text-[#E60023] flex items-center justify-center">
              <Bookmark className="w-4 h-4 fill-current" />
            </div>
            <div>
              <h3 className="font-bold text-neutral-900 dark:text-white text-base">
                Saved Pins & Prompts
              </h3>
              <p className="text-xs text-neutral-500">
                {bookmarkedPosts.length} saved prompts in your collection
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsBookmarksDrawerOpen(false)}
            className="p-2 rounded-full text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Bookmarks List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {bookmarkedPosts.length > 0 ? (
            bookmarkedPosts.map((post) => (
              <div
                key={post.id}
                className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-200 dark:border-neutral-800 flex gap-3 group hover:border-neutral-300 dark:hover:border-neutral-700 transition-all"
              >
                {post.imageUrl && (
                  <div
                    onClick={() => {
                      setSelectedPost(post);
                      if (typeof window !== 'undefined') {
                        window.history.pushState({ postId: post.id }, '', `/prompt/${getPromptSlug(post)}`);
                      }
                      setIsBookmarksDrawerOpen(false);
                    }}
                    className="relative w-16 h-20 rounded-xl overflow-hidden bg-neutral-900 shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                  >
                    <Image
                      src={getOptimizedImageUrl(post.imageUrl, 200)}
                      alt={post.title}
                      fill
                      className="object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#efefef] dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                      {post.aiTool}
                    </span>
                    <h4
                      onClick={() => {
                        setSelectedPost(post);
                        if (typeof window !== 'undefined') {
                          window.history.pushState({ postId: post.id }, '', `/prompt/${getPromptSlug(post)}`);
                        }
                        setIsBookmarksDrawerOpen(false);
                      }}
                      className="text-xs font-bold text-neutral-900 dark:text-neutral-100 line-clamp-2 mt-1 cursor-pointer hover:text-[#E60023] transition-colors"
                    >
                      {post.title}
                    </h4>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => copyPromptToClipboard(post.promptText, post.id)}
                      className="flex items-center gap-1 text-[11px] font-bold text-[#E60023] hover:underline"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy Prompt</span>
                    </button>
                    <button
                      onClick={() => toggleBookmark(post.id)}
                      className="text-neutral-400 hover:text-[#E60023] p-1 transition-colors"
                      title="Remove from saved"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-16 px-4">
              <div className="w-12 h-12 rounded-full bg-[#E60023]/10 text-[#E60023] flex items-center justify-center mx-auto mb-3">
                <Bookmark className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-neutral-900 dark:text-white mb-1">
                No saved prompts yet
              </h4>
              <p className="text-xs text-neutral-500 max-w-xs mx-auto">
                Click the &ldquo;Save&rdquo; button on any photo prompt card to collect your favorite prompts here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
