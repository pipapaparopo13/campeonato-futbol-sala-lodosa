import Link from "next/link";
import { getDB } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { isPlayed, sortMatches, teamMap } from "@/lib/stats";
import { Card, Empty, Flash, MatchRow, PageTitle } from "@/components/ui";
import { MesaScanner } from "@/components/mesa-scanner";

export default async function AdminHome({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string; tab?: string }>;
}) {
  const [db, session, sp] = await Promise.all([getDB(), getSession(), searchParams]);
  const teams = teamMap(db);
  const showMesa = session?.role === "arbitro" || sp.tab === "mesa";

  // Si es Javi Mesa o si el Admin pulsa en "Escáner de Mesa"
  if (showMesa) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <PageTitle subtitle="Mesa de control de Lodosa. Selecciona el partido de la jornada y sube la foto del acta con IA o anota goles y tarjetas.">
          {session?.role === "arbitro" ? "Mesa Oficial · Javi Mesa" : "Escáner de Mesa Oficial"}
        </PageTitle>
        <Flash searchParams={sp} />
        <MesaScanner
          matches={db.matches}
          teams={Object.fromEntries(teams)}
          players={db.players}
        />
      </div>
    );
  }

  const pending = sortMatches(db.matches).filter((m) => !isPlayed(m)).slice(0, 8);
  const played = db.matches.filter(isPlayed).length;

  return (
    <>
      <PageTitle subtitle="Desde aquí gestionas todo lo que ve el público.">Panel del editor</PageTitle>
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        {[
          ["Equipos", db.teams.length, "/admin/equipos"],
          ["Jugadores", db.players.length, "/admin/equipos"],
          ["Partidos", db.matches.length, "/admin/partidos"],
          ["Jugados", played, "/admin/partidos"],
        ].map(([k, v, href]) => (
          <Link key={k} href={String(href)} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 hover:ring-emerald-300">
            <div className="text-3xl font-black">{v}</div>
            <div className="text-sm text-slate-500">{k}</div>
          </Link>
        ))}
      </div>
      <div className="mb-6 rounded-2xl bg-gradient-to-r from-emerald-800 to-teal-800 p-5 text-white shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 text-2xl">
            📷
          </span>
          <div>
            <h3 className="font-extrabold text-base">Escáner de Mesa Oficial</h3>
            <p className="text-xs text-emerald-100/80">
              Usa la misma herramienta que la mesa: elige jornada y partido, sube foto del acta con IA o anota goles y tarjetas al vuelo.
            </p>
          </div>
        </div>
        <Link
          href="/admin?tab=mesa"
          className="shrink-0 rounded-xl bg-white px-4 py-2 text-xs font-bold text-emerald-950 shadow transition hover:bg-emerald-50 active:scale-95"
        >
          Abrir Mesa Oficial →
        </Link>
      </div>
      <Card title="Próximos partidos (pulsa para rellenar el acta)">
        {pending.length ? (
          <div className="-mx-3 divide-y divide-slate-100">
            {pending.map((m) => (
              <MatchRow key={m.id} match={m} teams={teams} href={`/admin/partidos/${m.id}`} />
            ))}
          </div>
        ) : (
          <Empty>No hay partidos pendientes.</Empty>
        )}
      </Card>
    </>
  );
}
