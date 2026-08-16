import { BottomNav } from '@/components/ui/bottom-nav';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <BottomNav />
    </>
  );
}
