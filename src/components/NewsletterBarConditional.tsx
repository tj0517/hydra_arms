'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import NewsletterBar from './NewsletterBar';

const HIDDEN_ON = ['/', '/kontakt'];

export default function NewsletterBarConditional() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  // Reset on every pathname change so the banner never races ahead of {children}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setMounted(true); }, [pathname]);

  if (!mounted || HIDDEN_ON.includes(pathname)) return null;
  return <NewsletterBar />;
}
