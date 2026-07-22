'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface DRFTNButtonProps {
  children: React.ReactNode;
  href?: string;
  onClick?: (e: React.MouseEvent) => void;
  variant?: 'primary' | 'secondary' | 'outline';
  fullWidth?: boolean;
  className?: string;
  icon?: React.ReactNode;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
}

export default function DRFTNButton({
  children,
  href,
  onClick,
  variant = 'primary',
  fullWidth = false,
  className = '',
  icon = <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />,
  type = 'button',
  disabled = false,
}: DRFTNButtonProps) {
  const baseClasses = `
    relative group inline-flex items-center justify-center gap-2.5
    px-7 py-3.5 rounded-none font-display font-bold text-xs tracking-[0.18em] uppercase
    select-none overflow-hidden transition-all duration-300 ease-out
    active:scale-[0.96] disabled:opacity-50 disabled:pointer-events-none
    ${fullWidth ? 'w-full' : 'w-auto'}
    ${className}
  `;

  const variantClasses = {
    primary: `
      bg-white text-black border border-white
      hover:bg-black hover:text-white hover:border-white
      shadow-[0_4px_20px_rgba(255,255,255,0.15)]
    `,
    secondary: `
      bg-transparent text-white border border-white/40
      hover:border-white hover:bg-white hover:text-black
    `,
    outline: `
      bg-transparent text-white/80 border border-zinc-800
      hover:border-zinc-500 hover:text-white hover:bg-zinc-900/60
    `,
  };

  const combinedClasses = `${baseClasses} ${variantClasses[variant]}`;

  const content = (
    <>
      {/* Sliding hover fill layer */}
      <span className="absolute inset-0 bg-current opacity-0 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none" />

      {/* Button label */}
      <span className="relative z-10 font-bold">{children}</span>

      {/* Icon */}
      {icon && <span className="relative z-10">{icon}</span>}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={combinedClasses} onClick={onClick}>
        {content}
      </Link>
    );
  }

  return (
    <button type={type} className={combinedClasses} onClick={onClick} disabled={disabled}>
      {content}
    </button>
  );
}
