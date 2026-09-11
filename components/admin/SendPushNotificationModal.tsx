'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { NotificationService } from '@/lib/notifications';
import { PushNotificationAction } from '@/types/notification';
import { X, Send, Bell, Sparkles, RefreshCw, Check } from 'lucide-react';
import Image from 'next/image';

interface SendPushNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTitle?: string;
  defaultCategory?: string;
  defaultImageUrl?: string;
  defaultUrl?: string;
  defaultPromptText?: string;
}

export const SendPushNotificationModal: React.FC<SendPushNotificationModalProps> = ({
  isOpen,
  onClose,
  defaultTitle = '',
  defaultCategory = 'all',
  defaultImageUrl = '',
  defaultUrl = '/',
  defaultPromptText = '',
}) => {
  const { categories, posts, showToast } = useApp();

  const [title, setTitle] = useState<string>('');
  const [subtitle, setSubtitle] = useState<string>('Trending AI Photo Prompt Drop');
  const [body, setBody] = useState<string>('');
  const [category, setCategory] = useState<string>('Photorealistic & Portraits');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [collageImages, setCollageImages] = useState<string[]>(['', '', '', '']);
  const [targetUrl, setTargetUrl] = useState<string>('/');
  const [actionLabel, setActionLabel] = useState<string>('Explore Prompt');
  const [isSending, setIsSending] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setTitle(defaultTitle ? `🔥 New: ${defaultTitle}` : 'New Viral Prompt Just Dropped!');
      const assignedCat = defaultCategory && defaultCategory !== 'all' ? defaultCategory : (categories[0]?.name || 'Photorealistic & Portraits');
      setSubtitle(
        assignedCat && assignedCat !== 'all'
          ? `Trending in ${assignedCat}`
          : 'You might like this prompt idea'
      );
      setBody(defaultPromptText ? defaultPromptText.slice(0, 140) + '...' : 'Copy and paste prompt ready for use.');
      setCategory(assignedCat);
      setImageUrl(defaultImageUrl || '');

      const sameCatImages = posts
        .filter((p) => p.category?.toLowerCase() === assignedCat.toLowerCase() && p.imageUrl !== defaultImageUrl)
        .slice(0, 3)
        .map((p) => p.imageUrl);

      const initialCollage = defaultImageUrl ? [defaultImageUrl, ...sameCatImages] : ['', '', '', ''];
      while (initialCollage.length < 4) initialCollage.push('');
      setCollageImages(initialCollage);

      setTargetUrl(defaultUrl || '/');
      setActionLabel('Explore Prompt');
    }
  }, [isOpen, defaultTitle, defaultCategory, defaultImageUrl, defaultUrl, defaultPromptText, categories, posts]);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('Notification title is required');
      return;
    }

    setIsSending(true);
    try {
      const activeCollage = collageImages.filter((u) => u && u.trim().length > 0);
      const finalImage = imageUrl || activeCollage[0] || '';

      const actionButtons: PushNotificationAction[] = [
        { label: actionLabel || 'Explore Prompt', url: targetUrl },
        { label: 'Studio Tool', url: '/create' },
      ];

      const payload = {
        title: title.trim(),
        subtitle: subtitle.trim(),
        body: body.trim(),
        category,
        imageUrl: finalImage,
        collageImages: activeCollage.length > 0 ? activeCollage : (finalImage ? [finalImage] : []),
        url: targetUrl,
        actionButtons,
        sentBy: 'admin',
      };

      await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, sendBrowserPush: true }),
      });

      await NotificationService.addNotification(payload, true);

      showToast(`Push notification sent to ${category} subscribers!`);
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to send notification');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-neutral-900 rounded-3xl p-6 sm:p-7 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="space-y-1 pr-8">
          <div className="flex items-center gap-2 text-[#E60023] font-bold text-xs">
            <Bell className="w-4 h-4" />
            <span>Instant Push Broadcast</span>
          </div>
          <h2 className="text-xl font-black text-neutral-900 dark:text-white tracking-tight">
            Broadcast Notification to Subscribed Users
          </h2>
          <p className="text-xs text-neutral-500">
            Sends native browser push and adds to users&apos; personalized Pinterest notification feed.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSend} className="space-y-4 pt-1">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
              Headline Title Hook <span className="text-[#E60023]">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-neutral-900 dark:text-white focus:outline-none focus:border-[#E60023]"
              required
            />
          </div>

          {/* Subtitle */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
              Subtitle Hook
            </label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              className="w-full px-3.5 py-2 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-[#E60023]"
            />
          </div>

          {/* Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Target Audience
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-neutral-900 dark:text-white"
              >
                <option value="all">All Subscribed Users</option>
                {categories.map((c) => (
                  <option key={c.id || c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Button Action Label
              </label>
              <input
                type="text"
                value={actionLabel}
                onChange={(e) => setActionLabel(e.target.value)}
                className="w-full px-3 py-2 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-neutral-900 dark:text-white"
              />
            </div>
          </div>

          {/* Preview snippet */}
          {imageUrl && (
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
              <div className="w-12 h-12 rounded-xl overflow-hidden relative shrink-0">
                <Image
                  src={imageUrl}
                  alt="Preview"
                  fill
                  className="object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-neutral-900 dark:text-white truncate">{title}</p>
                <p className="text-[11px] text-neutral-500 truncate">{subtitle}</p>
                <p className="text-[10px] text-[#E60023] font-semibold mt-0.5">URL: {targetUrl}</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-2xl border border-neutral-300 dark:border-neutral-700 text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSending}
              className="flex-1 py-2.5 px-4 rounded-2xl bg-[#E60023] hover:bg-[#ad081b] text-white text-xs font-bold shadow-lg shadow-red-500/25 flex items-center justify-center gap-1.5 transition-all transform active:scale-98 disabled:opacity-50"
            >
              {isSending ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>{isSending ? 'Broadcasting...' : 'Send Notification'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
