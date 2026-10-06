import Link from "next/link";
import { getDB } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { isPlayed, sortMatches, teamMap } from "@/lib/stats";
import { Card, Empty, Flash, MatchRow, PageTitle } from "@/components/ui";
import { MesaScanner } from "@/components/mesa-scanner";

export default async function AdminHome({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const [db, session, sp] = await Promise.all([getDB(), getSession(), searchParams]);
  const teams = teamMap(db);

  // Panel exclusivo y simplificado para Javi Mesa
  if (session?.role === "arbitro") {
    return (
      <div className="mx-auto max-w-2xl">
        <PageTitle subtitle="Mesa de control de Lodosa. Selecciona el partido de la jornada y sube la foto del acta.">
          Mesa Oficial · Javi Mesa
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
      {db.matches.length === 0 && (
        <div className="mb-6 rounded-2xl bg-emerald-50 p-5 text-sm text-emerald-900 ring-1 ring-emerald-200">
          <strong>Primeros pasos:</strong> 1) Pon los nombres reales en{" "}
          <Link className="underline" href="/admin/equipos">Equipos</Link> y añade los jugadores. 2) Genera el
          calendario en <Link className="underline" href="/admin/partidos">Partidos</Link>. 3) Tras cada
          partido, abre su acta y anota resultado, goles y tarjetas.
        </div>
      )}
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
