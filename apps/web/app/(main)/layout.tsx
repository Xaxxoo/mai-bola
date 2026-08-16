 'use client';

import { BottomNav } from '@/components/ui/bottom-nav';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { useAuth } from '@/lib/auth-context';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  return (
    <>
      <div className={user ? 'mx-auto min-h-screen max-w-app pb-20' : 'min-h-screen'}>
        {user && <div className="flex justify-end px-5 pt-3"><NotificationBell /></div>}
        {children}
      </div>
      {user && <BottomNav />}
    </>
  );
}
