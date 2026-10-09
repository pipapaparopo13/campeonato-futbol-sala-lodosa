import type { Metadata } from "next";
import Link from "next/link";
import { getDB } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { drawCup } from "@/app/actions";
import { computeStandings, formatDate, sortMatches, teamMap } from "@/lib/stats";
import { Card, Empty, MatchRow, PageTitle, StandingsTable } from "@/components/ui";
import { CUP_ROUNDS } from "@/lib/calendar-plan";

export const metadata: Metadata = {
  title: "Torneo de Copa · Grupos y Clasificación",
  description: "Fase de grupos y eliminatorias del Torneo de Copa de Fútbol Sala en Lodosa.",
};

export default async function CopaPage() {
  const [db, admin] = await Promise.all([getDB(), isAdmin()]);
  const teams = teamMap(db);

  const copaMatches = sortMatches(
    db.matches.filter((m) => m.competition === "copa"),
  );
  const hasCopaMatches = copaMatches.length > 0;

  const groupARows = hasCopaMatches
    ? computeStandings(db, { competition: "copa", stage: "Grupo A" })
    : [];
  const groupBRows = hasCopaMatches
    ? computeStandings(db, { competition: "copa", stage: "Grupo B" })
    : [];

  const copaByRound = new Map<number, typeof db.matches>();
  for (const m of copaMatches) {
    copaByRound.set(m.round, [...(copaByRound.get(m.round) ?? []), m]);
  }

  return (
    <div className="space-y-8">
      <div>
        <PageTitle subtitle="2 grupos de 5 equipos · Los dos mejores de cada grupo disputan las semifinales y la gran final.">
          Torneo de Copa de Lodosa
        </PageTitle>

        {!hasCopaMatches && (
          <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="inline-block rounded-full bg-amber-200 px-3 py-1 text-xs font-bold text-amber-900 uppercase">
                  Sorteo pendiente
                </span>
                <h2 className="mt-2 text-lg font-extrabold text-amber-950">
                  Los 2 grupos de 5 equipos se sortearán próximamente
                </h2>
                <p className="mt-1 text-xs text-amber-800">
                  El torneo se disputa en las fechas reservadas intercaladas cada 3 jornadas de Liga.
                </p>
              </div>
              {admin && (
                <form action={drawCup}>
                  <button className="btn bg-amber-600 hover:bg-amber-700">
                    🎲 Realizar Sorteo Ahora (2 grupos de 5)
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Clasificación de los 2 Grupos */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <h2 className="text-xl font-bold text-slate-900">
            Clasificación de Grupos
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            Clasifican 1º y 2º a Semifinales
          </span>
        </div>

        {hasCopaMatches ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card
              title={
                <span className="flex items-center gap-2 font-black text-emerald-800">
                  🏆 Grupo A
                </span>
              }
            >
              <StandingsTable rows={groupARows} />
            </Card>
            <Card
              title={
                <span className="flex items-center gap-2 font-black text-emerald-800">
                  🏆 Grupo B
                </span>
              }
            >
              <StandingsTable rows={groupBRows} />
            </Card>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Grupo A (5 equipos)">
              <div className="space-y-2 py-4 text-center text-sm text-slate-400">
                <p>Equipos pendientes del sorteo oficial.</p>
                <div className="mx-auto flex max-w-xs flex-col gap-1.5 opacity-60">
                  <div className="rounded-lg bg-slate-100 p-2 text-xs">Equipo A1</div>
                  <div className="rounded-lg bg-slate-100 p-2 text-xs">Equipo A2</div>
                  <div className="rounded-lg bg-slate-100 p-2 text-xs">Equipo A3</div>
                  <div className="rounded-lg bg-slate-100 p-2 text-xs">Equipo A4</div>
                  <div className="rounded-lg bg-slate-100 p-2 text-xs">Equipo A5</div>
                </div>
              </div>
            </Card>
            <Card title="Grupo B (5 equipos)">
              <div className="space-y-2 py-4 text-center text-sm text-slate-400">
                <p>Equipos pendientes del sorteo oficial.</p>
                <div className="mx-auto flex max-w-xs flex-col gap-1.5 opacity-60">
                  <div className="rounded-lg bg-slate-100 p-2 text-xs">Equipo B1</div>
                  <div className="rounded-lg bg-slate-100 p-2 text-xs">Equipo B2</div>
                  <div className="rounded-lg bg-slate-100 p-2 text-xs">Equipo B3</div>
                  <div className="rounded-lg bg-slate-100 p-2 text-xs">Equipo B4</div>
                  <div className="rounded-lg bg-slate-100 p-2 text-xs">Equipo B5</div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </section>

      {/* Partidos de la Fase de Grupos */}
      <section className="space-y-4">
        <h2 className="border-b border-slate-200 pb-2 text-xl font-bold text-slate-900">
          Calendario de Jornadas de Copa
        </h2>

        {hasCopaMatches ? (
          <div className="grid gap-6 md:grid-cols-2">
            {[...copaByRound.entries()].map(([round, matches]) => (
              <Card
                key={round}
                title={
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-bold text-slate-900">Copa · Jornada {round}</span>
                    <span className="text-xs font-semibold text-emerald-700">
                      {formatDate(matches[0]?.date, { long: true })}
                    </span>
                  </div>
                }
              >
                <div className="-mx-3 divide-y divide-slate-100">
                  {matches.map((m) => (
                    <div key={m.id}>
                      {m.stage && (
                        <div className="px-3 pt-1 text-[10px] font-bold tracking-wider text-amber-700 uppercase">
                          {m.stage}
                        </div>
                      )}
                      <MatchRow match={m} teams={teams} />
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CUP_ROUNDS.slice(0, 5).map((c) => (
              <div
                key={c.round}
                className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 shadow-sm"
              >
                <div className="text-xs font-bold text-emerald-700">
                  {formatDate(c.date, { long: true })}
                </div>
                <div className="mt-1 font-bold text-slate-800">{c.title}</div>
                <div className="mt-1 text-xs text-slate-500">{c.desc}</div>
                <div className="mt-3 text-[11px] font-medium text-amber-800 bg-amber-50 px-2 py-1 rounded">
                  4 partidos (2 de Grupo A y 2 de Grupo B)
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Fase Final (Cuadro de Honor) */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 pb-2">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Fase Final · Eliminatorias
            </h2>
            <p className="text-xs text-slate-500">
              Cruces oficiales: 1º Grupo A vs 2º Grupo B, y 1º Grupo B vs 2º Grupo A. Los ganadores disputan la Gran Final.
            </p>
          </div>
          <span className="text-xs font-semibold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full">
            15 y 22 de mayo de 2027
          </span>
        </div>

        {(() => {
          const firstA = groupARows[0]?.team;
          const secondA = groupARows[1]?.team;
          const firstB = groupBRows[0]?.team;
          const secondB = groupBRows[1]?.team;

          // Comprobar si la fase de grupos de copa ya terminó (todos los partidos de copa de j1 a j5 jugados)
          const groupMatches = copaMatches.filter((m) => m.round <= 5);
          const groupFinished = groupMatches.length === 20 && groupMatches.every((m) => m.status === "played");

          return (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-900">
                    Sábado 15 de mayo de 2027
                  </span>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Eliminatorias
                  </span>
                </div>
                <h3 className="mt-3 text-lg font-extrabold text-slate-900">
                  Semifinales de Copa
                </h3>
                <div className="mt-3 space-y-2.5 text-sm">
                  {/* Semifinal 1 */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1.5">
                      <span>SEMIFINAL 1</span>
                      <span className="font-mono text-slate-600">17:00 h</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 font-bold text-slate-800">
                      <span className="truncate">
                        {groupFinished && firstA ? firstA.name : "1º Clasificado Grupo A"}
                      </span>
                      <span className="text-xs text-slate-400 font-normal">vs</span>
                      <span className="truncate text-right">
                        {groupFinished && secondB ? secondB.name : "2º Clasificado Grupo B"}
                      </span>
                    </div>
                  </div>

                  {/* Semifinal 2 */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1.5">
                      <span>SEMIFINAL 2</span>
                      <span className="font-mono text-slate-600">18:30 h</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 font-bold text-slate-800">
                      <span className="truncate">
                        {groupFinished && firstB ? firstB.name : "1º Clasificado Grupo B"}
                      </span>
                      <span className="text-xs text-slate-400 font-normal">vs</span>
                      <span className="truncate text-right">
                        {groupFinished && secondA ? secondA.name : "2º Clasificado Grupo A"}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  En caso de empate al final del tiempo reglamentario: tanda de penaltis directa según el Artículo 23 del Reglamento.
                </p>
              </div>

              <div className="rounded-2xl border-2 border-emerald-500 bg-gradient-to-br from-white via-emerald-50/40 to-teal-50/60 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="rounded-md bg-emerald-700 px-2.5 py-1 text-xs font-bold text-white">
                    Sábado 22 de mayo de 2027
                  </span>
                  <span className="text-xs font-black text-emerald-800 uppercase tracking-wider">
                    Partido Único
                  </span>
                </div>
                <h3 className="mt-3 text-lg font-black text-slate-900">
                  🏆 Gran Final de Copa de Lodosa
                </h3>
                <div className="mt-4 flex items-center justify-between rounded-xl bg-white p-4 shadow-xs ring-1 ring-emerald-200 text-sm">
                  <span className="font-extrabold text-slate-800">Ganador Semifinal 1</span>
                  <span className="font-mono text-xs font-black text-emerald-700 uppercase bg-emerald-100 px-2 py-0.5 rounded">
                    VS
                  </span>
                  <span className="font-extrabold text-slate-800 text-right">Ganador Semifinal 2</span>
                </div>
                <div className="mt-4 rounded-lg bg-emerald-100/60 p-3 text-xs text-emerald-950 font-medium border border-emerald-200">
                  🥇 El equipo vencedor se proclamará <strong>Campeón de la Copa de Lodosa 2026/27</strong> con entrega de trofeos en la pista.
                </div>
              </div>
            </div>
          );
        })()}
      </section>
    </div>
  );
}
