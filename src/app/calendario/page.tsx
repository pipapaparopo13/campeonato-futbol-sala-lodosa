import type { Metadata } from "next";
import { getDB } from "@/lib/db";
import { formatDate, sortMatches, teamMap } from "@/lib/stats";
import { Card, Empty, MatchRow, PageTitle } from "@/components/ui";
import { CUP_ROUNDS, TOURNAMENT_BREAKS } from "@/lib/calendar-plan";

export const metadata: Metadata = { title: "Calendario y resultados" };

export default async function CalendarioPage() {
  const db = await getDB();
  const teams = teamMap(db);

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

  return (
    <div className="space-y-8">
      <div>
        <PageTitle subtitle="Todos los partidos se disputan los sábados en el Polideportivo Municipal de Lodosa.">
          Calendario oficial 2026 / 2027
        </PageTitle>

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

      {/* Sección Liga */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <h2 className="text-xl font-bold text-slate-900">
            Liga Regular · 18 Jornadas
          </h2>
          <span className="text-xs font-medium text-slate-500">
            Del 17 de octubre de 2026 al 24 de abril de 2027
          </span>
        </div>

        {byRound.size === 0 ? (
          <Card>
            <Empty>El calendario de liga todavía no está publicado.</Empty>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {[...byRound.entries()].map(([round, matches]) => {
              const dateStr = matches[0]?.date;
              return (
                <Card
                  key={round}
                  title={
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-bold text-slate-900">Jornada {round}</span>
                      {dateStr && (
                        <span className="text-xs font-semibold text-emerald-700">
                          {formatDate(dateStr, { long: true })}
                        </span>
                      )}
                    </div>
                  }
                >
                  <div className="-mx-3 divide-y divide-slate-100">
                    {matches.map((m) => (
                      <MatchRow key={m.id} match={m} teams={teams} />
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Sección Copa */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Torneo de Copa · 2 Grupos de 5
            </h2>
            <p className="text-xs text-slate-500">
              Intercalada cada 3 jornadas de liga.
            </p>
          </div>
          {!hasCopaMatches && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
              Pendiente de sorteo
            </span>
          )}
        </div>

        {hasCopaMatches ? (
          <div className="grid gap-6 md:grid-cols-2">
            {[...copaByRound.entries()].map(([round, matches]) => {
              const dateStr = matches[0]?.date;
              return (
                <Card
                  key={round}
                  title={
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-bold text-slate-900">Copa · Jornada {round}</span>
                      {dateStr && (
                        <span className="text-xs font-semibold text-emerald-700">
                          {formatDate(dateStr, { long: true })}
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
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CUP_ROUNDS.map((c) => (
              <div
                key={c.round}
                className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 shadow-sm"
              >
                <div className="text-xs font-bold text-emerald-700">
                  {formatDate(c.date, { long: true })}
                </div>
                <div className="mt-1 font-bold text-slate-800">{c.title}</div>
                <div className="mt-1 text-xs text-slate-500">{c.desc}</div>
                <div className="mt-3 inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                  Partidos pendientes del sorteo
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Parones y descansos oficiales */}
      <section className="space-y-4">
        <h2 className="border-b border-slate-200 pb-2 text-xl font-bold text-slate-900">
          Sábados sin jornada (Descanso oficial)
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TOURNAMENT_BREAKS.map((b) => (
            <div
              key={b.date}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="text-xs font-bold text-slate-400">
                {formatDate(b.date, { long: true })}
              </div>
              <div className="mt-1 font-bold text-slate-800">{b.title}</div>
              <div className="mt-1 text-xs text-slate-500">{b.desc}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
