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
        { href: "/admin/partidos", label: "Partidos y actas" },
        { href: "/admin/equipos", label: "Equipos y jugadores" },
        { href: "/admin/ajustes", label: "Ajustes" },
      ]
    : [];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-2 rounded-2xl bg-amber-50 p-2 ring-1 ring-amber-200">
        <span className="rounded-md bg-amber-200/80 px-2.5 py-1 text-xs font-bold tracking-wide text-amber-900 uppercase">
          {isAdmin ? "Organizador (Admin)" : "Mesa: Javi Mesa"}
        </span>
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-lg px-3 py-1.5 text-sm font-semibold text-amber-900 hover:bg-amber-100"
          >
            {l.label}
          </Link>
        ))}
        <form action={logout} className="ml-auto">
          <button className="rounded-lg px-3 py-1.5 text-sm font-semibold text-amber-900 hover:bg-amber-100">
            Cerrar sesión
          </button>
        </form>
      </div>
      {children}
    </div>
  );
}
