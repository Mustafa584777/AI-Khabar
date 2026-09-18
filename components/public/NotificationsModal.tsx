'use client';

import React, { useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { X, Bell } from 'lucide-react';
import { NotificationsView } from '@/components/public/NotificationsView';

export const NotificationsModal = () => {
  const { isNotificationsModalOpen, setIsNotificationsModalOpen } = useApp();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isNotificationsModalOpen) {
        setIsNotificationsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isNotificationsModalOpen, setIsNotificationsModalOpen]);

  if (!isNotificationsModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-2xl p-4 sm:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-red-50 dark:bg-red-950/60 text-[#E60023] flex items-center justify-center shadow-xs">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-neutral-900 dark:text-white">
                Notifications & Updates
              </h3>
              <p className="text-xs text-neutral-500">
                Instant drops, trending prompts, and category alerts
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsNotificationsModalOpen(false)}
            className="w-9 h-9 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-500 hover:text-neutral-900 dark:hover:text-white flex items-center justify-center transition-all cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <NotificationsView />
      </div>
    </div>
  );
};
