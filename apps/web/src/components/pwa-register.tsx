'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker in production only. Renders nothing.
 * Mounted once from the root layout.
 */
export function PwaRegister() {
  useEffect(() => {
    if (
      typeof navigator !== 'undefined' &&
      'serviceWorker' in navigator &&
      process.env.NODE_ENV === 'production'
    ) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Registration failures are non-fatal; the app works without the SW.
      });
    }
  }, []);

  return null;
}
