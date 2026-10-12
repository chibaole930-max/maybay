import type { Metadata, Viewport } from 'next';
import './globals.css';
import './v2.css';
import './v2-extra.css';
import './v2-pages.css';
import './v3.css';
import 'leaflet/dist/leaflet.css';
// v5 owns the cascade: loaded last so the new design layer wins over v2–v4.
import './v5.css';
import { PwaRegister } from './pwa-register';

export const metadata: Metadata = {
  title: 'Vietnam Airline Tycoon — Quản lý Hãng hàng không Việt Nam',
  description: 'Trở thành hãng hàng không số 1 Việt Nam. Khởi nghiệp, phát triển đội bay, mở rộng mạng bay và tối ưu hóa lợi nhuận.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Airline Tycoon',
  },
};

export const viewport: Viewport = {
  themeColor: '#0B1F3A',
  width: 'device-width',
  height: 'device-height',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
