import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Doc Tracker",
    short_name: "Doc Tracker",
    description: "Sketch-styled document expiry tracking application",
    start_url: "/",
    display: "standalone",
    background_color: "#e9e4db",
    theme_color: "#e9e4db",
    icons: [
      {
        src: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
