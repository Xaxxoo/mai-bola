import type { Metadata, Viewport } from 'next';
import { inter, lora } from '@/lib/fonts';
import { Providers } from '@/components/providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mai Bola',
  description: 'PET bottle recovery platform — Kaduna, Nigeria',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Mai Bola',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#14342B',
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${lora.variable}`}>
      <body>
        <Providers>
          <div className="mx-auto max-w-app min-h-screen pb-20">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
