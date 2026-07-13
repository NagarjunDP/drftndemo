'use client';

import { AuthenticateWithRedirectCallback } from '@clerk/nextjs';

/**
 * Clerk SSO Callback page.
 * After Google (or any OAuth) sign-in, Clerk redirects here to finalise the
 * session.  AuthenticateWithRedirectCallback handles the token exchange and
 * then redirects the user to the origin page (window.location.origin).
 */
export default function SSOCallbackPage() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <AuthenticateWithRedirectCallback />
    </div>
  );
}
