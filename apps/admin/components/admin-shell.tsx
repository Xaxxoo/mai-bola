'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAdminAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const navigation = [
  ['Dashboard', '/dashboard', '⌂'], ['Requests', '/requests', '▣'], ['Routes', '/routes', '↝'],
  ['Suppliers', '/suppliers', '♙'], ['Payouts', '/payouts', '₦'], ['Inventory', '/inventory', '▤'],
  ['Sales', '/sales', '↗'], ['Settings', '/settings', '⚙'],
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAdminAuth();
  useEffect(() => { if (!loading && !user) router.replace('/login'); }, [loading, router, user]);
  if (loading) return <div className="flex min-h-screen items-center justify-center bg-bg"><Skeleton className="h-10 w-48" /></div>;
  if (!user || user.role !== 'ADMIN') return null;
  return (
    <div className="min-h-screen bg-bg">
      <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-forest px-4 py-6 text-white">
        <Link href="/dashboard" className="mb-10 px-3"><p className="text-xs text-green-200">Mai Bola</p><p className="font-heading text-2xl font-bold">Operations</p></Link>
        <nav className="space-y-1">
          {navigation.map(([label, href, icon]) => <Link key={href} href={href} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-colors ${pathname === href || (href !== '/dashboard' && pathname.startsWith(href)) ? 'bg-white/15 font-semibold text-white' : 'text-green-100 hover:bg-white/10'}`}><span className="w-5 text-center text-lg">{icon}</span>{label}</Link>)}
        </nav>
        <div className="mt-auto border-t border-white/10 pt-4"><p className="truncate px-3 text-sm font-medium">{user.fullName}</p><p className="px-3 text-xs text-green-200">Administrator</p><Button variant="ghost" size="sm" onClick={logout} className="mt-3 w-full justify-start text-green-100 hover:bg-white/10 hover:text-white">↪ Log out</Button></div>
      </aside>
      <div className="pl-64"><header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-gray-200 bg-white/95 px-8 backdrop-blur"><div><p className="text-xs uppercase tracking-wider text-muted">Operations dashboard</p><p className="text-sm font-semibold text-text">{navigation.find(([, href]) => pathname === href || (href !== '/dashboard' && pathname.startsWith(href)))?.[0] || 'Dashboard'}</p></div><div className="flex items-center gap-3"><span className="h-2 w-2 rounded-full bg-green-500" /><span className="text-sm text-muted">{user.fullName}</span></div></header><main className="mx-auto max-w-app p-8">{children}</main></div>
    </div>
  );
}
