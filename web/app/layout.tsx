import type { Metadata, Viewport } from "next";
import "./globals.css";
import TelegramProvider from "@/components/TelegramProvider";
import WebPushInit from "@/components/WebPushInit";
import SplashScreen from "@/components/SplashScreen";
import OfflineBanner from "@/components/OfflineBanner";
import InstallPrompt from "@/components/InstallPrompt";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://hamshirago.vercel.app";

export const metadata: Metadata = {
  title: {
    default: "HamshiraGo — Медсестра на дом",
    template: "%s — HamshiraGo",
  },
  description: "Вызовите медсестру на дом за 15–30 минут. Уколы, капельницы, измерение давления.",
  metadataBase: new URL(SITE_URL),
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "HamshiraGo — Медсестра на дом",
    description: "Медсестра на дом в Ташкенте — быстро и надёжно",
    type: "website",
    siteName: "HamshiraGo",
    locale: "ru_RU",
  },
  twitter: {
    card: "summary",
    title: "HamshiraGo — Медсестра на дом",
    description: "Медсестра на дом в Ташкенте — быстро и надёжно",
  },
  appleWebApp: {
    capable: true,
    title: "HamshiraGo",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#0d9488",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link rel="apple-touch-icon" href="/icon" />
        {/* Telegram Mini App SDK — должен грузиться первым */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="https://telegram.org/js/telegram-web-app.js" />
      </head>
      <body>
        <OfflineBanner />
        <InstallPrompt />
        <SplashScreen />
        <WebPushInit />
        <TelegramProvider>
          {children}
        </TelegramProvider>
      </body>
    </html>
  );
}
