import { BottomNav } from '@/components/ui/bottom-nav';
import { NotificationBell } from '@/components/notifications/notification-bell';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="flex justify-end px-5 pt-3"><NotificationBell /></div>
      {children}
      <BottomNav />
    </>
  );
}
