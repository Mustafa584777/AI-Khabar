'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { PushNotificationItem, PushNotificationAction, PushSubscriber } from '@/types/notification';
import { NotificationService } from '@/lib/notifications';
import {
  Bell,
  Send,
  Sparkles,
  Smartphone,
  Image as ImageIcon,
  Link as LinkIcon,
  Trash2,
  RefreshCw,
  Eye,
  CheckCircle2,
  Layers,
  ArrowRight,
  ExternalLink,
  Plus,
  Users,
  X,
  Globe,
  Calendar,
  Laptop,
  Upload,
} from 'lucide-react';
import Image from 'next/image';
import { generate16x9Collage, saveCollageToServer } from '@/lib/collage-generator';

export const PushNotificationsManager: React.FC = () => {
  const { posts, categories, showToast } = useApp();

  // Composer Form State
  const [title, setTitle] = useState<string>('Why is Pink Background everywhere right now?');
  const [subtitle, setSubtitle] = useState<string>('You might like these searches');
  const [body, setBody] = useState<string>(
    'Explore high-contrast aesthetics, pastel glow prompts, and portrait lighting trending across Pinterest.'
  );
  const [targetCategory, setTargetCategory] = useState<string>('all');
  const [destinationUrl, setDestinationUrl] = useState<string>('/explore?q=pink+aesthetic');
  const [mainImageUrl, setMainImageUrl] = useState<string>(
    posts[0]?.imageUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80'
  );

  // 4 Collage images (like Pinterest's 4-photo card strip)
  const [collageImages, setCollageImages] = useState<string[]>([
    'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=600&auto=format&fit=crop&q=80',
  ]);

  const [actionButton1Label, setActionButton1Label] = useState<string>('Explore Searches');
  const [actionButton1Url, setActionButton1Url] = useState<string>('/explore?q=pink+aesthetic');
  const [actionButton2Label, setActionButton2Label] = useState<string>('Try in Studio');
  const [actionButton2Url, setActionButton2Url] = useState<string>('/create');

  const [sendNativePush, setSendNativePush] = useState<boolean>(true);
  const [isSending, setIsSending] = useState<boolean>(false);

  // File upload input refs
  const multiFileInputRef = React.useRef<HTMLInputElement>(null);
  const singleInputRef0 = React.useRef<HTMLInputElement>(null);
  const singleInputRef1 = React.useRef<HTMLInputElement>(null);
  const singleInputRef2 = React.useRef<HTMLInputElement>(null);
  const singleInputRef3 = React.useRef<HTMLInputElement>(null);
  const singleInputRefs = [singleInputRef0, singleInputRef1, singleInputRef2, singleInputRef3];

  // Notification History & Real Stats
  const [history, setHistory] = useState<PushNotificationItem[]>([]);
  const [realSubscribers, setRealSubscribers] = useState<PushSubscriber[]>([]);
  const [subscribersCount, setSubscribersCount] = useState<number>(0);
  const [realTotalSent, setRealTotalSent] = useState<number>(0);
  const [showSubscribersModal, setShowSubscribersModal] = useState<boolean>(false);

  const loadHistory = async () => {
    try {
      const [subsData, statsData] = await Promise.all([
        NotificationService.fetchRealSubscribers(),
        NotificationService.fetchRealStats(),
      ]);
      setRealSubscribers(subsData.subscribers || []);
      setSubscribersCount(subsData.count || 0);
      setRealTotalSent(statsData.totalSent || 0);
    } catch (e) {
      console.error('Failed loading stats:', e);
    }
    const list = NotificationService.getNotifications();
    setHistory(list);
  };

  useEffect(() => {
    loadHistory();
  }, []);

  // Multi-image file upload handler (Upload up to 4 images at once)
  const handleMultipleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 4);
    if (files.length === 0) return;

    const readPromises = files.map(
      (file) =>
        new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        })
    );

    Promise.all(readPromises).then((results) => {
      const next = [...results];
      while (next.length < 4) next.push('');
      setCollageImages(next);
      if (next[0]) setMainImageUrl(next[0]);
      showToast(`Uploaded ${results.length} collage image${results.length > 1 ? 's' : ''}!`);
    });

    if (e.target) e.target.value = '';
  };

  // Single card file upload handler
  const handleSingleFileChange = (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const next = [...collageImages];
      next[idx] = dataUrl;
      setCollageImages(next);
      if (idx === 0) setMainImageUrl(dataUrl);
      showToast(`Image set for Pin Card #${idx + 1}`);
    };
    reader.readAsDataURL(file);

    if (e.target) e.target.value = '';
  };

  const handleClearCard = (idx: number) => {
    const next = [...collageImages];
    next[idx] = '';
    setCollageImages(next);
    if (idx === 0) {
      const firstAvailable = next.find((u) => u && u.trim().length > 0) || '';
      setMainImageUrl(firstAvailable);
    }
  };

  // Quick helper: auto-populate 4 images from selected category
  const handleAutoFillCollage = () => {
    let matchingPosts = posts;
    if (targetCategory !== 'all') {
      matchingPosts = posts.filter(
        (p) => p.category?.toLowerCase() === targetCategory.toLowerCase()
      );
    }
    if (matchingPosts.length === 0) {
      matchingPosts = posts;
    }

    const picked = matchingPosts
      .slice(0, 4)
      .map((p) => p.imageUrl)
      .filter(Boolean);

    if (picked.length > 0) {
      setCollageImages(picked);
      if (picked[0]) setMainImageUrl(picked[0]);
      showToast(`Auto-filled 4 images from ${targetCategory === 'all' ? 'Trending' : targetCategory}`);
    }
  };

  // Quick helper: pick from an existing published prompt
  const handleSelectExistingPost = (postId: string) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    setTitle(`🔥 Trending: ${post.title}`);
    setSubtitle(`You might like this new ${post.category} prompt idea`);
    setBody(post.promptText.slice(0, 120) + '...');
    setDestinationUrl(`/${post.slug}`);
    setTargetCategory(post.category);
    if (post.imageUrl) {
      setMainImageUrl(post.imageUrl);
      // Pick 3 more images from the same category
      const sameCatImages = posts
        .filter((p) => p.category === post.category && p.id !== post.id)
        .slice(0, 3)
        .map((p) => p.imageUrl);
      setCollageImages([post.imageUrl, ...sameCatImages]);
    }
    setActionButton1Label('View Prompt');
    setActionButton1Url(`/${post.slug}`);
    showToast(`Loaded prompt details for "${post.title}"`);
  };

  // Handle Send Notification
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('Notification title is required');
      return;
    }

    setIsSending(true);
    try {
      const actionButtons: PushNotificationAction[] = [];
      if (actionButton1Label && actionButton1Url) {
        actionButtons.push({ label: actionButton1Label, url: actionButton1Url });
      }
      if (actionButton2Label && actionButton2Url) {
        actionButtons.push({ label: actionButton2Label, url: actionButton2Url });
      }

      // Pre-composite into 16:9 widescreen canvas if images provided
      let finalImageUrl = mainImageUrl;
      const activeCollage = collageImages.filter((u) => u && u.trim().length > 0);
      const imagesToComposite = activeCollage.length > 0 ? activeCollage : (mainImageUrl ? [mainImageUrl] : []);

      if (imagesToComposite.length > 0) {
        try {
          const dataUrl = await generate16x9Collage(imagesToComposite);
          if (dataUrl) {
            const savedUrl = await saveCollageToServer(dataUrl);
            if (savedUrl) {
              finalImageUrl = savedUrl;
            }
          }
        } catch (err) {
          console.warn('[Push] Client-side 16:9 composite generation fallback:', err);
        }
      }

      const itemPayload = {
        title: title.trim(),
        subtitle: subtitle.trim(),
        body: body.trim(),
        category: targetCategory,
        imageUrl: finalImageUrl || mainImageUrl,
        collageImages: activeCollage,
        url: destinationUrl || '/',
        actionButtons,
        sentBy: 'admin',
      };

      // Call API & local service
      const res = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...itemPayload, sendBrowserPush: sendNativePush }),
      });

      let returnedItem: PushNotificationItem | null = null;
      if (res.ok) {
        const data = await res.json();
        if (data.totalSent !== undefined) {
          setRealTotalSent(data.totalSent);
        }
        if (data.notification) {
          returnedItem = data.notification;
        }
      }

      await NotificationService.addNotification(returnedItem || itemPayload, sendNativePush);

      await loadHistory();
      showToast(
        targetCategory === 'all'
          ? 'Push Notification broadcasted to all users!'
          : `Push Notification sent to ${targetCategory} subscribers!`
      );
    } catch (err: any) {
      showToast(err.message || 'Failed to broadcast notification');
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteHistory = (id: string) => {
    NotificationService.deleteNotification(id);
    loadHistory();
    showToast('Notification removed from history');
  };

  const handleResend = async (item: PushNotificationItem) => {
    await NotificationService.addNotification(
      {
        title: item.title,
        subtitle: item.subtitle,
        body: item.body,
        category: item.category,
        imageUrl: item.imageUrl,
        collageImages: item.collageImages,
        url: item.url,
        actionButtons: item.actionButtons,
        sentBy: 'admin',
      },
      sendNativePush
    );
    loadHistory();
    showToast(`Re-sent: "${item.title}"`);
  };

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-[#E60023] flex items-center justify-center text-white shadow-md shadow-red-500/20">
              <Bell className="w-4 h-4 fill-current" />
            </span>
            <h1 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
              Push Notifications & Pinterest Broadcast
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mt-1">
            Send rich Pinterest-style browser push notifications with 4-card photo strips, custom buttons, and category personalization.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowSubscribersModal(true)}
            className="px-4 py-2 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-[#E60023] flex items-center gap-2.5 shadow-xs text-left transition-all cursor-pointer group"
            title="Click to see real registered devices and subscribers"
          >
            <Users className="w-4 h-4 text-[#E60023] group-hover:scale-110 transition-transform" />
            <div>
              <span className="text-[10px] text-neutral-400 font-bold uppercase block">Real Subscribers</span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black text-neutral-900 dark:text-white">{subscribersCount}</span>
                <span className="text-[10px] text-neutral-500 font-medium underline">View Details</span>
              </div>
            </div>
          </button>

          <div className="px-4 py-2 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center gap-2.5 shadow-xs text-left">
            <Send className="w-4 h-4 text-blue-600" />
            <div>
              <span className="text-[10px] text-neutral-400 font-bold uppercase block">Total Sent</span>
              <span className="text-sm font-black text-neutral-900 dark:text-white">{realTotalSent || history.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main 2-Column Grid: Left Composer Form, Right Live Lockscreen Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form: 7 Columns */}
        <form onSubmit={handleSend} className="lg:col-span-7 space-y-6">
          <div className="bg-white dark:bg-neutral-900 p-6 sm:p-7 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#E60023]" />
                <span>Compose Notification</span>
              </h2>

              {/* Quick Prompt Preloader Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-neutral-400 font-medium">Quick load prompt:</span>
                <select
                  onChange={(e) => {
                    if (e.target.value) handleSelectExistingPost(e.target.value);
                  }}
                  defaultValue=""
                  className="text-xs px-2.5 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border-none font-semibold text-neutral-700 dark:text-neutral-300 max-w-[180px] truncate"
                >
                  <option value="" disabled>Choose Prompt...</option>
                  {posts.slice(0, 15).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notification Title (The Bold Hook) */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Headline Hook (Bold Title) <span className="text-[#E60023]">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Why is Pink Background everywhere right now?"
                className="w-full px-4 py-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 text-sm font-semibold text-neutral-900 dark:text-white focus:border-[#E60023] focus:outline-none"
                required
              />
              <span className="text-[11px] text-neutral-400 mt-1 block">
                Inspired by Pinterest&apos;s viral question hooks that generate 10x higher click-through rates.
              </span>
            </div>

            {/* Subtitle / Subhead */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Subtitle Hook
              </label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="e.g. You might like these searches"
                className="w-full px-4 py-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-900 dark:text-white focus:border-[#E60023] focus:outline-none"
              />
            </div>

            {/* Target Audience / Interest Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Target Audience Category
                </label>
                <select
                  value={targetCategory}
                  onChange={(e) => setTargetCategory(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-neutral-900 dark:text-white focus:border-[#E60023] focus:outline-none"
                >
                  <option value="all">Broadcast to All Users (Global Drop)</option>
                  {categories.map((c) => (
                    <option key={c.id || c.name} value={c.name}>
                      {c.name} Subscribers Only
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-neutral-400 mt-1 block">
                  Delivered only to users with matching interest preferences.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Destination Target URL
                </label>
                <input
                  type="text"
                  value={destinationUrl}
                  onChange={(e) => setDestinationUrl(e.target.value)}
                  placeholder="e.g. /prompt-slug or /explore"
                  className="w-full px-4 py-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 text-xs font-mono text-neutral-900 dark:text-white focus:border-[#E60023] focus:outline-none"
                />
              </div>
            </div>

            {/* 4-Card Collage Images Section (Pinterest Signature Look & 16:9 Format) */}
            <div className="space-y-3 pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200">
                      Pinterest 4-Card Photo Collage Strip (16:9 Format)
                    </label>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 dark:bg-red-950/60 text-[#E60023]">
                      16:9 Widescreen
                    </span>
                  </div>
                  <span className="text-[11px] text-neutral-500">
                    Upload or paste up to 4 images. They are automatically composited into an authentic 16:9 widescreen card strip for mobile lockscreens.
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    ref={multiFileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={handleMultipleFilesChange}
                  />
                  <button
                    type="button"
                    onClick={() => multiFileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0"
                    title="Upload up to 4 images from device"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#E60023]" />
                    <span>Upload 4 Photos</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAutoFillCollage}
                    className="px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/50 text-[#E60023] hover:bg-red-100 dark:hover:bg-red-900/50 text-xs font-bold transition-colors flex items-center gap-1 shrink-0"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Auto-Fill 4</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[0, 1, 2, 3].map((idx) => (
                  <div key={idx} className="space-y-1.5 p-2 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-neutral-500">Pin #{idx + 1}</span>
                      <div className="flex items-center gap-1">
                        <input
                          ref={singleInputRefs[idx]}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleSingleFileChange(idx, e)}
                        />
                        <button
                          type="button"
                          onClick={() => singleInputRefs[idx].current?.click()}
                          className="p-1 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-500 hover:text-[#E60023] transition-colors"
                          title="Upload image file"
                        >
                          <Upload className="w-3 h-3" />
                        </button>
                        {collageImages[idx] && (
                          <button
                            type="button"
                            onClick={() => handleClearCard(idx)}
                            className="p-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/50 text-neutral-400 hover:text-red-500 transition-colors"
                            title="Remove image"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    <input
                      type="text"
                      value={collageImages[idx]?.startsWith('data:image') ? 'Uploaded Local File' : collageImages[idx] || ''}
                      onChange={(e) => {
                        const next = [...collageImages];
                        next[idx] = e.target.value;
                        setCollageImages(next);
                        if (idx === 0) setMainImageUrl(e.target.value);
                      }}
                      placeholder={`URL or upload`}
                      className="w-full px-2 py-1 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-[10px] font-mono text-neutral-900 dark:text-white truncate"
                    />

                    {collageImages[idx] ? (
                      <div className="relative w-full h-16 rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-100">
                        <Image
                          src={collageImages[idx]}
                          alt={`Collage ${idx}`}
                          fill
                          className="object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/60 text-[9px] font-bold text-white">
                          #{idx + 1}
                        </span>
                      </div>
                    ) : (
                      <div
                        onClick={() => singleInputRefs[idx].current?.click()}
                        className="w-full h-16 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 hover:border-[#E60023] bg-white/50 dark:bg-neutral-900/50 flex flex-col items-center justify-center cursor-pointer transition-colors"
                      >
                        <Upload className="w-4 h-4 text-neutral-400 mb-0.5" />
                        <span className="text-[9px] text-neutral-400 font-medium">Add Photo</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200">
                Action Buttons (Interactive Pills)
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-2">
                  <span className="text-[10px] font-bold text-[#E60023] uppercase tracking-wider block">
                    Button 1 (Primary Red Pill)
                  </span>
                  <input
                    type="text"
                    value={actionButton1Label}
                    onChange={(e) => setActionButton1Label(e.target.value)}
                    placeholder="Button Label"
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 font-bold"
                  />
                  <input
                    type="text"
                    value={actionButton1Url}
                    onChange={(e) => setActionButton1Url(e.target.value)}
                    placeholder="Target URL e.g. /explore"
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 font-mono"
                  />
                </div>

                <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-2">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
                    Button 2 (Secondary Neutral)
                  </span>
                  <input
                    type="text"
                    value={actionButton2Label}
                    onChange={(e) => setActionButton2Label(e.target.value)}
                    placeholder="Button Label"
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 font-bold"
                  />
                  <input
                    type="text"
                    value={actionButton2Url}
                    onChange={(e) => setActionButton2Url(e.target.value)}
                    placeholder="Target URL e.g. /create"
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Browser Push Native Checkbox */}
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
              <input
                type="checkbox"
                id="sendNativePush"
                checked={sendNativePush}
                onChange={(e) => setSendNativePush(e.target.checked)}
                className="w-4 h-4 text-[#E60023] rounded-md focus:ring-red-500"
              />
              <label htmlFor="sendNativePush" className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 cursor-pointer">
                Trigger Native Browser Notification on active and subscribed devices
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={isSending}
                className="w-full py-3.5 px-6 rounded-2xl bg-[#E60023] hover:bg-[#ad081b] text-white text-sm font-black shadow-xl shadow-red-500/25 flex items-center justify-center gap-2 transition-all transform active:scale-98 disabled:opacity-50"
                id="btn-broadcast-push-notification"
              >
                {isSending ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>{isSending ? 'Broadcasting Drop...' : 'Send Push Notification Now'}</span>
              </button>
            </div>
          </div>
        </form>

        {/* Right Preview: 5 Columns (Authentic Mobile Lockscreen Preview) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-[#E60023]" />
              <span>Realistic Lockscreen Preview</span>
            </span>
            <span className="text-[11px] text-neutral-400">Live Render</span>
          </div>

          {/* Realistic Mobile Lockscreen Mockup (Matching user's uploaded image exactly) */}
          <div className="relative w-full rounded-[40px] p-5 sm:p-6 overflow-hidden shadow-2xl border-4 border-neutral-800 bg-gradient-to-b from-neutral-400 via-neutral-300 to-neutral-500 dark:from-neutral-800 dark:via-neutral-900 dark:to-neutral-950 min-h-[540px] flex flex-col justify-start">
            {/* Lockscreen Wallpaper Glass Overlay */}
            <div className="absolute inset-0 bg-white/20 dark:bg-black/30 backdrop-blur-md pointer-events-none" />

            {/* Lockscreen Time & Date Header (Exact match: "9:22 Mon Aug 24" + Bell icon) */}
            <div className="relative z-10 flex items-start justify-between text-neutral-900 dark:text-white pt-2 pb-6 px-2 select-none">
              <div>
                <div className="text-5xl sm:text-6xl font-light tracking-tighter leading-none">
                  9:22
                </div>
                <div className="text-xs sm:text-sm font-medium opacity-80 mt-1">
                  Mon, Aug 24
                </div>
              </div>
              <div className="p-2 rounded-full bg-white/20 dark:bg-black/20 backdrop-blur-xs">
                <Bell className="w-5 h-5 opacity-80" />
              </div>
            </div>

            {/* Pinterest Push Notification Card (Identical to screenshot IMG_20260910_070715_945.jpg) */}
            <div className="relative z-10 w-full rounded-3xl bg-white/95 dark:bg-neutral-900/95 backdrop-blur-2xl shadow-xl border border-white/60 dark:border-neutral-800/80 p-4 sm:p-5 space-y-2.5 transition-all text-left">
              {/* Header: tool.reelz logo + tool.reelz now 🔔 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full overflow-hidden shadow-xs relative bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                    <Image
                      src="/logo.png"
                      alt="tool.reelz"
                      width={28}
                      height={28}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400 font-medium">
                    <span className="font-bold text-neutral-900 dark:text-white">tool.reelz</span>
                    <span>now</span>
                    <Bell className="w-3 h-3 text-neutral-400 fill-neutral-400" />
                  </div>
                </div>
                <div className="text-neutral-400">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                  </svg>
                </div>
              </div>

              {/* Bold Title Hook */}
              <h3 className="text-sm sm:text-base font-black text-neutral-900 dark:text-white tracking-tight leading-snug">
                {title || 'Why is Pink Background everywhere right now?'}
              </h3>

              {/* Subtitle */}
              <p className="text-xs text-neutral-600 dark:text-neutral-300 font-medium">
                {subtitle || 'You might like these searches'}
              </p>

              {/* 16:9 Photo Collage Strip or Single 16:9 Image */}
              <div className="relative">
                <span className="absolute top-2 right-2 z-20 px-2 py-0.5 rounded-full text-[9px] font-black bg-black/70 text-white backdrop-blur-xs shadow-xs pointer-events-none">
                  16:9 Widescreen
                </span>
                {collageImages.filter((u) => u && u.trim()).length > 1 ? (
                  <div className="grid grid-cols-4 gap-1.5 rounded-2xl overflow-hidden aspect-[16/9] mt-2">
                    {collageImages.slice(0, 4).map((img, i) => (
                      <div key={i} className="relative w-full h-full bg-neutral-200 dark:bg-neutral-800 rounded-xl overflow-hidden shadow-2xs">
                        {img ? (
                          <Image
                            src={img}
                            alt={`Collage ${i}`}
                            fill
                            className="object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-neutral-400">
                            Img {i + 1}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (mainImageUrl || collageImages[0]) ? (
                  <div className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden bg-neutral-200 dark:bg-neutral-800 mt-2 shadow-2xs">
                    <Image
                      src={mainImageUrl || collageImages[0]}
                      alt="Notification banner"
                      fill
                      className="object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-1.5 rounded-2xl overflow-hidden aspect-[16/9] mt-2">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="relative w-full h-full bg-neutral-200 dark:bg-neutral-800 rounded-xl overflow-hidden flex items-center justify-center text-[10px] text-neutral-400">
                        Img {i + 1}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons in Lockscreen Card */}
              <div className="pt-2 flex items-center justify-end gap-2">
                {actionButton1Label && (
                  <div className="px-3 py-1 rounded-full bg-[#E60023] text-white text-[11px] font-bold shadow-xs">
                    {actionButton1Label}
                  </div>
                )}
                {actionButton2Label && (
                  <div className="px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-[11px] font-semibold">
                    {actionButton2Label}
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Bottom Bar hint */}
            <div className="relative z-10 mt-auto pt-6 text-center">
              <div className="w-24 h-1 bg-white/40 dark:bg-white/20 rounded-full mx-auto" />
            </div>
          </div>
        </div>
      </div>

      {/* Sent Notifications History Table */}
      <div className="bg-white dark:bg-neutral-900 p-6 sm:p-7 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">
              Sent Notifications History
            </h2>
            <p className="text-xs text-neutral-500">
              Track broadcast performance, clicks, and re-send past viral drops.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-3">Title & Hook</th>
                <th className="py-3 px-3">Audience</th>
                <th className="py-3 px-3">Target URL</th>
                <th className="py-3 px-3">Clicks</th>
                <th className="py-3 px-3">Date Sent</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {history.map((item) => (
                <tr key={item.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-3">
                      {item.imageUrl && (
                        <div className="w-10 h-10 rounded-xl overflow-hidden relative shrink-0 border border-neutral-200 dark:border-neutral-800">
                          <Image
                            src={item.imageUrl}
                            alt={item.title}
                            fill
                            className="object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-neutral-900 dark:text-white leading-tight">
                          {item.title}
                        </p>
                        {item.subtitle && (
                          <p className="text-[11px] text-neutral-500 truncate max-w-xs mt-0.5">
                            {item.subtitle}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-3 font-semibold">
                    <span className="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-[11px]">
                      {item.category || 'all'}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 font-mono text-[11px] text-neutral-500 truncate max-w-[150px]">
                    {item.url}
                  </td>
                  <td className="py-3.5 px-3 font-bold text-neutral-900 dark:text-white">
                    {item.clicksCount || 0}
                  </td>
                  <td className="py-3.5 px-3 text-neutral-400 text-[11px]">
                    {new Date(item.sentAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleResend(item)}
                        className="p-1.5 rounded-lg text-neutral-500 hover:text-[#E60023] hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                        title="Re-send Notification"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteHistory(item.id)}
                        className="p-1.5 rounded-lg text-neutral-500 hover:text-red-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                        title="Delete from history"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Real Subscribers Modal */}
      {showSubscribersModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-2xl w-full border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-950/50 flex items-center justify-center text-[#E60023]">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-neutral-900 dark:text-white">
                    Real Registered Subscribers ({subscribersCount})
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Real devices and browsers that allowed push notifications.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSubscribersModal(false)}
                className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3">
              {realSubscribers.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <Smartphone className="w-10 h-10 mx-auto text-neutral-300 dark:text-neutral-600" />
                  <h4 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
                    No Real Subscribers Yet
                  </h4>
                  <p className="text-xs text-neutral-500 max-w-md mx-auto">
                    When visitors click &quot;Allow Notifications&quot; on the website or Notifications page, their browser and device will automatically be registered here in real time.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {realSubscribers.map((sub, idx) => (
                    <div
                      key={sub.id || idx}
                      className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 font-bold text-neutral-900 dark:text-white">
                          <Laptop className="w-3.5 h-3.5 text-[#E60023]" />
                          <span className="truncate max-w-xs">{sub.userAgent || 'Web Browser Device'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-neutral-500 text-[11px]">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(sub.subscribedAt).toLocaleDateString()} at {new Date(sub.subscribedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="text-neutral-400">•</span>
                          <span className="text-emerald-600 font-semibold">Active Push Device</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {sub.interests && sub.interests.length > 0 ? (
                          sub.interests.slice(0, 3).map((interest, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-[#E60023] text-[10px] font-bold"
                            >
                              {interest}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-neutral-400">All Categories</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSubscribersModal(false)}
                className="px-4 py-2 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
