'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { NotificationService } from '@/lib/notifications';
import { PushNotificationAction, PushNotificationItem } from '@/types/notification';
import { X, Send, Bell, RefreshCw, Upload } from 'lucide-react';
import Image from 'next/image';
import { generate16x9Collage, saveCollageToServer } from '@/lib/collage-generator';

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

  const multiFileRef = useRef<HTMLInputElement>(null);
  const cardFileRef0 = useRef<HTMLInputElement>(null);
  const cardFileRef1 = useRef<HTMLInputElement>(null);
  const cardFileRef2 = useRef<HTMLInputElement>(null);
  const cardFileRef3 = useRef<HTMLInputElement>(null);
  const cardFileRefs = [cardFileRef0, cardFileRef1, cardFileRef2, cardFileRef3];

  useEffect(() => {
    if (isOpen) {
      setTitle(defaultTitle ? `🔥 New: ${defaultTitle}` : 'New Viral Prompt Just Dropped!');
      const assignedCat =
        defaultCategory && defaultCategory !== 'all'
          ? defaultCategory
          : categories[0]?.name || 'Photorealistic & Portraits';
      setSubtitle(
        assignedCat && assignedCat !== 'all'
          ? `Trending in ${assignedCat}`
          : 'You might like this prompt idea'
      );
      setBody(
        defaultPromptText
          ? defaultPromptText.slice(0, 140) + '...'
          : 'Copy and paste prompt ready for use.'
      );
      setCategory(assignedCat);
      setImageUrl(defaultImageUrl || '');

      const sameCatImages = posts
        .filter(
          (p) =>
            p.category?.toLowerCase() === assignedCat.toLowerCase() &&
            p.imageUrl !== defaultImageUrl
        )
        .slice(0, 3)
        .map((p) => p.imageUrl);

      const initialCollage = defaultImageUrl
        ? [defaultImageUrl, ...sameCatImages]
        : ['', '', '', ''];
      while (initialCollage.length < 4) initialCollage.push('');
      setCollageImages(initialCollage);

      setTargetUrl(defaultUrl || '/');
      setActionLabel('Explore Prompt');
    }
  }, [
    isOpen,
    defaultTitle,
    defaultCategory,
    defaultImageUrl,
    defaultUrl,
    defaultPromptText,
    categories,
    posts,
  ]);

  if (!isOpen) return null;

  const handleMultipleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 4);
    if (files.length === 0) return;

    const promises = files.map(
      (file) =>
        new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        })
    );

    Promise.all(promises).then((results) => {
      const next = [...results];
      while (next.length < 4) next.push('');
      setCollageImages(next);
      if (next[0]) setImageUrl(next[0]);
      showToast(`Loaded ${results.length} images for 16:9 collage!`);
    });

    if (e.target) e.target.value = '';
  };

  const handleSingleFile = (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const next = [...collageImages];
      next[idx] = dataUrl;
      setCollageImages(next);
      if (idx === 0) setImageUrl(dataUrl);
      showToast(`Image loaded for Pin #${idx + 1}`);
    };
    reader.readAsDataURL(file);

    if (e.target) e.target.value = '';
  };

  const handleClearCard = (idx: number) => {
    const next = [...collageImages];
    next[idx] = '';
    setCollageImages(next);
    if (idx === 0) {
      const first = next.find((u) => u && u.trim().length > 0) || '';
      setImageUrl(first);
    }
  };

  const handleAutoFillCategory = () => {
    const matching = posts.filter(
      (p) => category === 'all' || p.category?.toLowerCase() === category.toLowerCase()
    );
    const pool = matching.length > 0 ? matching : posts;
    const picked = pool
      .slice(0, 4)
      .map((p) => p.imageUrl)
      .filter(Boolean);
    const next = [...picked];
    while (next.length < 4) next.push('');
    setCollageImages(next);
    if (next[0]) setImageUrl(next[0]);
    showToast('Auto-filled 4 images from category');
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('Notification title is required');
      return;
    }

    setIsSending(true);
    try {
      const activeCollage = collageImages.filter((u) => u && u.trim().length > 0);
      let finalImage = imageUrl || activeCollage[0] || '';
      const imagesToComposite =
        activeCollage.length > 0 ? activeCollage : finalImage ? [finalImage] : [];

      if (imagesToComposite.length > 0) {
        try {
          const dataUrl = await generate16x9Collage(imagesToComposite);
          if (dataUrl) {
            const savedUrl = await saveCollageToServer(dataUrl);
            if (savedUrl) {
              finalImage = savedUrl;
            }
          }
        } catch (e) {
          console.warn('[Modal] Could not pre-generate 16:9 collage:', e);
        }
      }

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
        collageImages:
          activeCollage.length > 0 ? activeCollage : finalImage ? [finalImage] : [],
        url: targetUrl,
        actionButtons,
        sentBy: 'admin',
      };

      const res = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, sendBrowserPush: true }),
      });

      let returned: PushNotificationItem | null = null;
      if (res.ok) {
        const d = await res.json();
        returned = d.notification;
      }

      await NotificationService.addNotification(returned || payload, true);

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
      <div className="relative w-full max-w-xl bg-white dark:bg-neutral-900 rounded-3xl p-6 sm:p-7 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-5 max-h-[90vh] overflow-y-auto">
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
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 dark:bg-red-950 text-[#E60023]">
              16:9 Widescreen
            </span>
          </div>
          <h2 className="text-xl font-black text-neutral-900 dark:text-white">
            Send Drop to Subscribers
          </h2>
          <p className="text-xs text-neutral-500">
            Pushes an authentic 16:9 Pinterest photo-strip notification to browsers matching this category.
          </p>
        </div>

        <form onSubmit={handleSend} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
              Notification Title Hook
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Why is Pink Background everywhere right now?"
              className="w-full px-4 py-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-neutral-900 dark:text-white focus:border-[#E60023] focus:outline-none"
              required
            />
          </div>

          {/* Subtitle */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
              Subtitle (Secondary Curiosity Prompt)
            </label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="e.g. You might like these searches"
              className="w-full px-4 py-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 text-xs font-medium text-neutral-900 dark:text-white focus:border-[#E60023] focus:outline-none"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
              Body Message
            </label>
            <textarea
              rows={2}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Prompt preview text or call to action..."
              className="w-full px-4 py-2 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-900 dark:text-white focus:border-[#E60023] focus:outline-none resize-none"
            />
          </div>

          {/* 4 Collage Pin Cards */}
          <div className="space-y-2 pt-1 border-t border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
                4-Image Collage Pin Cards (16:9 Aspect Ratio)
              </label>
              <div className="flex items-center gap-2">
                <input
                  ref={multiFileRef}
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={handleMultipleFiles}
                />
                <button
                  type="button"
                  onClick={() => multiFileRef.current?.click()}
                  className="px-2.5 py-1 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 text-xs font-bold transition-colors flex items-center gap-1"
                >
                  <Upload className="w-3 h-3 text-[#E60023]" />
                  <span>Upload 4</span>
                </button>
                <button
                  type="button"
                  onClick={handleAutoFillCategory}
                  className="px-2.5 py-1 rounded-xl bg-red-50 dark:bg-red-950/50 text-[#E60023] hover:bg-red-100 text-xs font-bold transition-colors flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Auto-Fill</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[0, 1, 2, 3].map((idx) => (
                <div key={idx} className="relative group">
                  <input
                    ref={cardFileRefs[idx]}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleSingleFile(idx, e)}
                  />
                  {collageImages[idx] ? (
                    <div className="relative w-full h-16 rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-100">
                      <Image
                        src={collageImages[idx]}
                        alt={`Pin ${idx + 1}`}
                        fill
                        className="object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <button
                        type="button"
                        onClick={() => handleClearCard(idx)}
                        className="absolute top-1 right-1 p-0.5 rounded-full bg-black/70 text-white hover:bg-red-600 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <span className="absolute bottom-1 left-1 px-1 rounded bg-black/60 text-[9px] font-bold text-white">
                        #{idx + 1}
                      </span>
                    </div>
                  ) : (
                    <div
                      onClick={() => cardFileRefs[idx].current?.click()}
                      className="w-full h-16 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 hover:border-[#E60023] bg-neutral-50 dark:bg-neutral-950 flex flex-col items-center justify-center cursor-pointer transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5 text-neutral-400 mb-0.5" />
                      <span className="text-[9px] text-neutral-400 font-medium">#{idx + 1}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Target Audience Category
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

          {/* 16:9 Preview snippet */}
          <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-neutral-500">
              <span>Notification Banner Preview</span>
              <span className="text-[#E60023]">16:9 Aspect Ratio</span>
            </div>

            {collageImages.filter((u) => u && u.trim()).length > 1 ? (
              <div className="grid grid-cols-4 gap-1.5 aspect-[16/9] w-full rounded-xl overflow-hidden bg-neutral-200 dark:bg-neutral-800">
                {collageImages.slice(0, 4).map((img, i) => (
                  <div key={i} className="relative w-full h-full bg-neutral-300 dark:bg-neutral-700">
                    {img ? (
                      <Image
                        src={img}
                        alt={`Preview ${i}`}
                        fill
                        className="object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-neutral-400">
                        #{i + 1}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (imageUrl || collageImages[0]) ? (
              <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden bg-neutral-200 dark:bg-neutral-800">
                <Image
                  src={imageUrl || collageImages[0]}
                  alt="Preview"
                  fill
                  className="object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : null}

            <div className="pt-1">
              <p className="text-xs font-black text-neutral-900 dark:text-white truncate">{title}</p>
              <p className="text-[11px] text-neutral-500 truncate">{subtitle}</p>
            </div>
          </div>

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
