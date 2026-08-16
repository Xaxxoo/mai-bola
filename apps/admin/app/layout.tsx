import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mai Bola Admin',
  description: 'Mai Bola admin dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
