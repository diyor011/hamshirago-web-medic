import type { Metadata } from "next";
import "./globals.css";
import WebPushInit from "@/components/WebPushInit";
import SplashScreen from "@/components/SplashScreen";

export const metadata: Metadata = {
  title: "HamshiraGo — Медик",
  description: "Панель медика HamshiraGo",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body>
        <SplashScreen />
        <WebPushInit />
        {children}
      </body>
    </html>
  );
}
