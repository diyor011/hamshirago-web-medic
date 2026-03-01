import type { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://hamshirago.vercel.app";

export const metadata: Metadata = {
  title: "Войти — HamshiraGo",
  description: "Войдите или зарегистрируйтесь в HamshiraGo — вызовите медсестру на дом за 15–30 минут.",
  alternates: {
    canonical: `${SITE_URL}/auth`,
  },
  openGraph: {
    title: "Войти — HamshiraGo",
    description: "Медсестра на дом в Ташкенте. Уколы, капельницы, измерение давления.",
    url: `${SITE_URL}/auth`,
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Войти — HamshiraGo",
    description: "Медсестра на дом в Ташкенте.",
  },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
