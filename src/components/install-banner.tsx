"use client";

import { useEffect, useState } from "react";

export function InstallAppBanner() {
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Si ya está en modo app standalone, no mostrar nada
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) return;

    // Si ya lo cerró recientemente, no molestar durante 7 días
    const dismissedAt = localStorage.getItem("pwa-dismissed");
    if (dismissedAt && Date.now() - Number(dismissedAt) < 7 * 24 * 60 * 60 * 1000) {
      return;
    }

    // Detectar iOS Safari
    const ua = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isAppleDevice);

    if (isAppleDevice) {
      // Mostrar tras 2 segundos de navegación
      const timer = setTimeout(() => setShow(true), 2000);
      return () => clearTimeout(timer);
    }

    // Android / Chrome: escuchar evento beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  function handleDismiss() {
    setShow(false);
    localStorage.setItem("pwa-dismissed", Date.now().toString());
  }

  async function handleInstallClick() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setShow(false);
      }
      setDeferredPrompt(null);
    }
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="rounded-2xl border border-emerald-400/40 bg-slate-900/95 p-4 text-white shadow-2xl backdrop-blur-md">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-2xl shadow-inner">
            ⚽
          </div>

          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-extrabold tracking-tight text-white">
                Instalar FS Lodosa
              </h4>
              <button
                onClick={handleDismiss}
                className="text-slate-400 hover:text-white text-lg leading-none p-1"
                aria-label="Cerrar aviso"
              >
                ✕
              </button>
            </div>

            <p className="mt-1 text-xs text-slate-300 leading-snug">
              {isIOS ? (
                <>
                  Añade la app a tu pantalla de inicio para entrar más rápido: pulsa{" "}
                  <span className="inline-block rounded bg-white/20 px-1 font-bold text-white">
                    Compartir ⎋
                  </span>{" "}
                  y luego{" "}
                  <span className="font-bold text-emerald-300">
                    &quot;Añadir a pantalla de inicio ⊞&quot;
                  </span>
                  .
                </>
              ) : (
                "Instala la aplicación en tu móvil para consultar partidos, actas y goles en un toque."
              )}
            </p>

            <div className="mt-3 flex items-center gap-2">
              {!isIOS && deferredPrompt && (
                <button
                  onClick={handleInstallClick}
                  className="rounded-xl bg-emerald-500 px-3.5 py-1.5 text-xs font-bold text-slate-950 transition hover:bg-emerald-400 active:scale-95"
                >
                  📲 Instalar ahora
                </button>
              )}
              <button
                onClick={handleDismiss}
                className="rounded-xl bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/20"
              >
                Ahora no
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
