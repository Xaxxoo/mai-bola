'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useDriverSync } from '@/lib/hooks/use-driver';
import { Skeleton } from '@/components/ui/skeleton';

export function DriverShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const pending = useDriverSync();

  useEffect(() => {
    if (!loading && (!user || user.role !== 'DRIVER')) router.replace('/');
  }, [loading, router, user]);

  if (loading || !user || user.role !== 'DRIVER') {
    return (
      <div className="space-y-4 px-4 pt-6">
        <Skeleton variant="text" className="h-7 w-40" />
        <Skeleton variant="rectangular" className="h-44 w-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 pb-8 pt-5">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          className="text-left"
          onClick={() => router.push('/driver')}
        >
          <p className="text-xs text-muted">Mai Bola Driver</p>
          <p className="font-heading text-xl font-bold text-forest">
            {pathname.startsWith('/driver/route') ? 'Today’s route' : 'Good morning'}
          </p>
        </button>
        {pending > 0 && (
          <span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800">
            {pending} {pending === 1 ? 'action' : 'actions'} pending sync
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
