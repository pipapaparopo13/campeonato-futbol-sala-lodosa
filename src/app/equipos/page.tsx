import type { Metadata } from "next";
import Link from "next/link";
import { getDB } from "@/lib/db";
import { computeSanctions, computeStandings } from "@/lib/stats";
import { PageTitle, TeamBadge } from "@/components/ui";
import { TeamRosterPosterModal } from "@/components/team-roster-poster-modal";

export const metadata: Metadata = { title: "Equipos" };

export default async function EquiposPage() {
  const db = await getDB();
  const standings = computeStandings(db);
  const pos = new Map(standings.map((r, i) => [r.team.id, { i: i + 1, pts: r.points }]));
  const sanctions = computeSanctions(db);
  const teams = [...db.teams].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <PageTitle subtitle={`${db.teams.length} equipos participantes en el Campeonato de Lodosa`}>
        Equipos y Plantillas
      </PageTitle>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {teams.map((t) => {
          const count = db.players.filter((p) => p.teamId === t.id).length;
          const p = pos.get(t.id);
          const bannedCount = [...sanctions.values()].filter(
            (s) => s.player.teamId === t.id,
          ).length;

          return (
            <Link
              key={t.id}
              href={`/equipos/${t.id}`}
              className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              style={{ borderLeft: `6px solid ${t.color}` }}
            >
              <TeamBadge team={t} size="lg" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-lg font-bold text-slate-900 group-hover:underline">
                  {t.name}
                </div>
                <div className="text-sm text-slate-500">
                  {count} jugador{count === 1 ? "" : "es"}
                  {p && ` · ${p.i}º · ${p.pts} pts`}
                </div>
                {bannedCount > 0 && (
                  <div className="mt-1 inline-flex items-center gap-1 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-800">
                    <span>⛔</span>
                    <span>{bannedCount} jugador{bannedCount > 1 ? "es" : ""} no puede jugar</span>
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Sección debajo de la lista para exportar la plantilla de cualquier equipo en imagen */}
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-2xl">
              📸
            </span>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Exportar plantilla de equipo en imagen
              </h3>
              <p className="text-xs text-slate-500">
                Genera el cartel oficial con el escudo, los jugadores y sus dorsales listo para guardar o compartir en WhatsApp.
              </p>
            </div>
          </div>
          <TeamRosterPosterModal
            teams={teams}
            allPlayers={db.players}
            buttonLabel="Exportar equipo en imagen"
            variant="primary"
          />
        </div>
      </div>
    </>
  );
}
