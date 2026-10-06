"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/clasificacion", label: "Clasificación" },
  { href: "/calendario", label: "Calendario" },
  { href: "/copa", label: "Copa" },
  { href: "/equipos", label: "Equipos" },
  { href: "/estadisticas", label: "Estadísticas" },
  { href: "/reglamento", label: "Reglamento" },
];

export function MainNav() {
  const pathname = usePathname();
  return (
    <nav className="-mx-1 flex gap-1 overflow-x-auto">
      {LINKS.map((l) => {
        const active =
          l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition ${active ? "bg-white/15 text-white" : "text-emerald-100/80 hover:bg-white/10 hover:text-white"}`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
