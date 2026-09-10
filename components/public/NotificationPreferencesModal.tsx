'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { X, Bell, Check, Sparkles, Volume2, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const NotificationPreferencesModal = () => {
  const {
    isNotificationPreferencesModalOpen,
    setIsNotificationPreferencesModalOpen,
    notificationPreferences,
    updateNotificationPreferences,
    categories,
    showToast,
  } = useApp();

  // Local copy of categories
  const [selectedCats, setSelectedCats] = useState<string[]>(() => {
    return notificationPreferences.enabledCategories || ['all'];
  });

  const [pushEnabled, setPushEnabled] = useState<boolean>(() => {
    return !!notificationPreferences.browserPushEnabled;
  });

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return notificationPreferences.soundEnabled !== false;
  });

  if (!isNotificationPreferencesModalOpen) return null;

  // Build combined list of interest options
  const defaultCategoryList = [
    'Cyberpunk',
    'Portrait',
    '35mm & Film',
    'Cinematic',
    'Street Photography',
    '3D Render',
    'Anime & Manga',
    'Studio Ghibli',
    'Architecture',
    'Fashion',
    'Logo & Vectors',
    'Minimalist',
    'Pixar & 3D Kids',
    'Underwater & Nature',
    'Fantasy Art',
  ];

  const allCategoryNames = Array.from(
    new Set([
      ...categories.map((c) => c.name),
      ...defaultCategoryList,
    ])
  ).filter(Boolean);

  const toggleCategory = (cat: string) => {
    if (cat === 'all') {
      if (selectedCats.includes('all')) {
        setSelectedCats([]);
      } else {
        setSelectedCats(['all', ...allCategoryNames]);
      }
      return;
    }

    if (selectedCats.includes(cat)) {
      const next = selectedCats.filter((c) => c !== cat && c !== 'all');
      setSelectedCats(next);
    } else {
      const next = [...selectedCats.filter((c) => c !== 'all'), cat];
      if (next.length === allCategoryNames.length) {
        setSelectedCats(['all', ...next]);
      } else {
        setSelectedCats(next);
      }
    }
  };

  const handleTogglePush = async () => {
    if (!pushEnabled) {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        try {
          const perm = await Notification.requestPermission();
          if (perm === 'granted') {
            setPushEnabled(true);
            new Notification('🔔 Notifications Active!', {
              body: 'You will receive real-time alerts when new prompts in your categories are published.',
              icon: '/logo.png',
            });
          } else {
            alert('Push notification permission was denied in your browser settings.');
          }
        } catch (e) {
          console.error('Error requesting notification permission:', e);
        }
      }
    } else {
      setPushEnabled(false);
    }
  };

  const handleSave = () => {
    const finalCategories = selectedCats.length === 0 ? ['all'] : selectedCats;
    updateNotificationPreferences({
      enabledCategories: finalCategories,
      browserPushEnabled: pushEnabled,
      soundEnabled: soundEnabled,
    });
    showToast('Notification preferences saved successfully!');
    setIsNotificationPreferencesModalOpen(false);
  };

  const selectAll = () => {
    setSelectedCats(['all', ...allCategoryNames]);
  };

  const clearAll = () => {
    setSelectedCats([]);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div
        className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden"
        id="notification-preferences-modal"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#E60023]/10 text-[#E60023] flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-neutral-900 dark:text-white leading-tight">
                Notification Interests
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Choose the categories and AI aesthetics you want updates for
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsNotificationPreferencesModalOpen(false)}
            className="p-2 rounded-full text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Push Permission Toggle Card */}
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#E60023] text-white flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-neutral-900 dark:text-white leading-tight">
                  Browser Push Notifications
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Receive instant desktop & mobile alerts even when this tab is closed
                </p>
              </div>
            </div>
            <button
              onClick={handleTogglePush}
              className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
                pushEnabled ? 'bg-[#E60023]' : 'bg-neutral-300 dark:bg-neutral-700'
              }`}
              id="notif-pref-push-toggle"
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform absolute top-0.5 ${
                  pushEnabled ? 'translate-x-6.5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Sound Notification Card */}
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 flex items-center justify-center shrink-0">
                <Volume2 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-neutral-900 dark:text-white leading-tight">
                  In-App Sound Alerts
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Play gentle chime on new personalized prompt drops
                </p>
              </div>
            </div>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
                soundEnabled ? 'bg-[#E60023]' : 'bg-neutral-300 dark:bg-neutral-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform absolute top-0.5 ${
                  soundEnabled ? 'translate-x-6.5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Category Interests Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-neutral-900 dark:text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#E60023]" />
                  <span>Choose Your Interests & Niches</span>
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  You will only receive alerts matching these selected topics
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-xs font-bold text-[#E60023] hover:underline"
                >
                  All
                </button>
                <span className="text-neutral-300 dark:text-neutral-700">|</span>
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-xs font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Interest Pills Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
              {/* All / Broadcast Option */}
              <button
                type="button"
                onClick={() => toggleCategory('all')}
                className={`p-3 rounded-2xl text-xs font-bold border transition-all text-left flex items-center justify-between ${
                  selectedCats.includes('all')
                    ? 'bg-[#E60023] text-white border-[#E60023] shadow-xs'
                    : 'bg-white dark:bg-neutral-800/80 text-neutral-800 dark:text-neutral-200 border-neutral-200 dark:border-neutral-700 hover:border-neutral-400'
                }`}
              >
                <span>🌟 All Categories</span>
                {selectedCats.includes('all') && <Check className="w-4 h-4 stroke-[3]" />}
              </button>

              {allCategoryNames.map((cat) => {
                const isSelected = selectedCats.includes('all') || selectedCats.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className={`p-3 rounded-2xl text-xs font-bold border transition-all text-left flex items-center justify-between ${
                      isSelected
                        ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-neutral-900 dark:border-white shadow-xs'
                        : 'bg-white dark:bg-neutral-800/80 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:border-neutral-400'
                    }`}
                  >
                    <span className="truncate">{cat}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3] shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/80 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-neutral-500">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Spam-free & strictly curated</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsNotificationPreferencesModalOpen(false)}
              className="px-4 py-2 rounded-full text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-full bg-[#E60023] hover:bg-[#ad081b] text-white text-xs font-black shadow-md shadow-red-500/20 transition-transform active:scale-95"
              id="notif-pref-save-btn"
            >
              Save Preferences
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
