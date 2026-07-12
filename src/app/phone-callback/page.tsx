'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

function PhoneCallbackContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [origin, setOrigin] = useState<string>('');

  useEffect(() => {
    const flowOrigin = sessionStorage.getItem('auth_flow_origin') || '';
    setOrigin(flowOrigin);

    const accessToken = searchParams.get('access_token');
    if (!accessToken) {
      setStatus('error');
      setErrorMessage('No verification token found. Please try again.');
      return;
    }

    if (window.opener) {
      // ── Popup flow ──────────────────────────────────────────────────
      // Send access token back to the parent window, then close ourselves.
      try {
        window.opener.postMessage(
          { type: 'PHONE_EMAIL_VERIFIED', accessToken },
          window.location.origin
        );
        window.close();
      } catch (e) {
        console.error('Failed to post message to opener:', e);
        // If postMessage fails, fall through to direct verification below.
        verifyDirectly(accessToken, flowOrigin);
      }
    } else {
      // ── In-tab flow (popup was blocked or user opened link directly) ─
      verifyDirectly(accessToken, flowOrigin);
    }
  }, [searchParams]);

  async function verifyDirectly(accessToken: string, flowOrigin: string) {
    try {
      // New flow: just send the access token — server fetches phone from phone.email
      const res = await fetch('/api/auth/verify-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (data.isNewUser) {
          // New user: stash the temp token so the main page can open the profile step
          sessionStorage.setItem('pending_new_user_temp_token', data.tempToken);
          sessionStorage.removeItem('auth_flow_origin');
          setStatus('success');
          // Redirect — AuthContext on the main page will detect the token and open profile step
          setTimeout(() => {
            window.location.href = flowOrigin === 'checkout' ? '/checkout' : '/';
          }, 1200);
        } else {
          // Returning user: session cookie already set by server — just redirect
          setStatus('success');
          sessionStorage.removeItem('auth_flow_origin');
          setTimeout(() => {
            window.location.href = flowOrigin === 'checkout' ? '/checkout' : '/';
          }, 1200);
        }
      } else {
        setStatus('error');
        setErrorMessage(data.error || 'Phone verification failed. Please try again.');
      }
    } catch (err) {
      console.error('Direct verification error:', err);
      setStatus('error');
      setErrorMessage('An unexpected error occurred. Please try again.');
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-6 text-center select-none">
      <div className="w-full max-w-md p-8 bg-zinc-950 border border-zinc-800/80 rounded-2xl shadow-2xl relative overflow-hidden backdrop-blur-md">
        {/* Decorative glows */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-zinc-800 rounded-full blur-3xl opacity-20 pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-zinc-800 rounded-full blur-3xl opacity-20 pointer-events-none" />

        {status === 'verifying' && (
          <div className="flex flex-col items-center space-y-6 py-6">
            <Loader2 className="w-12 h-12 text-zinc-400 animate-spin stroke-[1.5]" />
            <div className="space-y-2">
              <h2 className="text-xl font-bold tracking-tight text-zinc-100">Verifying Your Phone</h2>
              <p className="text-sm text-zinc-500 max-w-xs leading-relaxed">
                Confirming OTP with secure servers. Please do not close or reload this page.
              </p>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center space-y-6 py-6">
            <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center animate-bounce">
              <CheckCircle2 className="w-8 h-8 stroke-[1.5]" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold tracking-tight text-zinc-100">Verification Successful</h2>
              <p className="text-sm text-zinc-500">
                Redirecting you back shortly…
              </p>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center space-y-6 py-4">
            <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 stroke-[1.5]" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold tracking-tight text-zinc-100">Verification Failed</h2>
              <p className="text-sm text-red-400/90 font-medium px-4 leading-relaxed">
                {errorMessage}
              </p>
            </div>
            <div className="pt-4 w-full">
              <Link
                href={origin === 'checkout' ? '/checkout' : '/'}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-800 rounded-xl text-sm font-medium tracking-wide transition-all duration-200 group active:scale-[0.98]"
              >
                <ArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
                Return to Home
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PhoneCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-6 text-center select-none">
        <div className="w-full max-w-md p-8 bg-zinc-950 border border-zinc-800/80 rounded-2xl flex flex-col items-center space-y-6 py-12">
          <Loader2 className="w-12 h-12 text-zinc-600 animate-spin stroke-[1.5]" />
          <p className="text-sm text-zinc-500 uppercase tracking-widest font-semibold text-xs">Loading…</p>
        </div>
      </div>
    }>
      <PhoneCallbackContent />
    </Suspense>
  );
}
