'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSignIn } from '@clerk/nextjs';
import { Lock, User, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ToastContainer';

function AdminLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const { isLoaded, signIn, setActive } = useSignIn() as any;
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const unauthorizedError = searchParams.get('error') === 'unauthorized';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn || !setActive) return;
    
    setIsLoading(true);
    setErrorMsg('');

    try {
      // Authenticate via Clerk
      const result = (await signIn.create({
        identifier: email,
        password,
      })) as any;

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        addToast('Logged in successfully', 'success');
        router.push('/admin');
        router.refresh();
      } else {
        setErrorMsg('Authentication incomplete. Please contact support.');
      }
    } catch (error: any) {
      console.error(error);
      const msg = error.errors?.[0]?.longMessage || error.message || 'Failed to login';
      setErrorMsg(msg);
      addToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4 animate-fade-in">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold tracking-[0.2em] text-brand-offwhite uppercase mb-2">
            D R F T N <span className="text-white font-light text-sm align-top">ADMIN</span>
          </h1>
          <p className="text-zinc-500 text-xs tracking-widest uppercase">Authorized Personnel Only</p>
        </div>

        <div className="bg-zinc-900/40 border border-zinc-800 p-8 rounded-none">
          <form onSubmit={handleLogin} className="space-y-6">
            {unauthorizedError && (
              <div className="bg-zinc-950 border border-zinc-800 p-4 text-xs text-white flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-bold uppercase tracking-wider block mb-1">Access Denied</span>
                  Your account does not have admin privileges. Please sign in with an administrator account.
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="bg-zinc-950 border border-zinc-800 p-4 text-xs text-white flex items-start gap-2.5 animate-shake">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-bold uppercase tracking-wider block mb-1">Login Error</span>
                  {errorMsg}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold flex items-center gap-2">
                <User className="w-3.5 h-3.5" />
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-900/80 border border-zinc-800 text-brand-offwhite px-4 py-3 text-sm focus:outline-none focus:border-brand-red transition-colors"
                placeholder="admin@drftn.in"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold flex items-center gap-2">
                <Lock className="w-3.5 h-3.5" />
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-900/80 border border-zinc-800 text-brand-offwhite px-4 py-3 text-sm focus:outline-none focus:border-white transition-colors"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !isLoaded}
              className="w-full bg-white text-black py-4 font-bold uppercase tracking-widest text-sm hover:bg-zinc-200 transition-colors disabled:opacity-50 mt-2"
            >
              {isLoading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-brand-black flex items-center justify-center text-zinc-400">Loading auth screen...</div>}>
      <AdminLoginContent />
    </Suspense>
  );
}
