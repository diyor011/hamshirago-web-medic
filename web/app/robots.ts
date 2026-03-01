import { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://hamshirago.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/auth"],
        disallow: ["/", "/orders/", "/order/", "/service/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
