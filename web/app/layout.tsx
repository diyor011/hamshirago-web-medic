import type { Metadata, Viewport } from "next";
import "./globals.css";
import TelegramProvider from "@/components/TelegramProvider";
import WebPushInit from "@/components/WebPushInit";
import SplashScreen from "@/components/SplashScreen";

export const metadata: Metadata = {
  title: "HamshiraGo — Медсестра на дом",
  description: "Вызовите медсестру на дом за 15–30 минут. Уколы, капельницы, измерение давления.",
  openGraph: {
    title: "HamshiraGo",
    description: "Медсестра на дом — быстро и надёжно",
    type: "website",
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
        <SplashScreen />
        <WebPushInit />
        <TelegramProvider>
          {children}
        </TelegramProvider>
      </body>
    </html>
  );
}
