'use client';

import React from 'react';
import { usePathname } from 'next/navigation';

// Pure CSS page transition — zero framer-motion JS on the critical path.
// The @view-transition { navigation: auto } in globals.css handles the
// cross-page animation natively in the browser.
// This component just provides the key so React re-mounts the subtree
// on route change, which triggers the CSS view transition.
export default function PageTransition({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
