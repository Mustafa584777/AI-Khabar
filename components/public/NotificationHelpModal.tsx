'use client';

import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Lock,
  Globe,
  Smartphone,
  ShieldAlert,
  Info,
  ExternalLink,
} from 'lucide-react';
import { NotificationService } from '@/lib/notifications';

interface NotificationHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPermissionGranted?: () => void;
}

export const NotificationHelpModal: React.FC<NotificationHelpModalProps> = ({
  isOpen,
  onClose,
  onPermissionGranted,
}) => {
  const [activeTab, setActiveTab] = useState<'brave' | 'chrome' | 'android' | 'ios' | 'incognito'>('brave');
  const [checkStatus, setCheckStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRecheck = async () => {
    setCheckStatus('Checking browser permission...');
    const status = NotificationService.getBrowserPermissionStatus();
    if (status === 'granted') {
      setCheckStatus('Permission is granted! Updating status...');
      if (onPermissionGranted) {
        onPermissionGranted();
      }
      setTimeout(() => {
        onClose();
      }, 1000);
    } else {
      setCheckStatus('Still blocked or default. Please make sure you changed it to "Allow" in your address bar.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      id="notification-help-modal"
    >
      <div className="relative w-full max-w-lg bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-neutral-100 dark:border-neutral-800 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-100 dark:bg-red-950/60 text-[#E60023] flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-neutral-900 dark:text-white">
                How to Enable Notifications
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Fix automatic blocking in Brave, Chrome, Edge, and Incognito tabs
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 px-5 py-2.5 bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-100 dark:border-neutral-800 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('brave')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'brave'
                ? 'bg-[#E60023] text-white shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/60 dark:hover:bg-neutral-800'
            }`}
          >
            🦁 Brave
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('incognito')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'incognito'
                ? 'bg-[#E60023] text-white shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/60 dark:hover:bg-neutral-800'
            }`}
          >
            🕵️ Incognito / Private
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('chrome')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'chrome'
                ? 'bg-[#E60023] text-white shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/60 dark:hover:bg-neutral-800'
            }`}
          >
            🌐 Chrome & Edge
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('android')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'android'
                ? 'bg-[#E60023] text-white shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/60 dark:hover:bg-neutral-800'
            }`}
          >
            📱 Android
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ios')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'ios'
                ? 'bg-[#E60023] text-white shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/60 dark:hover:bg-neutral-800'
            }`}
          >
            🍎 iPhone (iOS)
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-neutral-700 dark:text-neutral-300">
          {activeTab === 'brave' && (
            <div className="space-y-3.5">
              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  <strong>Why Brave blocks notifications:</strong> Brave has strict privacy shields and disables background push by default in Private/Incognito windows.
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 flex items-center justify-center text-xs font-black shrink-0">
                    1
                  </span>
                  <div>
                    <p className="font-bold text-neutral-900 dark:text-white">
                      Make sure you are in a Normal Tab
                    </p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Brave strictly disables push notifications in Private / Tor windows. Switch to a regular Brave tab.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 flex items-center justify-center text-xs font-black shrink-0">
                    2
                  </span>
                  <div>
                    <p className="font-bold text-neutral-900 dark:text-white">
                      Click the Tune / Lock Icon in the Address Bar
                    </p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      At the left of the URL bar (next to the domain), tap the <strong>Sliders / Lock icon 🔒</strong>.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 flex items-center justify-center text-xs font-black shrink-0">
                    3
                  </span>
                  <div>
                    <p className="font-bold text-neutral-900 dark:text-white">
                      Change Notifications to &quot;Allow&quot;
                    </p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Toggle <strong>Notifications</strong> from &quot;Block&quot; to <strong>&quot;Allow&quot;</strong>, then refresh the page.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'incognito' && (
            <div className="space-y-3.5">
              <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-900 dark:text-red-200 text-xs flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Why Incognito Mode Automatically Blocks Notifications:</p>
                  <p className="mt-1 leading-relaxed">
                    All major browsers (Brave, Chrome, Edge, Firefox, Safari) <strong>permanently block Web Push Notifications in Incognito / Private tabs</strong>.
                    This is a security standard: push notification subscriptions require persistent endpoints that track identity across sessions, which violates Incognito privacy rules.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800 space-y-2">
                <p className="font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  How to Enable:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-xs text-neutral-600 dark:text-neutral-300">
                  <li>Copy the website URL or open a new regular tab.</li>
                  <li>Log in to your account in the regular tab.</li>
                  <li>Tap <strong>&quot;Allow Notifications&quot;</strong> when prompted. The browser will allow you to approve alerts!</li>
                </ol>
              </div>
            </div>
          )}

          {activeTab === 'chrome' && (
            <div className="space-y-3">
              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                If notifications were blocked previously in Google Chrome or Microsoft Edge:
              </p>
              <div className="space-y-2">
                <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 flex items-center justify-center text-xs font-black shrink-0">
                    1
                  </span>
                  <div>
                    <p className="font-bold text-neutral-900 dark:text-white">
                      Tap the Tune / Lock icon in the address bar
                    </p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      On the left side of the address bar, click the site control icon.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 flex items-center justify-center text-xs font-black shrink-0">
                    2
                  </span>
                  <div>
                    <p className="font-bold text-neutral-900 dark:text-white">
                      Open &quot;Site Settings&quot; or &quot;Permissions&quot;
                    </p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Find <strong>Notifications</strong> in the permissions list.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 flex items-center justify-center text-xs font-black shrink-0">
                    3
                  </span>
                  <div>
                    <p className="font-bold text-neutral-900 dark:text-white">
                      Change to &quot;Allow&quot; and reload
                    </p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Switch from &quot;Block&quot; to <strong>&quot;Allow&quot;</strong>, then refresh the page.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'android' && (
            <div className="space-y-3">
              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                On Android smartphones or tablets:
              </p>
              <div className="space-y-2">
                <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 flex items-center justify-center text-xs font-black shrink-0">
                    1
                  </span>
                  <div>
                    <p className="font-bold text-neutral-900 dark:text-white">
                      Browser Site Permissions
                    </p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Tap the 3 dots (⋮) or lock icon in the address bar → <strong>Permissions</strong> → Enable <strong>Notifications</strong>.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 flex items-center justify-center text-xs font-black shrink-0">
                    2
                  </span>
                  <div>
                    <p className="font-bold text-neutral-900 dark:text-white">
                      Phone System Settings (Android 13+)
                    </p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Open Android phone <strong>Settings → Apps → Chrome / Brave → Notifications</strong> → Ensure &quot;All Chrome notifications&quot; is turned ON.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ios' && (
            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 text-sky-950 dark:text-sky-200 text-xs flex items-start gap-2.5">
                <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <p>
                  Apple requires Web Apps to be installed on the Home Screen for push notifications to work on iOS 16.4+.
                </p>
              </div>

              <div className="space-y-2">
                <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 flex items-center justify-center text-xs font-black shrink-0">
                    1
                  </span>
                  <div>
                    <p className="font-bold text-neutral-900 dark:text-white">
                      Open this site in Safari
                    </p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Tap the <strong>Share</strong> button (square with arrow pointing up) at the bottom.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 flex items-center justify-center text-xs font-black shrink-0">
                    2
                  </span>
                  <div>
                    <p className="font-bold text-neutral-900 dark:text-white">
                      Tap &quot;Add to Home Screen&quot;
                    </p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Scroll down and select <strong>&quot;Add to Home Screen&quot;</strong>, then tap Add.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 flex items-center justify-center text-xs font-black shrink-0">
                    3
                  </span>
                  <div>
                    <p className="font-bold text-neutral-900 dark:text-white">
                      Launch from Home Screen
                    </p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Open the app from your home screen and turn on notifications smoothly!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-950 flex flex-col sm:flex-row items-center justify-between gap-3">
          {checkStatus ? (
            <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
              {checkStatus}
            </p>
          ) : (
            <p className="text-[11px] text-neutral-500">
              Changed the setting? Tap below to re-check.
            </p>
          )}

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleRecheck}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700 text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-neutral-500" />
              <span>Check Again</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-black dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
