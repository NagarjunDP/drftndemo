'use client';

import React, { useState } from 'react';
import { useToast } from '@/components/ToastContainer';
import { useAuthSession } from '@/context/AuthContext';
import { User, Lock, Edit2, Check } from 'lucide-react';

interface ProfileSectionProps {
  initialName: string;
  phone: string;
}

export default function ProfileSection({ initialName, phone }: ProfileSectionProps) {
  const { addToast } = useToast();
  const { refreshUser } = useAuthSession();

  const [name, setName] = useState(initialName);
  const [isSaving, setIsSaving] = useState(false);
  const [isModified, setIsModified] = useState(false);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    setIsModified(val.trim() !== initialName.trim());
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (name.trim().length < 2) {
      addToast('Name must be at least 2 characters', 'error');
      return;
    }

    setIsSaving(true);

    try {
      const res = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        addToast('Profile updated successfully', 'success');
        setIsModified(false);
        // Refresh the global auth state
        await refreshUser();
      } else {
        addToast(data.error || 'Failed to update profile', 'error');
      }
    } catch (err) {
      console.error('Failed to save profile:', err);
      addToast('An error occurred. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="bg-zinc-950 border border-zinc-850 p-6 md:p-8 rounded-xl space-y-6">
      <div className="border-b border-zinc-900 pb-4">
        <h2 className="text-lg font-black uppercase tracking-widest font-mono flex items-center gap-2">
          <User className="w-5 h-5 text-zinc-400" />
          Profile Details
        </h2>
        <p className="text-[10px] text-zinc-550 font-mono uppercase tracking-wider mt-1">
          Manage your account information and contact details.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6 max-w-xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Name Input */}
          <div className="space-y-2">
            <label className="text-[9px] uppercase tracking-widest text-zinc-400 font-mono font-bold block">
              Full Name
            </label>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={handleNameChange}
                placeholder="Enter your full name"
                className="w-full bg-white text-black px-4 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-400 uppercase tracking-widest font-mono"
                required
                disabled={isSaving}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
                <Edit2 className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* Phone Number (Read Only) */}
          <div className="space-y-2">
            <label className="text-[9px] uppercase tracking-widest text-zinc-400 font-mono font-bold block flex items-center gap-1.5">
              Phone Number
              <Lock className="w-2.5 h-2.5 text-zinc-550" />
            </label>
            <div className="relative">
              <input
                type="text"
                value={phone}
                disabled
                className="w-full bg-zinc-900/50 border border-zinc-850 text-zinc-500 px-4 py-3 text-xs font-mono tracking-widest cursor-not-allowed select-none"
              />
            </div>
            <p className="text-[9px] text-zinc-650 font-mono uppercase">
              Phone number is verified and cannot be changed.
            </p>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={!isModified || isSaving}
            className={`w-full md:w-auto px-8 py-3.5 text-xs font-bold uppercase tracking-widest transition-all duration-200 flex items-center justify-center gap-2 ${
              isModified && !isSaving
                ? 'bg-white hover:bg-zinc-200 text-black cursor-pointer'
                : 'bg-zinc-900 border border-zinc-850 text-zinc-550 cursor-not-allowed'
            }`}
          >
            {isSaving ? (
              <>Saving Changes...</>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                Save Details
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  );
}
