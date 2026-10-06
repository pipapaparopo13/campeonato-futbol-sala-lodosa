import type { Metadata } from "next";
import Link from "next/link";
import { getDB } from "@/lib/db";
import { computePlayerStats, computeSanctions, eventsOfType, formatDate, teamMap } from "@/lib/stats";
import { Card, CardIcon, Empty, PageTitle, TeamBadge } from "@/components/ui";

export const metadata: Metadata = { title: "Estadísticas y Sanciones" };

export default async function EstadisticasPage() {
  const db = await getDB();
  const teams = teamMap(db);
  const stats = computePlayerStats(db);
  const sanctions = computeSanctions(db);
  const bannedPlayers = [...sanctions.values()];

  const scorers = stats
    .filter((s) => s.goals > 0)
    .sort((a, b) => b.goals - a.goals || a.player.name.localeCompare(b.player.name));
  const carded = stats
    .filter((s) => s.yellows + s.reds > 0)
    .sort((a, b) => b.reds - a.reds || b.yellows - a.yellows);
  const cards = eventsOfType(db, ["yellow", "red"]).reverse();

  return (
    <>
      <PageTitle subtitle="Goleadores, tarjetas y resoluciones del Comité de Competición.">
        Estadísticas y Comité Disciplinario
      </PageTitle>

      {/* Sección del Comité de Competición / Sanciones */}
      <section className="mb-8 space-y-4">
        <div className="rounded-2xl border-2 border-red-200 bg-red-50/60 p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-red-200 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">⚖️</span>
              <h2 className="text-lg font-black text-red-950 uppercase tracking-tight">
                Jugadores Sancionados para la Próxima Jornada
              </h2>
            </div>
            <Link
              href="/reglamento"
              className="text-xs font-bold text-red-700 underline hover:text-red-900"
            >
              Ver Código de Sanciones →
            </Link>
          </div>

          {bannedPlayers.length > 0 ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {bannedPlayers.map((s) => (
                <div
                  key={s.playerId}
                  className="rounded-xl border border-red-200 bg-white p-3.5 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded bg-red-100 px-2 py-0.5 text-[10px] font-black text-red-800 uppercase">
                      No puede jugar
                    </span>
                    <span className="text-xs text-slate-400">1 partido de sanción</span>
                  </div>
                  <div className="mt-2 font-bold text-slate-900">
                    <Link href={`/jugadores/${s.player.id}`} className="hover:underline">
                      {s.player.number != null ? `${s.player.number}. ` : ""}
                      {s.player.name}
                    </Link>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                    <TeamBadge team={s.team} size="sm" />
                    <span>{s.team?.name}</span>
                  </div>
                  <div className="mt-2 rounded bg-slate-50 p-1.5 text-[11px] font-medium text-red-700">
                    {s.reason}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-xs text-slate-600">
              ✅ En este momento no hay jugadores sancionados. Todos los jugadores inscritos están habilitados para disputar la próxima jornada según el Código de Sanciones.
            </p>
          )}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Tabla de goleadores (Pichichi)">
          {scorers.length ? (
            <table className="w-full text-sm">
              <tbody>
                {scorers.map((s, i) => (
                  <tr key={s.player.id} className="border-t border-slate-100 first:border-0">
                    <td className="w-8 py-2 font-bold text-slate-400">{i + 1}</td>
                    <td className="py-2">
                      <Link href={`/jugadores/${s.player.id}`} className="flex items-center gap-2 font-medium hover:underline">
                        <TeamBadge team={s.team} size="sm" />
                        {s.player.name}
                        <span className="text-xs font-normal text-slate-400">{s.team?.name}</span>
                      </Link>
                    </td>
                    <td className="py-2 text-right font-mono text-base font-bold text-emerald-700">{s.goals}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Empty>Sin goles registrados todavía.</Empty>
          )}
        </Card>

        <Card title="Tarjetas acumuladas por jugador">
          {carded.length ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-400">
                  <th className="py-1 text-left font-normal">Jugador</th>
                  <th className="py-1 text-center" title="Ciclo">Ciclo</th>
                  <th className="py-1 text-center"><CardIcon type="yellow" /></th>
                  <th className="py-1 text-center"><CardIcon type="red" /></th>
                </tr>
              </thead>
              <tbody>
                {carded.map((s) => {
                  const yellowToNextBan = 3 - (s.yellows % 3);
                  return (
                    <tr key={s.player.id} className="border-t border-slate-100">
                      <td className="py-2">
                        <Link href={`/jugadores/${s.player.id}`} className="flex items-center gap-2 font-medium hover:underline">
                          <TeamBadge team={s.team} size="sm" />
                          <div>
                            <span className="block font-semibold">{s.player.name}</span>
                            <span className="block text-[11px] text-slate-400">{s.team?.name}</span>
                          </div>
                        </Link>
                      </td>
                      <td className="py-2 text-center text-xs text-slate-500">
                        {s.yellows >= 3 ? (
                          <span className="font-bold text-red-700">Ciclo cumplido</span>
                        ) : (
                          <span>A {yellowToNextBan} de sanción</span>
                        )}
                      </td>
                      <td className="py-2 text-center font-semibold">{s.yellows}</td>
                      <td className="py-2 text-center font-semibold">{s.reds}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <Empty>Sin tarjetas registradas.</Empty>
          )}
        </Card>

        <Card title="Historial de tarjetas (en qué partido ocurrieron)" className="lg:col-span-2">
          {cards.length ? (
            <ul className="divide-y divide-slate-100">
              {cards.map(({ match, event, player }) => {
                const home = teams.get(match.homeTeamId);
                const away = teams.get(match.awayTeamId);
                const team = teams.get(player?.teamId ?? "");
                return (
                  <li key={event.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                    <CardIcon type={event.type as "yellow" | "red"} />
                    <Link href={`/jugadores/${event.playerId}`} className="min-w-[160px] font-semibold hover:underline">
                      {player?.name ?? "?"}
                      <span className="ml-1 font-normal text-slate-400">({team?.name ?? "?"})</span>
                    </Link>
                    <Link href={`/partidos/${match.id}`} className="ml-auto text-slate-600 hover:underline">
                      {match.competition === "copa" ? `Copa · ${match.stage || "J"}` : `Liga · J${match.round}`} · {home?.name} – {away?.name}
                      {event.minute !== null && <span className="text-slate-400"> · min {event.minute}</span>}
                      <span className="text-slate-400"> · {formatDate(match.date)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Empty>Sin tarjetas registradas.</Empty>
          )}
        </Card>
      </div>
    </>
  );
}
