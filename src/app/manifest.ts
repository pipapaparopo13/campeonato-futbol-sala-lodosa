import type { MetadataRoute } from "next";
import { getDB } from "@/lib/db";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { settings } = await getDB();

  return {
    name: `${settings.name} ${settings.season}`,
    short_name: "FS Lodosa",
    description: `Resultados, clasificación, actas y estadísticas del ${settings.name}.`,
    start_url: "/",
    display: "standalone",
    background_color: "#047857",
    theme_color: "#047857",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
