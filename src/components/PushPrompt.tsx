'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell } from 'lucide-react';
import { toast } from '@/lib/toast';

export default function PushPrompt() {
  const [isVisible, setIsVisible] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    // Check if push notifications are supported
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return;
    }

    // Check if user already granted or denied permission
    const localSub = localStorage.getItem('push_alerts_subscribed') === 'true';
    if (localSub || Notification.permission !== 'default') {
      return;
    }

    // Check if user dismissed the prompt recently (e.g., within 7 days)
    const dismissedAt = localStorage.getItem('push_prompt_dismissed_at');
    if (dismissedAt) {
      const dismissTime = parseInt(dismissedAt, 10);
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - dismissTime < sevenDays) {
        return;
      }
    }

    // Delay prompt appearance by 15 seconds
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 15000);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('push_prompt_dismissed_at', Date.now().toString());
    setIsVisible(false);
  };

  const handleSubscribe = async () => {
    try {
      setIsSubscribing(true);

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setIsVisible(false);
        return; // User denied or dismissed native prompt
      }

      // Register or get service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // Subscribe to push manager
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

      // Send to backend
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.toJSON().keys?.p256dh,
            auth: subscription.toJSON().keys?.auth,
          },
          productId: null, // General drops
        }),
      });

      if (!res.ok) throw new Error('Failed to save subscription');

      localStorage.setItem('push_alerts_subscribed', 'true');
      window.dispatchEvent(new Event('push-subscription-changed'));

      toast.success('Successfully subscribed to drop alerts.');
      setIsVisible(false);
    } catch (error) {
      console.error('Push subscription failed:', error);
      toast.error('Could not enable notifications. Please try again.');
      setIsVisible(false); // Make prompt disappear on error too
    } finally {
      setIsSubscribing(false);
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 150, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 150, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          className="fixed bottom-24 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-[380px] z-[90] pointer-events-none"
        >
          <div className="bg-zinc-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl pointer-events-auto flex flex-col gap-3">
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 text-zinc-500 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3 text-white">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4 text-white" />
              </div>
              <div>
                <h4 className="text-sm font-bold uppercase tracking-wider">Get Notified</h4>
                <p className="text-[11px] text-zinc-400 mt-0.5">About restocks & drops. No spam. Just the essentials.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={handleSubscribe}
                disabled={isSubscribing}
                className="flex-1 bg-white hover:bg-zinc-200 text-black py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors shadow-[0_0_15px_rgba(255,255,255,0.1)] disabled:opacity-50"
              >
                {isSubscribing ? 'Subscribing...' : 'Notify Me'}
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-white transition-colors"
              >
                Not Now
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
