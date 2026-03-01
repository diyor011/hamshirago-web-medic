import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HamshiraGo Медик",
    short_name: "HG Медик",
    description: "Панель медика HamshiraGo",
    start_url: "/",
    display: "standalone",
    background_color: "#0d9488",
    theme_color: "#0d9488",
    orientation: "portrait",
    icons: [
      { src: "/icon", sizes: "192x192", type: "image/png" },
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
