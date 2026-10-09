import type { Metadata } from "next";
import { getDB } from "@/lib/db";
import { formatDate, sortMatches, teamMap } from "@/lib/stats";
import { Card, Empty, MatchRow, PageTitle } from "@/components/ui";
import { CUP_ROUNDS, TOURNAMENT_BREAKS } from "@/lib/calendar-plan";
import { RoundPosterModal } from "@/components/round-poster-modal";
import { CalendarPdfButton } from "@/components/calendar-pdf-button";

export const metadata: Metadata = { title: "Calendario y resultados" };

export default async function CalendarioPage() {
  const db = await getDB();
  const teams = teamMap(db);
  const teamsObj = Object.fromEntries(teams);

  const ligaMatches = sortMatches(
    db.matches.filter((m) => (m.competition ?? "liga") === "liga"),
  );
  const copaMatches = sortMatches(
    db.matches.filter((m) => m.competition === "copa"),
  );

  const byRound = new Map<number, typeof db.matches>();
  for (const m of ligaMatches) {
    byRound.set(m.round, [...(byRound.get(m.round) ?? []), m]);
  }

  const copaByRound = new Map<number, typeof db.matches>();
  for (const m of copaMatches) {
    copaByRound.set(m.round, [...(copaByRound.get(m.round) ?? []), m]);
  }

  const hasCopaMatches = copaMatches.length > 0;

  // Estructura unificada y ordenada estrictamente por fecha
  type TimelineItem = {
    id: string;
    date: string;
    type: "liga" | "copa" | "copa-pending" | "descanso";
    round?: number;
    title: string;
    desc?: string;
    stage?: string;
    matches?: typeof db.matches;
  };

  const timelineItems: TimelineItem[] = [];

  // 1. Añadir jornadas de Liga agrupadas por jornada
  for (const [round, matches] of byRound.entries()) {
    timelineItems.push({
      id: `liga-${round}`,
      date: matches[0]?.date || "",
      type: "liga",
      round,
      title: `Liga · Jornada ${round}`,
      matches,
    });
  }

  // 2. Añadir jornadas de Copa (partidos reales si se han sorteado, o fechas oficiales programadas si no)
  if (hasCopaMatches) {
    for (const [round, matches] of copaByRound.entries()) {
      timelineItems.push({
        id: `copa-${round}`,
        date: matches[0]?.date || "",
        type: "copa",
        round,
        title: `Copa · Jornada ${round}`,
        matches,
      });
    }
  } else {
    for (const c of CUP_ROUNDS) {
      timelineItems.push({
        id: `copa-plan-${c.round}`,
        date: c.date,
        type: "copa-pending",
        round: c.round,
        title: c.title,
        desc: c.desc,
      });
    }
  }

  // 3. Añadir sábados de descanso oficial
  for (const b of TOURNAMENT_BREAKS) {
    timelineItems.push({
      id: `break-${b.date}`,
      date: b.date,
      type: "descanso",
      title: b.title,
      desc: b.desc,
    });
  }

  // 4. Ordenar todo estrictamente por fecha cronológica
  timelineItems.sort((a, b) => (a.date || "9999-99-99").localeCompare(b.date || "9999-99-99"));

  return (
    <div className="space-y-8">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <PageTitle subtitle="Todos los partidos se disputan los sábados en el Polideportivo Municipal de Lodosa.">
            Calendario oficial 2026 / 2027
          </PageTitle>
          <div className="flex flex-wrap items-center gap-2 shrink-0 mb-3 sm:mb-0">
            <CalendarPdfButton
              matches={db.matches}
              teams={teamsObj}
              settings={db.settings}
            />
            <RoundPosterModal matches={db.matches} teams={teamsObj} />
          </div>
        </div>

        {/* Resumen de descansos y copas */}
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-xs font-bold tracking-wider text-slate-500 uppercase">
            Normativa de fechas y descansos
          </h2>
          <div className="mt-2 grid gap-3 text-xs text-slate-600 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-3">
              <span className="font-semibold text-slate-800">🏆 Formato de Copa:</span>
              <p className="mt-0.5 text-slate-500">
                Se disputa cada 3 jornadas de liga. 2 grupos de 5 equipos (sorteo
                {hasCopaMatches ? " completado" : " pendiente"}).
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <span className="font-semibold text-slate-800">🛑 Parones de descanso:</span>
              <p className="mt-0.5 text-slate-500">
                Navidades (26 dic y 2 ene), Semana Santa (27 mar), 5 dic, 6 feb, 1 may y 8 may.
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <span className="font-semibold text-slate-800">⏰ Horarios de juego:</span>
              <p className="mt-0.5 text-slate-500">
                15:30, 16:30, 17:30, 18:30 y 19:30 (ida y vuelta simétrica en espejo).
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Calendario Cronológico Unificado */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Cronograma de Competición (Semana a Semana)
            </h2>
            <p className="text-xs text-slate-500">
              Orden cronológico con todas las jornadas de Liga, parones de Copa y descansos oficiales.
            </p>
          </div>
          <span className="hidden sm:inline text-xs font-medium text-slate-500">
            Del 17 oct 2026 al 15 may 2027
          </span>
        </div>

        {timelineItems.length === 0 ? (
          <Card>
            <Empty>El calendario todavía no está disponible.</Empty>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {timelineItems.map((item) => {
              // 1. Caso: Descanso oficial
              if (item.type === "descanso") {
                return (
                  <div
                    key={item.id}
                    className="flex flex-col justify-between rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/70 p-5 shadow-2xs md:col-span-2 lg:col-span-1"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-200 px-2.5 py-0.5 text-[11px] font-black text-slate-700 uppercase tracking-wider">
                          🛑 Descanso Oficial
                        </span>
                        {item.date && (
                          <span className="text-xs font-bold text-slate-500">
                            {formatDate(item.date, { long: true })}
                          </span>
                        )}
                      </div>
                      <h3 className="mt-2.5 text-base font-bold text-slate-800">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">{item.desc}</p>
                    </div>
                    <div className="mt-3 text-[11px] font-semibold text-slate-400">
                      Sin partidos programados en el polideportivo este sábado
                    </div>
                  </div>
                );
              }

              // 2. Caso: Copa pendiente de sorteo
              if (item.type === "copa-pending") {
                return (
                  <div
                    key={item.id}
                    className="flex flex-col justify-between rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50/80 to-yellow-50/40 p-5 shadow-xs"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-200 px-2.5 py-0.5 text-[11px] font-black text-amber-950 uppercase tracking-wider">
                          🏆 Torneo de Copa
                        </span>
                        {item.date && (
                          <span className="text-xs font-bold text-amber-800">
                            {formatDate(item.date, { long: true })}
                          </span>
                        )}
                      </div>
                      <h3 className="mt-2.5 text-base font-extrabold text-amber-950">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-xs text-amber-800/80">{item.desc}</p>
                    </div>
                    <div className="mt-4 flex items-center justify-between rounded-xl bg-white/80 px-3 py-2 border border-amber-200 text-xs text-amber-900">
                      <span className="font-semibold">Partidos de Copa (2 grupos de 5)</span>
                      <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        Pendiente de sorteo
                      </span>
                    </div>
                  </div>
                );
              }

              // 3. Caso: Jornadas con partidos (Liga o Copa con partidos generados)
              const matches = item.matches || [];
              const isCopa = item.type === "copa";

              return (
                <Card
                  key={item.id}
                  title={
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                            isCopa
                              ? "bg-amber-100 text-amber-900 border border-amber-300"
                              : "bg-emerald-100 text-emerald-900 border border-emerald-300"
                          }`}
                        >
                          {isCopa ? "Copa" : "Liga"}
                        </span>
                        <span className="font-bold text-slate-900">
                          {isCopa ? `Copa · Jornada ${item.round}` : `Jornada ${item.round}`}
                        </span>
                      </div>
                      {item.date && (
                        <span className="text-xs font-semibold text-emerald-700">
                          {formatDate(item.date, { long: true })}
                        </span>
                      )}
                    </div>
                  }
                >
                  <div className="-mx-3 divide-y divide-slate-100">
                    {matches.map((m) => (
                      <div key={m.id}>
                        {m.stage && (
                          <div className="px-3 pt-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                            {m.stage}
                          </div>
                        )}
                        <MatchRow match={m} teams={teams} />
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
