import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

// build: 2026-04-10b
const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {},
  compress: true,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
  experimental: {
    optimizePackageImports: ["framer-motion", "lucide-react"],
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  disableLogger: true,
  sourcemaps: { disable: true },
});
