import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { addEvent, deleteActaPhotoAction, deleteEvent, deleteMatch, updateMatch } from "@/app/actions";
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
  const session = await requireEditorOrReferee();
  const isAdmin = session.role === "admin";
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

        {isAdmin && match.hasActaPhoto && (
          <Card title="📷 Fotografía del acta física (Exclusivo Administrador)">
            <div className="flex flex-col sm:flex-row items-center gap-5">
              <a
                href={`/api/actas/${match.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative block w-full sm:w-64 overflow-hidden rounded-xl border border-slate-200 bg-slate-900 text-center shadow-xs"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/actas/${match.id}`}
                  alt="Fotografía física del acta"
                  className="h-44 w-full object-cover transition group-hover:scale-105"
                />
                <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs font-bold text-white opacity-0 transition group-hover:opacity-100">
                  🔍 Ver en tamaño completo
                </span>
              </a>
              <div className="flex-1 space-y-2 text-xs">
                <p className="font-bold text-slate-800">
                  Esta es la fotografía original del acta en papel registrada para este encuentro.
                </p>
                {match.actaPhotoUploadedAt && (
                  <p className="text-slate-500">
                    Fecha de subida: {new Date(match.actaPhotoUploadedAt).toLocaleString()}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <a
                    href={`/api/actas/${match.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary py-1.5 text-xs font-bold"
                  >
                    Abrir foto completa
                  </a>
                  <Link href="/admin/actas" className="btn-secondary py-1.5 text-xs font-bold">
                    Ir al archivo de actas
                  </Link>
                  <form action={deleteActaPhotoAction}>
                    <input type="hidden" name="matchId" value={match.id} />
                    <input type="hidden" name="redirectTo" value={`/admin/partidos/${match.id}`} />
                    <button
                      type="submit"
                      className="rounded-xl px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                    >
                      Eliminar foto
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </Card>
        )}
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
              <label className="label" htmlFor="status">Estado del Partido</label>
              <select id="status" name="status" defaultValue={match.status} className="input font-semibold">
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="noShow">Incomparecencia / No presentado</label>
              <select
                id="noShow"
                name="noShow"
                defaultValue={match.noShow || "none"}
                className="input font-semibold text-rose-800"
              >
                <option value="none">Ninguno (Partido disputado)</option>
                <option value="home">❌ Local No Presentado ({home?.name || "Local"} · -3 pts)</option>
                <option value="away">❌ Visitante No Presentado ({away?.name || "Visitante"} · -3 pts)</option>
                <option value="both">❌ Ambos No Presentados (-3 pts a ambos)</option>
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
