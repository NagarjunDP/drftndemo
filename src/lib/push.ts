import webpush from 'web-push';
import { db } from '@/db';
import { pushSubscriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@drftn.in';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
} else {
  console.warn('VAPID keys not configured, push notifications will not work.');
}

/**
 * Sends a web push notification to a subscriber, automatically formatting URLs to the production domain
 * and attaching the official DRFTN logo assets.
 */
export async function sendPushNotification(subscription: any, rawPayload: any) {
  const baseUrl = 'https://www.drftnclothing.in';
  
  // Resolve relative URLs to the production domain
  const rawUrl = rawPayload.url || '/';
  const url = rawUrl.startsWith('http') ? rawUrl : `${baseUrl}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
  
  const payload = {
    ...rawPayload,
    url,
    // Add absolute production logo paths for visual delivery in notifications
    icon: 'https://www.drftnclothing.in/logo.png?v=3',
    badge: 'https://www.drftnclothing.in/logo-cropped.png',
  };

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      JSON.stringify(payload)
    );
  } catch (error: any) {
    // If the subscription is expired or unsubscribed, remove it from the DB
    if (error.statusCode === 404 || error.statusCode === 410) {
      console.log('Subscription expired or invalid, deleting from DB:', subscription.endpoint);
      try {
        await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, subscription.endpoint));
      } catch (dbError) {
        console.error('Failed to delete expired subscription:', dbError);
      }
    } else {
      console.error('Failed to send push notification:', error);
    }
  }
}
