'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  {
    href: '/',
    label: 'Home',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    href: '/pickups',
    label: 'Pickups',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
  },
  {
    href: '/wallet',
    label: 'Wallet',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
  },
  {
    href: '/profile',
    label: 'Profile',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-100 bg-white pb-safe">
      <div className="mx-auto flex max-w-app">
        {tabs.map((tab) => {
          const isActive =
            tab.href === '/'
              ? pathname === '/'
              : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs transition-colors ${
                isActive ? 'text-forest font-semibold' : 'text-muted'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
