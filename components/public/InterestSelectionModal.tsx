'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { NotificationService } from '@/lib/notifications';
import { X, Check, Bell, Sparkles, SlidersHorizontal } from 'lucide-react';

interface InterestSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (selectedInterests: string[]) => void;
}

export const InterestSelectionModal: React.FC<InterestSelectionModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const { categories, showToast, tasteProfile, updateTasteProfile } = useApp();

  const [selected, setSelected] = useState<string[]>(() => {
    const prefs = NotificationService.getPreferences();
    return prefs.selectedInterests && prefs.selectedInterests.length > 0
      ? prefs.selectedInterests
      : categories.slice(0, 4).map((c) => c.name);
  });

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return NotificationService.getPreferences().soundEnabled;
  });

  if (!isOpen) return null;

  const toggleInterest = (catName: string) => {
    if (selected.includes(catName)) {
      if (selected.length <= 1) {
        showToast('Please keep at least 1 interest selected');
        return;
      }
      setSelected(selected.filter((s) => s !== catName));
    } else {
      setSelected([...selected, catName]);
    }
  };

  const handleSelectAll = () => {
    setSelected(categories.map((c) => c.name));
  };

  const handleClear = () => {
    setSelected([categories[0]?.name || 'Photorealistic & Portraits']);
  };

  const handleSave = () => {
    const prefs = NotificationService.getPreferences();
    prefs.selectedInterests = selected;
    prefs.soundEnabled = soundEnabled;
    NotificationService.savePreferences(prefs);

    // Sync to user taste profile as well
    updateTasteProfile({
      favoriteStyles: selected.slice(0, 8),
    });

    showToast(`Saved! You'll receive notifications for ${selected.length} selected interests.`);
    if (onSaved) onSaved(selected);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-neutral-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="space-y-1.5 pr-8">
          <div className="flex items-center gap-2 text-[#E60023] font-bold text-xs">
            <SlidersHorizontal className="w-4 h-4" />
            <span>Personalization Settings</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
            Choose Your Push Notification Interests
          </h2>
          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
            Select the categories you want instant notifications for when new prompts drop.
          </p>
        </div>

        {/* Quick Selection Buttons */}
        <div className="flex items-center justify-between text-xs font-semibold pt-1 border-t border-neutral-200 dark:border-neutral-800">
          <span className="text-neutral-500">
            Selected: <strong className="text-neutral-900 dark:text-white">{selected.length}</strong> categories
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-[#E60023] hover:underline"
            >
              Select All
            </button>
            <span className="text-neutral-300 dark:text-neutral-700">•</span>
            <button
              type="button"
              onClick={handleClear}
              className="text-neutral-500 hover:underline"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Category Chips Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {categories.map((cat) => {
            const isChecked = selected.includes(cat.name);
            return (
              <button
                key={cat.id || cat.name}
                type="button"
                onClick={() => toggleInterest(cat.name)}
                className={`flex items-center justify-between p-3 rounded-2xl text-left text-xs font-bold transition-all border ${
                  isChecked
                    ? 'bg-red-50 dark:bg-red-950/40 text-[#E60023] border-[#E60023] shadow-xs'
                    : 'bg-neutral-50 dark:bg-neutral-800/60 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100'
                }`}
              >
                <span className="truncate pr-2">{cat.name}</span>
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    isChecked
                      ? 'bg-[#E60023] text-white'
                      : 'border border-neutral-300 dark:border-neutral-600 text-transparent'
                  }`}
                >
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Sound toggle */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-2.5">
            <Bell className="w-4 h-4 text-[#E60023]" />
            <div>
              <p className="text-xs font-bold text-neutral-900 dark:text-white">Notification Chime</p>
              <p className="text-[11px] text-neutral-500">Play sweet chime when drops arrive</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`w-11 h-6 rounded-full p-1 transition-colors ${
              soundEnabled ? 'bg-[#E60023]' : 'bg-neutral-300 dark:bg-neutral-700'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform ${
                soundEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Save Button */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-2xl border border-neutral-300 dark:border-neutral-700 text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-3 px-4 rounded-2xl bg-[#E60023] hover:bg-[#ad081b] text-white text-xs font-bold shadow-lg shadow-red-500/25 transition-all transform active:scale-98"
          >
            Save Interests
          </button>
        </div>
      </div>
    </div>
  );
};
