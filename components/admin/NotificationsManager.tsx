'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { NotificationService } from '@/lib/notifications';
import {
  Bell,
  Send,
  Sparkles,
  Trash2,
  RefreshCw,
  Image as ImageIcon,
  Link as LinkIcon,
  Users,
  CheckCircle2,
  Flame,
  Camera,
  Layers,
  Palette,
  ExternalLink,
} from 'lucide-react';
import Image from 'next/image';
import { AppNotification } from '@/types/prompt';

export const NotificationsManager = () => {
  const {
    categories,
    posts,
    showToast,
  } = useApp();

  const [notifications, setNotifications] = useState<AppNotification[]>(() => 
    NotificationService.getNotifications() as AppNotification[]
  );

  useEffect(() => {
    const handleNew = () => {
      setNotifications(NotificationService.getNotifications() as AppNotification[]);
    };
    window.addEventListener('promptcms_new_notification', handleNew as EventListener);
    return () => {
      window.removeEventListener('promptcms_new_notification', handleNew as EventListener);
    };
  }, []);

  const deleteNotification = (id: string) => {
    NotificationService.deleteNotification(id);
    setNotifications(NotificationService.getNotifications() as AppNotification[]);
    showToast('Notification deleted');
  };

  // Form State
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetCategory, setTargetCategory] = useState('all');
  const [imageUrl, setImageUrl] = useState('');
  const [targetUrl, setTargetUrl] = useState('/');
  const [targetPostId, setTargetPostId] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [triggerWebPush, setTriggerWebPush] = useState(true);

  // Quick prompt picker state
  const [showPromptPicker, setShowPromptPicker] = useState(false);

  // Available categories list
  const categoryOptions = [
    { value: 'all', label: '🌟 All Users (Global Broadcast)' },
    ...categories.map((c) => ({ value: c.name, label: `📁 ${c.name}` })),
    { value: 'Cyberpunk', label: '📁 Cyberpunk & Neon' },
    { value: 'Portrait', label: '📁 Portrait Photography' },
    { value: 'Anime', label: '📁 Anime & Manga' },
    { value: '3D Render', label: '📁 3D Render & Unreal Engine' },
  ].filter(
    (item, index, self) => index === self.findIndex((t) => t.value.toLowerCase() === item.value.toLowerCase())
  );

  const handleSelectPostForNotification = (post: any) => {
    setTitle(`🔥 New in ${post.category}: ${post.title}`);
    setMessage(`Check out this curated prompt for ${post.aiTool}: "${post.promptText.substring(0, 75)}..."`);
    setTargetCategory(post.category);
    setImageUrl(post.imageUrl);
    setTargetPostId(post.id);
    setTargetUrl(`/${post.slug || post.id}`);
    setShowPromptPicker(false);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      showToast('Please enter both title and message');
      return;
    }

    setIsSending(true);
    try {
      await NotificationService.addNotification({
        title: title.trim(),
        message: message.trim(),
        category: targetCategory,
        imageUrl: imageUrl.trim() || (posts[0]?.imageUrl || ''),
        targetUrl: targetUrl.trim() || '/',
        targetPostId: targetPostId.trim(),
        sentBy: 'Admin',
      }, triggerWebPush);

      setNotifications(NotificationService.getNotifications() as AppNotification[]);
      showToast('Notification sent & broadcasted successfully!');
      setTitle('');
      setMessage('');
      setImageUrl('');
      setTargetPostId('');
      setTargetUrl('/');
    } catch (err) {
      console.error('Error sending notification:', err);
      showToast('Error sending notification');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-red-500/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider">
              <Bell className="w-3.5 h-3.5" />
              <span>Push Notification System</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Personalized Push Notifications
            </h1>
            <p className="text-xs sm:text-sm text-red-100 max-w-2xl">
              Broadcast curated prompt alerts to your users. When you select a category (e.g. Cyberpunk, Portrait), only users interested in that category receive the update in their Pinterest-style notification inbox and browser push!
            </p>
          </div>

          <div className="flex items-center gap-3 bg-black/20 p-4 rounded-2xl backdrop-blur-sm border border-white/10 shrink-0">
            <Users className="w-8 h-8 text-amber-300" />
            <div>
              <p className="text-2xl font-black leading-tight">{notifications.length}</p>
              <p className="text-xs text-red-100">Sent Updates</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout: Sender Form + Live Pinterest Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Create & Send Form (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
            <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Send className="w-4 h-4 text-[#E60023]" />
              <span>Compose Notification</span>
            </h2>

            <button
              type="button"
              onClick={() => setShowPromptPicker(true)}
              className="text-xs font-bold text-[#E60023] hover:underline flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Auto-Fill from Prompt</span>
            </button>
          </div>

          <form onSubmit={handleSend} className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Notification Headline *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., 🔥 10 New Cyberpunk 8K Street Portraits"
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs text-neutral-900 dark:text-white focus:ring-2 focus:ring-[#E60023] focus:outline-none font-medium"
                required
              />
            </div>

            {/* Message Body */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Message Body *
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder="e.g., Curated neon rain aesthetic formulas engineered for Midjourney v6 and Flux. Tap to copy prompt."
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs text-neutral-900 dark:text-white focus:ring-2 focus:ring-[#E60023] focus:outline-none font-medium"
                required
              />
            </div>

            {/* Target Category Selector (Personalized Targeting) */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Target Interest / Category *
              </label>
              <select
                value={targetCategory}
                onChange={(e) => setTargetCategory(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs text-neutral-900 dark:text-white focus:ring-2 focus:ring-[#E60023] focus:outline-none font-medium"
              >
                {categoryOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-neutral-500 mt-1">
                {targetCategory === 'all'
                  ? 'All users will see this notification in their feed.'
                  : `Personalized: Users who selected "${targetCategory}" in their preferences will receive this in their For You notifications.`}
              </p>
            </div>

            {/* Image Thumbnail URL */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Thumbnail Image URL (Visual Card Thumbnail)
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://... (image thumbnail)"
                  className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs text-neutral-900 dark:text-white focus:ring-2 focus:ring-[#E60023] focus:outline-none font-medium"
                />
                {posts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setImageUrl(posts[0].imageUrl)}
                    className="px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 text-xs font-bold hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors shrink-0"
                    title="Use latest prompt image"
                  >
                    Latest Art
                  </button>
                )}
              </div>
            </div>

            {/* Target URL / Link */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Action Click Link (e.g. /, /create, or prompt URL)
              </label>
              <input
                type="text"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="/"
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs text-neutral-900 dark:text-white focus:ring-2 focus:ring-[#E60023] focus:outline-none font-medium"
              />
            </div>

            {/* Trigger Web Push Toggle */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="trigger-web-push"
                checked={triggerWebPush}
                onChange={(e) => setTriggerWebPush(e.target.checked)}
                className="rounded text-[#E60023] focus:ring-[#E60023]"
              />
              <label htmlFor="trigger-web-push" className="text-xs text-neutral-700 dark:text-neutral-300 font-medium">
                Also broadcast instant browser desktop push notification
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSending}
              className="w-full py-3 rounded-2xl bg-[#E60023] hover:bg-[#ad081b] text-white font-extrabold text-sm shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 transition-all transform active:scale-98 disabled:opacity-50"
              id="send-notification-btn"
            >
              {isSending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Broadcasting Notification...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send Notification Now</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Live Pinterest Card Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#E60023]" />
              <span>Live Pinterest Card Preview</span>
            </h2>
            <p className="text-xs text-neutral-500">
              This is how your notification will appear in the user&apos;s slide-over drawer:
            </p>

            {/* Pinterest Preview Card */}
            <div className="p-3.5 rounded-2xl bg-red-50/60 dark:bg-neutral-800/80 border border-red-200/60 dark:border-neutral-700 flex items-start gap-3 shadow-xs">
              {/* Unread dot + Icon */}
              <div className="flex items-center gap-2 shrink-0 pt-1">
                <span className="w-2 h-2 rounded-full bg-[#E60023] shrink-0" />
                <div className="w-9 h-9 rounded-full bg-[#E60023] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Flame className="w-4 h-4" />
                </div>
              </div>

              {/* Text info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200">
                    {targetCategory || 'Cyberpunk'}
                  </span>
                  <span className="text-[10px] text-neutral-400">• Just now</span>
                </div>
                <h4 className="text-xs font-extrabold text-neutral-900 dark:text-white leading-snug">
                  {title || '🔥 10 New Cyberpunk 8K Street Portraits'}
                </h4>
                <p className="text-[11px] text-neutral-600 dark:text-neutral-300 mt-0.5 line-clamp-2">
                  {message || 'Curated neon rain aesthetic formulas engineered for Midjourney v6 and Flux. Tap to copy prompt.'}
                </p>
              </div>

              {/* Image thumbnail */}
              <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-neutral-200 dark:border-neutral-700 bg-neutral-200 dark:bg-neutral-800">
                <Image
                  src={imageUrl || posts[0]?.imageUrl || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80'}
                  alt="Preview"
                  fill
                  className="object-cover"
                  sizes="56px"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>

            <div className="pt-2 text-[11px] text-neutral-400 text-center">
              ✓ Matches Pinterest visual styling with unread indicator and right thumbnail
            </div>
          </div>
        </div>
      </div>

      {/* Sent Notifications History */}
      <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#E60023]" />
              <span>Sent Notifications History</span>
            </h2>
            <p className="text-xs text-neutral-500">
              {notifications.length} notifications currently active in users&apos; feeds
            </p>
          </div>
        </div>

        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className="py-3.5 flex items-center justify-between gap-4 group"
            >
              <div className="flex items-center gap-3 min-w-0">
                {notif.imageUrl ? (
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-neutral-200 dark:border-neutral-700">
                    <Image
                      src={notif.imageUrl}
                      alt={notif.title}
                      fill
                      className="object-cover"
                      sizes="48px"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                    <Bell className="w-5 h-5 text-neutral-400" />
                  </div>
                )}

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-100 dark:bg-red-950/60 text-[#E60023]">
                      {notif.category}
                    </span>
                    <span className="text-[11px] text-neutral-400">
                      {new Date(notif.createdAt).toLocaleDateString()} {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white truncate mt-0.5">
                    {notif.title}
                  </h4>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                    {notif.message}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setTitle(notif.title);
                    setMessage(notif.message);
                    setTargetCategory(notif.category);
                    setImageUrl(notif.imageUrl || '');
                    setTargetUrl(notif.targetUrl || '/');
                    showToast('Notification details loaded into composer');
                  }}
                  className="px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-bold transition-colors"
                >
                  Clone
                </button>
                <button
                  type="button"
                  onClick={() => deleteNotification(notif.id)}
                  className="p-2 rounded-full text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                  title="Delete notification"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Auto-fill Prompt Picker Modal */}
      {showPromptPicker && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-lg w-full p-6 space-y-4 max-h-[80vh] flex flex-col border border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
              <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
                Select a Prompt to Promote
              </h3>
              <button
                onClick={() => setShowPromptPicker(false)}
                className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white text-xs font-bold"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 divide-y divide-neutral-100 dark:divide-neutral-800">
              {posts.map((p) => (
                <div
                  key={p.id}
                  onClick={() => handleSelectPostForNotification(p)}
                  className="pt-2 flex items-center gap-3 p-2 rounded-2xl hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
                >
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0">
                    <Image
                      src={p.imageUrl}
                      alt={p.title}
                      fill
                      className="object-cover"
                      sizes="48px"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                      {p.title}
                    </p>
                    <p className="text-[11px] text-neutral-500 truncate">
                      {p.category} • {p.aiTool}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
