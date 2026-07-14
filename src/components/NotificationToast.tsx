'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useCartStore } from '@/lib/cartStore';
import { useToast } from '@/components/ToastContainer';
import { X, Bell } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

export default function NotificationToast() {
  const { addToast } = useToast();
  const items = useCartStore((state) => state.items);
  const pathname = usePathname();

  const [isVisible, setIsVisible] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const prevItemsCount = useRef(items.reduce((acc, i) => acc + i.quantity, 0));

  // Stagger check
  const isAllowedPage = pathname === '/' || pathname === '/shop';

  const triggerToast = () => {
    // Only show if not already subscribed
    if (!('Notification' in window) || Notification.permission !== 'default') return;

    const localSub = localStorage.getItem('push_alerts_subscribed') === 'true';
    if (localSub) return;

    // Check localStorage dismissal
    const dismissedAt = localStorage.getItem('notification_toast_dismissed_at');
    if (dismissedAt) {
      const dismissTime = parseInt(dismissedAt, 10);
      const threeDays = 3 * 24 * 60 * 60 * 1000;
      if (Date.now() - dismissTime < threeDays) return;
    }

    // Check if other popups are open (by checking DOM elements or class names)
    const loginIncentiveActive = document.querySelector('style[dangerouslysetinnerhtml*="login_incentive"]') || document.body.innerHTML.includes('Continue with Mobile Number');
    if (loginIncentiveActive) return; // Stagger

    setIsVisible(true);
  };

  // 1. Trigger occasionally on session count
  useEffect(() => {
    if (!isAllowedPage) return;

    // Session count tracking
    const currentSession = sessionStorage.getItem('notif_toast_session_active');
    if (!currentSession) {
      sessionStorage.setItem('notif_toast_session_active', 'true');
      const sessionCountStr = localStorage.getItem('notif_toast_session_count') || '0';
      const newCount = parseInt(sessionCountStr, 10) + 1;
      localStorage.setItem('notif_toast_session_count', newCount.toString());

      // Show every 3 sessions after 8 seconds
      if (newCount % 3 === 0) {
        const timer = setTimeout(triggerToast, 8000);
        return () => clearTimeout(timer);
      }
    }
  }, [pathname, isAllowedPage]);

  // 2. Trigger on adding to bag
  useEffect(() => {
    const currentCount = items.reduce((acc, i) => acc + i.quantity, 0);
    if (currentCount > prevItemsCount.current) {
      // Cart items increased - trigger after 4 seconds stagger
      const timer = setTimeout(triggerToast, 4000);
      return () => clearTimeout(timer);
    }
    prevItemsCount.current = currentCount;
  }, [items]);

  const handleDismiss = () => {
    localStorage.setItem('notification_toast_dismissed_at', Date.now().toString());
    setIsVisible(false);
  };

  const handleSubscribe = async () => {
    try {
      setIsSubscribing(true);

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setIsVisible(false);
        return;
      }

      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      const rawKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!rawKey) {
        throw new Error('VAPID public key not configured');
      }
      const { urlBase64ToUint8Array } = await import('@/lib/vapid');
      const applicationServerKey = urlBase64ToUint8Array(rawKey);

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.toJSON().keys?.p256dh,
            auth: subscription.toJSON().keys?.auth,
          },
          productId: null,
        }),
      });

      if (!res.ok) throw new Error();

      localStorage.setItem('push_alerts_subscribed', 'true');
      window.dispatchEvent(new Event('push-subscription-changed'));

      addToast('Subscribed to drop alerts successfully.', 'success');
      setIsVisible(false);
    } catch (error) {
      console.error('Push subscription failed:', error);
      addToast('Could not enable notifications.', 'error');
      setIsVisible(false); // Make toast disappear on error too
    } finally {
      setIsSubscribing(false);
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          className="fixed bottom-24 left-4 z-[4000] max-w-sm pointer-events-auto"
        >
          <div className="bg-zinc-950 border border-white/10 p-4 shadow-2xl flex items-start gap-3.5 relative min-w-[280px]">
            {/* Close Button */}
            <button
              onClick={handleDismiss}
              className="absolute top-2 right-2 text-zinc-500 hover:text-white transition-colors"
              aria-label="Dismiss banner"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            {/* Icon */}
            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
              <Bell className="w-4 h-4 text-white" />
            </div>

            {/* Body */}
            <div className="flex-1 space-y-2">
              <div className="space-y-0.5 pr-4">
                <h4 className="text-[11px] font-black uppercase text-white tracking-widest font-mono">
                  DROP UPDATES
                </h4>
                <p className="text-[10px] text-zinc-400 uppercase tracking-wider leading-normal">
                  Want browser alerts for restocks and drops? Enable notifications.
                </p>
              </div>
              <button
                onClick={handleSubscribe}
                disabled={isSubscribing}
                className="bg-white hover:bg-zinc-200 text-black px-4 py-1.5 text-[9px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50 font-mono"
              >
                {isSubscribing ? 'Enabling...' : 'Enable Alerts'}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
