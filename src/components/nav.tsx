"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Inicio", icon: "🏠" },
  { href: "/clasificacion", label: "Clasificación", icon: "📊" },
  { href: "/calendario", label: "Calendario", icon: "📅" },
  { href: "/copa", label: "Copa", icon: "🏆" },
  { href: "/equipos", label: "Equipos", icon: "👥" },
  { href: "/estadisticas", label: "Estadísticas", icon: "⚽" },
  { href: "/reglamento", label: "Reglamento", icon: "📜" },
];

interface Props {
  admin?: boolean;
}

export function MainNav({ admin }: Props) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // Cerrar menú al cambiar de ruta
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Evitar scroll en el fondo cuando el menú está abierto en móvil
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      {/* Botón hamburguesa (solo visible en pantallas móviles/medianas) */}
      <div className="flex items-center gap-2 md:hidden">
        {admin && (
          <Link
            href="/admin"
            className="rounded-lg bg-amber-400 px-2.5 py-1.5 text-xs font-bold text-amber-950 shadow hover:bg-amber-300"
          >
            Panel
          </Link>
        )}
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? "Cerrar menú de navegación" : "Abrir menú de navegación"}
          aria-expanded={isOpen}
          className="relative z-50 flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-white transition active:scale-95 hover:bg-white/20"
        >
          {isOpen ? (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Navegación para escritorio (visible a partir de md) */}
      <nav className="hidden md:flex md:items-center md:gap-1 md:overflow-x-auto">
        {LINKS.map((l) => {
          const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition ${
                active
                  ? "bg-white/20 text-white shadow-xs font-bold"
                  : "text-emerald-100/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>

      {/* Menú desplegable Móvil (Full-screen Drawer animado) */}
      {isOpen && (
        <div className="fixed inset-0 z-40 flex flex-col md:hidden">
          {/* Fondo oscuro con desenfoque */}
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel deslizante desde arriba */}
          <div className="relative z-50 flex flex-col bg-gradient-to-b from-emerald-900 via-emerald-800 to-teal-900 px-5 pt-20 pb-8 text-white shadow-2xl animate-in slide-in-from-top-6 duration-300 rounded-b-3xl border-b border-emerald-500/30">
            <div className="mb-2 px-2 text-xs font-bold uppercase tracking-wider text-emerald-300/80">
              Menú Principal
            </div>
            <nav className="flex flex-col space-y-1.5">
              {LINKS.map((l) => {
                const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3.5 rounded-xl px-4 py-3 text-base font-bold transition active:scale-98 ${
                      active
                        ? "bg-white text-emerald-900 shadow-md"
                        : "text-emerald-50 hover:bg-white/10"
                    }`}
                  >
                    <span className="text-xl">{l.icon}</span>
                    <span>{l.label}</span>
                    {active && <span className="ml-auto text-xs font-black text-emerald-700">● Activo</span>}
                  </Link>
                );
              })}
            </nav>

            {admin && (
              <div className="mt-5 border-t border-white/15 pt-4">
                <Link
                  href="/admin"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-center gap-2 rounded-xl bg-amber-400 py-3 text-center text-sm font-extrabold text-amber-950 shadow-md active:scale-95"
                >
                  <span>⚙️</span>
                  <span>Acceder al Panel de Gestión</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
