'use client';

import { usePathname } from 'next/navigation';
import NewsletterBar from './NewsletterBar';

const HIDDEN_ON = ['/', '/kontakt'];

export default function NewsletterBarConditional() {
  const pathname = usePathname();
  if (HIDDEN_ON.includes(pathname)) return null;
  return <NewsletterBar />;
}
