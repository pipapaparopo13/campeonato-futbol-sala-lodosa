import type { Metadata } from "next";
import Link from "next/link";
import { logout } from "@/app/actions";
import { requireEditorOrReferee } from "@/lib/auth";

export const metadata: Metadata = {
  title: { default: "Panel de Gestión", template: "%s · Panel de Gestión" },
  robots: { index: false },
};

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const session = await requireEditorOrReferee();
  const isAdmin = session.role === "admin";

  const links = isAdmin
    ? [
        { href: "/admin", label: "Resumen" },
        { href: "/admin?tab=mesa", label: "📷 Escáner de Mesa" },
        { href: "/admin/partidos", label: "Partidos y actas" },
        { href: "/admin/equipos", label: "Equipos y jugadores" },
        { href: "/admin/ajustes", label: "Ajustes" },
      ]
    : [
        { href: "/admin", label: "📷 Mesa Oficial" },
      ];

  return (
    <div>
      <div className="mb-6 flex items-center gap-2 overflow-x-auto rounded-2xl bg-amber-50 p-2 ring-1 ring-amber-200">
        <span className="shrink-0 rounded-md bg-amber-200/80 px-2.5 py-1 text-xs font-bold tracking-wide text-amber-900 uppercase">
          {isAdmin ? "Admin" : "Mesa: Javi"}
        </span>
        <div className="flex items-center gap-1 overflow-x-auto">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs sm:text-sm font-semibold text-amber-900 hover:bg-amber-100"
            >
              {l.label}
            </Link>
          ))}
        </div>
        <form action={logout} className="ml-auto shrink-0">
          <button className="whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs sm:text-sm font-semibold text-amber-900 hover:bg-amber-100">
            Cerrar sesión
          </button>
        </form>
      </div>
      {children}
    </div>
  );
}
