import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';

import { PwaRegister } from '@/components/pwa-register';

import './globals.css';
import { Providers } from './providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Amstel Rewards',
  description: 'Loyalty, Rewards & Tournament Management Platform',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Amstel Rewards',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#C8102E' },
    { media: '(prefers-color-scheme: dark)', color: '#C8102E' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
        <PwaRegister />
      </body>
    </html>
  );
}
