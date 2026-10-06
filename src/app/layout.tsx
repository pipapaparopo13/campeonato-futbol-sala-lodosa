import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getDB } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { MainNav } from "@/components/nav";
import { InstallAppBanner } from "@/components/install-banner";

export const viewport: Viewport = {
  themeColor: "#047857",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const { settings } = await getDB();
  return {
    title: { default: settings.name, template: `%s · ${settings.name}` },
    description: `Resultados, clasificación, jugadores, tarjetas y actas del ${settings.name} ${settings.season}.`,
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: "FS Lodosa",
    },
    icons: {
      icon: [
        { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [{ settings }, admin] = await Promise.all([getDB(), isAdmin()]);
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-slate-50 text-slate-800">
        <header className="sticky top-0 z-30 bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-700 text-white shadow-md">
          <div className="mx-auto max-w-6xl px-4 py-3 sm:py-4">
            <div className="flex items-center justify-between gap-3">
              <Link href="/" className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <img
                  src="/logo.png"
                  alt="Escudo FS Lodosa"
                  className="h-10 w-10 sm:h-11 sm:w-11 shrink-0 rounded-lg object-contain bg-white/10 p-0.5 shadow-sm"
                />
                <span className="min-w-0 truncate">
                  <span className="block text-base leading-tight font-extrabold sm:text-lg md:text-xl truncate">
                    {settings.name}
                  </span>
                  <span className="block text-[11px] sm:text-xs text-emerald-100/80 truncate">
                    {settings.location} · {settings.season}
                  </span>
                </span>
              </Link>
              <div className="flex items-center gap-2 shrink-0">
                {admin && (
                  <Link
                    href="/admin"
                    className="hidden md:inline-flex rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-bold text-amber-950 shadow hover:bg-amber-300"
                  >
                    Panel del editor
                  </Link>
                )}
                <MainNav admin={admin} />
              </div>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
          {children}
        </main>
        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-5 text-xs text-slate-400">
            <span>
              {settings.name} · {settings.location}
            </span>
            <Link href={admin ? "/admin" : "/admin/login"} className="hover:text-slate-600">
              {admin ? "Panel del editor" : "Acceso editor"}
            </Link>
          </div>
        </footer>
        <InstallAppBanner />
      </body>
    </html>
  );
}
