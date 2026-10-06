import type { Metadata } from "next";
import { createMatch, drawCup, generateFixtures, resetCup } from "@/app/actions";
import { getDB } from "@/lib/db";
import { formatDate, sortMatches, teamMap } from "@/lib/stats";
import { Card, Empty, Flash, MatchRow, PageTitle } from "@/components/ui";
import { ConfirmButton } from "@/components/confirm-button";
import { RegenerarCalendarioSection } from "@/components/regenerar-calendario-section";
import { CUP_ROUNDS } from "@/lib/calendar-plan";

import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Partidos" };

export default async function AdminPartidos({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  await requireAdmin();
  const [db, sp] = await Promise.all([getDB(), searchParams]);
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
  const nextRound = Math.max(0, ...db.matches.map((m) => m.round)) || 1;

  return (
    <>
      <PageTitle subtitle="Pulsa en un partido para editar fecha, resultado, goles, tarjetas y observaciones.">
        Partidos y actas
      </PageTitle>
      <Flash searchParams={sp} />

      {/* Gestión de Copa */}
      <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-amber-950">
              🏆 Torneo de Copa (2 grupos de 5 equipos)
            </h2>
            <p className="text-xs text-amber-800">
              {hasCopaMatches
                ? `Sorteo realizado: ${copaMatches.length} partidos generados para las 5 jornadas reservadas.`
                : "Todavía no se ha realizado el sorteo de los 2 grupos de 5 equipos."}
            </p>
          </div>
          <div>
            {hasCopaMatches ? (
              <form action={resetCup}>
                <ConfirmButton message="¿Borrar los partidos de copa y volver a dejarlos pendientes de sorteo?">
                  Reiniciar sorteo de Copa
                </ConfirmButton>
              </form>
            ) : (
              <form action={drawCup}>
                <button className="btn bg-amber-600 hover:bg-amber-700">
                  🎲 Realizar Sorteo de Copa
                </button>
              </form>
            )}
          </div>
        </div>

        {!hasCopaMatches && (
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-amber-900/80">
            <span className="font-semibold">Fechas reservadas para la Copa:</span>
            {CUP_ROUNDS.slice(0, 5).map((c) => (
              <span
                key={c.round}
                className="rounded-md bg-white/80 px-2 py-0.5 font-mono shadow-xs"
              >
                J{c.round}: {formatDate(c.date)}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mb-6">
        <Card title="Añadir partido individual al calendario">
          <form action={createMatch} className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="label" htmlFor="competition">Competición</label>
              <select id="competition" name="competition" className="input font-semibold">
                <option value="liga">Liga Regular (18 jornadas)</option>
                <option value="copa">Copa</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="round">Jornada</label>
              <input
                id="round"
                name="round"
                type="number"
                min={1}
                max={18}
                defaultValue={nextRound}
                required
                className="input font-semibold"
              />
            </div>
            <div>
              <label className="label" htmlFor="date">Fecha</label>
              <input id="date" name="date" type="date" className="input" />
            </div>
            <div>
              <label className="label" htmlFor="time">Hora</label>
              <input
                id="time"
                name="time"
                type="time"
                defaultValue="15:30"
                className="input"
              />
            </div>
            <div className="col-span-2">
              <label className="label" htmlFor="homeTeamId">Equipo Local</label>
              <select id="homeTeamId" name="homeTeamId" required className="input">
                {db.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="label" htmlFor="awayTeamId">Equipo Visitante</label>
              <select id="awayTeamId" name="awayTeamId" required className="input" defaultValue={db.teams[1]?.id}>
                {db.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="col-span-2 md:col-span-4">
              <label className="label" htmlFor="venue">Lugar / Pabellón</label>
              <input
                id="venue"
                name="venue"
                defaultValue={db.settings.defaultVenue || "Polideportivo Municipal de Lodosa"}
                className="input"
              />
            </div>
            <div className="col-span-2 md:col-span-4 pt-1">
              <button className="btn w-full font-bold">+ Crear y Añadir Partido</button>
            </div>
          </form>
        </Card>
      </div>

      {/* Partidos de Copa si existen */}
      {hasCopaMatches && (
        <section className="mb-8 space-y-4">
          <h2 className="text-xl font-bold text-slate-900">
            Partidos de Copa (2 Grupos de 5)
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            {[...copaByRound.entries()].map(([round, matches]) => (
              <Card
                key={round}
                title={
                  <div className="flex justify-between items-baseline">
                    <span>Copa · Jornada {round}</span>
                    <span className="text-xs font-normal text-slate-500">
                      {formatDate(matches[0]?.date)}
                    </span>
                  </div>
                }
              >
                <div className="-mx-3 divide-y divide-slate-100">
                  {matches.map((m) => (
                    <div key={m.id}>
                      {m.stage && (
                        <div className="px-3 pt-1 text-[10px] font-bold text-amber-700 uppercase">
                          {m.stage}
                        </div>
                      )}
                      <MatchRow key={m.id} match={m} teams={teams} href={`/admin/partidos/${m.id}`} />
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Partidos de Liga */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900">
          Partidos de Liga (18 Jornadas)
        </h2>
        {byRound.size === 0 ? (
          <Card><Empty>No hay partidos de liga todavía.</Empty></Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {[...byRound.entries()].map(([round, matches]) => (
              <Card
                key={round}
                title={
                  <div className="flex justify-between items-baseline">
                    <span>Jornada {round}</span>
                    <span className="text-xs font-normal text-slate-500">
                      {formatDate(matches[0]?.date)}
                    </span>
                  </div>
                }
              >
                <div className="-mx-3 divide-y divide-slate-100">
                  {matches.map((m) => (
                    <MatchRow key={m.id} match={m} teams={teams} href={`/admin/partidos/${m.id}`} />
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Zona de peligro: Regeneración automática del calendario al final del todo */}
      <RegenerarCalendarioSection teamsCount={db.teams.length} />
    </>
  );
}
