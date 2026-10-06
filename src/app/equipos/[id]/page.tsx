import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDB } from "@/lib/db";
import { computePlayerStats, computeSanctions, computeStandings, sortMatches, teamMap } from "@/lib/stats";
import { Card, CardIcon, Empty, MatchRow, TeamBadge } from "@/components/ui";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const db = await getDB();
  return { title: db.teams.find((t) => t.id === id)?.name ?? "Equipo" };
}

export default async function EquipoPage({ params }: Props) {
  const { id } = await params;
  const db = await getDB();
  const team = db.teams.find((t) => t.id === id);
  if (!team) notFound();

  const teams = teamMap(db);
  const standings = computeStandings(db);
  const pos = standings.findIndex((r) => r.team.id === id);
  const row = standings[pos];

  const sanctions = computeSanctions(db);
  const teamSanctions = [...sanctions.values()].filter((s) => s.player.teamId === id);

  const roster = computePlayerStats(db)
    .filter((s) => s.player.teamId === id)
    .sort(
      (a, b) =>
        (a.player.number ?? 999) - (b.player.number ?? 999) ||
        a.player.name.localeCompare(b.player.name),
    );
  const matches = sortMatches(db.matches).filter(
    (m) => m.homeTeamId === id || m.awayTeamId === id,
  );

  return (
    <div className="space-y-6">
      <section
        className="flex flex-wrap items-center gap-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
        style={{ borderTop: `6px solid ${team.color}` }}
      >
        <TeamBadge team={team} size="lg" />
        <div className="flex-1">
          <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">{team.name}</h1>
          {team.delegate && <p className="text-sm text-slate-500">Delegado: {team.delegate}</p>}
        </div>
        {row && (
          <div className="flex gap-6 text-center">
            {[
              ["Posición", `${pos + 1}º`],
              ["Puntos", row.points],
              ["PJ", row.played],
              ["GF", row.goalsFor],
              ["GC", row.goalsAgainst],
            ].map(([k, v]) => (
              <div key={k}>
                <div className="text-2xl font-black text-slate-900">{v}</div>
                <div className="text-[11px] tracking-wide text-slate-400 uppercase">{k}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Alerta de Sancionados: No pueden jugar */}
      {teamSanctions.length > 0 && (
        <section className="rounded-2xl border-2 border-red-300 bg-red-50 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-red-900">
            <span className="text-xl">⛔</span>
            <h2 className="text-base font-black uppercase tracking-tight">
              Jugadores que NO pueden jugar el próximo partido ({teamSanctions.length})
            </h2>
          </div>
          <p className="mt-1 text-xs text-red-700">
            Art. 30 del Reglamento: Si juega un jugador sancionado, se dará el partido por perdido (2 - 0).
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {teamSanctions.map((s) => (
              <div
                key={s.playerId}
                className="flex items-center justify-between rounded-xl bg-white p-3 shadow-xs ring-1 ring-red-200"
              >
                <div>
                  <span className="font-bold text-slate-900">
                    {s.player.number != null ? `${s.player.number}. ` : ""}
                    {s.player.name}
                  </span>
                  <div className="text-xs font-semibold text-red-700">{s.reason}</div>
                </div>
                <span className="rounded-md bg-red-100 px-2 py-1 text-xs font-bold text-red-800">
                  Sancionado
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card title="Plantilla">
          {roster.length ? (
            <div className="-mx-5 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-400 uppercase">
                    <th className="w-12 py-2 pl-5 text-left">Dorsal</th>
                    <th className="py-2 text-left">Jugador</th>
                    <th className="py-2 text-center" title="Estado">Estado</th>
                    <th className="py-2 text-center" title="Goles">⚽</th>
                    <th className="py-2 text-center" title="Amarillas"><CardIcon type="yellow" /></th>
                    <th className="py-2 pr-5 text-center" title="Rojas"><CardIcon type="red" /></th>
                  </tr>
                </thead>
                <tbody>
                  {roster.map((s) => {
                    const isBanned = sanctions.has(s.player.id);
                    return (
                      <tr key={s.player.id} className="border-t border-slate-100">
                        <td className="py-2 pl-5 font-mono font-bold text-slate-400">{s.player.number ?? "–"}</td>
                        <td className="py-2">
                          <Link href={`/jugadores/${s.player.id}`} className="font-medium hover:underline">
                            {s.player.name}
                          </Link>
                        </td>
                        <td className="py-2 text-center">
                          {isBanned ? (
                            <span
                              className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-800"
                              title={sanctions.get(s.player.id)?.reason}
                            >
                              ⛔ Sancionado
                            </span>
                          ) : (
                            <span className="text-[11px] text-emerald-700 font-medium">Habilitado</span>
                          )}
                        </td>
                        <td className="py-2 text-center font-semibold">{s.goals || ""}</td>
                        <td className="py-2 text-center">{s.yellows || ""}</td>
                        <td className="py-2 pr-5 text-center">{s.reds || ""}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>Plantilla todavía no publicada.</Empty>
          )}
        </Card>
        <Card title="Partidos">
          {matches.length ? (
            <div className="-mx-3 divide-y divide-slate-100">
              {matches.map((m) => (
                <div key={m.id}>
                  <div className="px-3 pt-2 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                    {m.competition === "copa" ? `Copa · ${m.stage || "Jornada"} ${m.round}` : `Liga · Jornada ${m.round}`}
                  </div>
                  <MatchRow match={m} teams={teams} />
                </div>
              ))}
            </div>
          ) : (
            <Empty>Sin partidos.</Empty>
          )}
        </Card>
      </div>
    </div>
  );
}
