'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle } from 'lucide-react';

const WHATSAPP_CHANNEL_URL = 'https://whatsapp.com/channel/0029VbBdohQHltY7L6LJu703';
const SHOW_DURATION_MS = 5000;
const CYCLE_INTERVAL_MS = 30000;
const INITIAL_DELAY_MS = 1200;

export const WhatsAppFloatingButton = () => {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);

  const isAdminRoute = Boolean(
    pathname && (pathname.startsWith('/admin') || pathname.startsWith('/cms-login'))
  );

  useEffect(() => {
    if (isAdminRoute) {
      setIsVisible(false);
      return;
    }

    let hideTimer: ReturnType<typeof setTimeout> | null = null;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const triggerAppearance = () => {
      setIsVisible(true);
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        setIsVisible(false);
      }, SHOW_DURATION_MS);
    };

    const initialTimer = setTimeout(() => {
      triggerAppearance();
      intervalId = setInterval(triggerAppearance, CYCLE_INTERVAL_MS);
    }, INITIAL_DELAY_MS);

    return () => {
      clearTimeout(initialTimer);
      if (hideTimer) clearTimeout(hideTimer);
      if (intervalId) clearInterval(intervalId);
    };
  }, [isAdminRoute]);

  if (isAdminRoute) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.a
          key="whatsapp-channel-floating-btn"
          href={WHATSAPP_CHANNEL_URL}
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: 'easeInOut' }}
          aria-label="Join our WhatsApp Channel (48K+ members)"
          title="Join WhatsApp Channel (48K+)"
          id="whatsapp-floating-channel-btn"
          className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-[55] flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-[#25D366] hover:bg-[#1ebe5d] text-white shadow-lg shadow-[#25D366]/35 hover:shadow-xl border border-white/25 cursor-pointer select-none"
        >
          <MessageCircle className="w-5 h-5 fill-current shrink-0" />
          <span className="text-xs sm:text-sm font-extrabold tracking-tight tabular-nums leading-none">
            48K+
          </span>
        </motion.a>
      )}
    </AnimatePresence>
  );
};
