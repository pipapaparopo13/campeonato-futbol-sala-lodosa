import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { addEvent, deleteEvent, deleteMatch, updateMatch } from "@/app/actions";
import { getDB } from "@/lib/db";
import { computeSanctions, eventSide, playerMap, sortEvents, teamMap } from "@/lib/stats";
import { EVENT_LABELS, STATUS_LABELS } from "@/lib/types";
import { Card, Empty, EventIcon, Flash, PageTitle, TeamBadge } from "@/components/ui";
import { ConfirmButton } from "@/components/confirm-button";
import { AiActaScanner } from "@/components/ai-acta-scanner";
import { LiveControlPanel } from "@/components/live-control-panel";
import { requireEditorOrReferee } from "@/lib/auth";

export const metadata: Metadata = { title: "Editar acta" };

export default async function AdminPartido({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  await requireEditorOrReferee();
  const [{ id }, sp, db] = await Promise.all([params, searchParams, getDB()]);
  const match = db.matches.find((m) => m.id === id);
  if (!match) notFound();
  const teams = teamMap(db);
  const players = playerMap(db);
  const sanctions = computeSanctions(db);
  const home = teams.get(match.homeTeamId);
  const away = teams.get(match.awayTeamId);
  const roster = (teamId: string) =>
    db.players
      .filter((p) => p.teamId === teamId)
      .sort((a, b) => (a.number ?? 999) - (b.number ?? 999) || a.name.localeCompare(b.name));
  const events = sortEvents(match.events);

  // Aviso si los goles anotados no cuadran con el marcador
  const goals = { home: 0, away: 0 };
  for (const e of events) {
    if (e.type !== "goal" && e.type !== "own_goal") continue;
    const side = eventSide(match, e, players);
    if (side) goals[side]++;
  }
  const mismatch =
    match.status === "played" &&
    events.some((e) => e.type === "goal" || e.type === "own_goal") &&
    (goals.home !== match.homeScore || goals.away !== match.awayScore);

  return (
    <>
      <div className="mb-3 flex items-center justify-between text-sm">
        <Link href="/admin/partidos" className="font-semibold text-emerald-700 hover:underline">← Partidos</Link>
        <Link href={`/partidos/${match.id}`} className="btn-secondary">Ver acta pública</Link>
      </div>
      <PageTitle subtitle={`Jornada ${match.round} · ${STATUS_LABELS[match.status]}`}>
        <span className="flex flex-wrap items-center gap-2">
          <TeamBadge team={home} /> {home?.name} <span className="text-slate-400">vs</span> {away?.name}{" "}
          <TeamBadge team={away} />
        </span>
      </PageTitle>
      <Flash searchParams={sp} />

      <div className="mb-6 space-y-6">
        <LiveControlPanel
          match={match}
          home={home}
          away={away}
          players={db.players}
          redirectTo={`/admin/partidos/${match.id}`}
        />
        <AiActaScanner matchId={match.id} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="1. Datos y resultado">
          <form action={updateMatch} className="grid grid-cols-2 gap-3">
            <input type="hidden" name="id" value={match.id} />
            <div>
              <label className="label" htmlFor="homeTeamId">Local</label>
              <select id="homeTeamId" name="homeTeamId" defaultValue={match.homeTeamId} className="input">
                {db.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="awayTeamId">Visitante</label>
              <select id="awayTeamId" name="awayTeamId" defaultValue={match.awayTeamId} className="input">
                {db.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="homeScore">Goles local</label>
              <input id="homeScore" name="homeScore" type="number" min={0} defaultValue={match.homeScore ?? ""} className="input text-center text-lg font-bold" />
            </div>
            <div>
              <label className="label" htmlFor="awayScore">Goles visitante</label>
              <input id="awayScore" name="awayScore" type="number" min={0} defaultValue={match.awayScore ?? ""} className="input text-center text-lg font-bold" />
            </div>
            <div>
              <label className="label" htmlFor="status">Estado</label>
              <select id="status" name="status" defaultValue={match.status} className="input">
                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="competition">Competición</label>
              <select id="competition" name="competition" defaultValue={match.competition ?? "liga"} className="input">
                <option value="liga">Liga</option>
                <option value="copa">Copa</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="round">Jornada</label>
              <input id="round" name="round" type="number" min={1} defaultValue={match.round} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="date">Fecha</label>
              <input id="date" name="date" type="date" defaultValue={match.date} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="time">Hora</label>
              <input id="time" name="time" type="time" defaultValue={match.time} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="venue">Lugar</label>
              <input id="venue" name="venue" defaultValue={match.venue} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="referee">Árbitro</label>
              <input id="referee" name="referee" defaultValue={match.referee} className="input" />
            </div>
            <div className="col-span-2">
              <label className="label" htmlFor="notes">Observaciones del acta</label>
              <textarea id="notes" name="notes" rows={4} defaultValue={match.notes} className="input" placeholder="Incidencias, expulsiones, comportamiento del público…" />
            </div>
            <div className="col-span-2 flex items-center justify-between">
              <button className="btn">Guardar acta</button>
            </div>
          </form>
        </Card>

        <div className="space-y-6">
          <Card title="2. Goles y tarjetas">
            {mismatch && (
              <div className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-200">
                Ojo: los goles anotados ({goals.home}-{goals.away}) no coinciden con el resultado (
                {match.homeScore}-{match.awayScore}).
              </div>
            )}
            <form action={addEvent} className="mb-5 grid grid-cols-[1fr_1fr_80px] gap-2 rounded-xl bg-slate-50 p-3">
              <input type="hidden" name="matchId" value={match.id} />
              <div className="col-span-3 sm:col-span-1">
                <label className="label" htmlFor="type">Tipo</label>
                <select id="type" name="type" className="input">
                  {Object.entries(EVENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="label" htmlFor="playerId">Jugador</label>
                <select id="playerId" name="playerId" required className="input">
                  {[home, away].map((t) =>
                    t ? (
                      <optgroup key={t.id} label={t.name}>
                        {roster(t.id).map((p) => {
                          const isBanned = sanctions.has(p.id);
                          return (
                            <option key={p.id} value={p.id}>
                              {p.number != null ? `${p.number}. ` : ""}
                              {p.name}
                              {isBanned ? " ⛔ (SANCIONADO)" : ""}
                            </option>
                          );
                        })}
                      </optgroup>
                    ) : null,
                  )}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="minute">Min.</label>
                <input id="minute" name="minute" type="number" min={0} max={60} className="input" />
              </div>
              <div className="col-span-3">
                <button className="btn">+ Añadir al acta</button>
              </div>
            </form>
            {roster(match.homeTeamId).length + roster(match.awayTeamId).length === 0 && (
              <p className="mb-3 text-sm text-amber-700">
                Primero añade jugadores a los equipos en «Equipos y jugadores».
              </p>
            )}
            {events.length ? (
              <ul className="divide-y divide-slate-100">
                {events.map((e) => {
                  const p = players.get(e.playerId);
                  return (
                    <li key={e.id} className="flex items-center gap-3 py-2 text-sm">
                      <span className="w-8 font-mono text-slate-400">{e.minute !== null ? `${e.minute}'` : "—"}</span>
                      <EventIcon type={e.type} />
                      <span className="flex-1">
                        <strong>{p?.name ?? "?"}</strong>{" "}
                        <span className="text-slate-500">({teams.get(p?.teamId ?? "")?.name}) · {EVENT_LABELS[e.type]}</span>
                      </span>
                      <form action={deleteEvent}>
                        <input type="hidden" name="matchId" value={match.id} />
                        <input type="hidden" name="eventId" value={e.id} />
                        <button className="btn-danger" title="Quitar">✕</button>
                      </form>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <Empty>Sin goles ni tarjetas anotados.</Empty>
            )}
          </Card>

          <Card title="Zona peligrosa">
            <form action={deleteMatch}>
              <input type="hidden" name="id" value={match.id} />
              <ConfirmButton message="¿Borrar este partido y su acta? No se puede deshacer.">Borrar partido</ConfirmButton>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
