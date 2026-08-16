import type { Metadata } from 'next';
import './globals.css';
import { AdminAuthProvider } from '@/lib/auth-context';

export const metadata: Metadata = {
  title: 'Mai Bola Admin',
  description: 'Mai Bola admin dashboard',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body><AdminAuthProvider>{children}</AdminAuthProvider></body>
    </html>
  );
}
