import type { Metadata, Viewport } from "next";
import "./globals.css";
import WebPushInit from "@/components/WebPushInit";
import PushPermissionPrompt from "@/components/PushPermissionPrompt";
import SplashScreen from "@/components/SplashScreen";
import OfflineBanner from "@/components/OfflineBanner";
import InstallPrompt from "@/components/InstallPrompt";
import { LanguageProvider } from "@/context/LanguageContext";

const API_HOST = (process.env.NEXT_PUBLIC_API_URL ?? "https://hamshirago-production-0a65.up.railway.app").replace(/\/$/, "");

export const metadata: Metadata = {
  title: "HamshiraGo — Медик",
  description: "Панель медика HamshiraGo",
  appleWebApp: {
    capable: true,
    title: "HG Медик",
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
        <link rel="icon" type="image/png" href="/logo.png" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <link rel="preconnect" href={API_HOST} />
        <link rel="dns-prefetch" href={API_HOST} />
        <link rel="preconnect" href="https://res.cloudinary.com" />
      </head>
      <body>
        <LanguageProvider>
          <OfflineBanner />
          <InstallPrompt />
          <SplashScreen />
          <WebPushInit />
          <PushPermissionPrompt />
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
