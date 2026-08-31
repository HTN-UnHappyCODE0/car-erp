import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Car ERP Pro — Hệ Thống Quản Trị Đại Lý Ô Tô Toàn Diện',
  description:
    'Hệ thống ERP phân hệ Đại lý Ô tô: Quản lý Kho xe VIN, CRM Leads, Đơn bán hàng State Machine, Xưởng dịch vụ & Tài chính. Built with Next.js 15 + Go RLS.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        {/* Preconnect to Google Fonts for Plus Jakarta Sans + Space Mono */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased selection:bg-[#ff682c] selection:text-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
