import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDB } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { eventSide, formatDate, playerMap, sortEvents, teamMap } from "@/lib/stats";
import { EVENT_LABELS, STATUS_LABELS } from "@/lib/types";
import { Card, Empty, EventIcon, TeamBadge, TeamName } from "@/components/ui";
import { ShareMatchButtons } from "@/components/share-buttons";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const db = await getDB();
  const m = db.matches.find((x) => x.id === id);
  if (!m) return { title: "Partido no encontrado" };
  const t = teamMap(db);
  return {
    title: `Acta: ${t.get(m.homeTeamId)?.name} - ${t.get(m.awayTeamId)?.name}`,
  };
}

export default async function ActaPage({ params }: Props) {
  const { id } = await params;
  const [db, admin] = await Promise.all([getDB(), isAdmin()]);
  const match = db.matches.find((m) => m.id === id);
  if (!match) notFound();

  const teams = teamMap(db);
  const players = playerMap(db);
  const home = teams.get(match.homeTeamId);
  const away = teams.get(match.awayTeamId);
  const events = sortEvents(match.events);
  const played = match.status === "played";

  const sideEvents = (side: "home" | "away") =>
    events.filter((e) => {
      const p = players.get(e.playerId);
      const teamId = side === "home" ? match.homeTeamId : match.awayTeamId;
      return p?.teamId === teamId;
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm print:hidden">
        <Link href="/calendario" className="font-semibold text-emerald-700 hover:underline">
          ← Volver al calendario
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <ShareMatchButtons
            match={match}
            home={home}
            away={away}
            events={events}
            players={players}
          />
          {admin && (
            <Link href={`/admin/partidos/${match.id}`} className="btn-secondary">
              Editar acta
            </Link>
          )}
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl bg-slate-900 text-white shadow-lg">
        <div className="bg-white/5 px-5 py-2 text-center text-xs font-semibold tracking-widest text-slate-300 uppercase">
          Acta Oficial de Partido · {match.competition === "copa" ? `Copa (${match.stage || "Jornada"})` : "Liga Regular"} · Jornada {match.round} ·{" "}
          <span className={played ? "text-emerald-400" : match.status === "postponed" ? "text-amber-400" : ""}>
            {STATUS_LABELS[match.status]}
          </span>
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4 px-3 sm:px-4 py-5 sm:py-8">
          <div className="flex flex-col items-center gap-1.5 sm:gap-2 text-center min-w-0">
            <TeamBadge team={home} size="lg" />
            <span className="font-bold text-xs sm:text-base md:text-lg truncate max-w-full">
              <TeamName team={home} />
            </span>
            <span className="text-[10px] sm:text-xs text-slate-400">Local</span>
          </div>
          <div className="text-center font-mono text-3xl font-black sm:text-5xl md:text-6xl px-1 sm:px-2">
            {played ? (
              <>
                {match.homeScore}
                <span className="mx-1.5 sm:mx-2 text-slate-500">-</span>
                {match.awayScore}
              </>
            ) : (
              <span className="text-xl text-slate-400 sm:text-3xl">{match.time || "vs"}</span>
            )}
          </div>
          <div className="flex flex-col items-center gap-1.5 sm:gap-2 text-center min-w-0">
            <TeamBadge team={away} size="lg" />
            <span className="font-bold text-xs sm:text-base md:text-lg truncate max-w-full">
              <TeamName team={away} />
            </span>
            <span className="text-[10px] sm:text-xs text-slate-400">Visitante</span>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-px bg-white/10 text-sm sm:grid-cols-4">
          {[
            ["Fecha", formatDate(match.date, { long: true })],
            ["Hora", match.time || "—"],
            ["Lugar", match.venue || "Polideportivo Municipal de Lodosa"],
            ["Árbitro", match.referee || "—"],
          ].map(([k, v]) => (
            <div key={k} className="bg-slate-900 px-4 py-3">
              <dt className="text-[11px] tracking-wide text-slate-400 uppercase">{k}</dt>
              <dd className="font-medium first-letter:uppercase">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        {(["home", "away"] as const).map((side) => {
          const team = side === "home" ? home : away;
          const list = sideEvents(side);
          return (
            <Card
              key={side}
              title={
                <span className="flex items-center gap-2">
                  <TeamBadge team={team} size="sm" /> {team?.name}
                </span>
              }
            >
              {list.length ? (
                <ul className="space-y-2">
                  {list.map((e) => {
                    const p = players.get(e.playerId);
                    return (
                      <li key={e.id} className="flex items-center gap-3">
                        <span className="w-10 text-right font-mono text-sm text-slate-400">
                          {e.minute !== null ? `${e.minute}'` : ""}
                        </span>
                        <EventIcon type={e.type} />
                        <Link href={`/jugadores/${e.playerId}`} className="font-medium hover:underline">
                          {p?.number != null && <span className="mr-1 text-slate-400">{p.number}.</span>}
                          {p?.name ?? "Jugador eliminado"}
                        </Link>
                        <span className="ml-auto text-xs text-slate-400">{EVENT_LABELS[e.type]}</span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <Empty>Sin goles ni tarjetas registrados.</Empty>
              )}
            </Card>
          );
        })}
      </div>

      {events.length > 0 && (
        <Card title="Cronología y desarrollo del partido">
          <ol className="relative space-y-3 border-l-2 border-slate-100 pl-5">
            {events.map((e) => {
              const p = players.get(e.playerId);
              const side = eventSide(match, e, players);
              const scoringTeam = side === "home" ? home : side === "away" ? away : undefined;
              return (
                <li key={e.id} className="flex items-center gap-3 text-sm">
                  <span className="w-10 font-mono text-slate-400">
                    {e.minute !== null ? `${e.minute}'` : "—"}
                  </span>
                  <EventIcon type={e.type} />
                  <span>
                    <strong>{p?.name ?? "?"}</strong>{" "}
                    <span className="text-slate-500">
                      ({teams.get(p?.teamId ?? "")?.name ?? "?"}) · {EVENT_LABELS[e.type]}
                      {e.type === "own_goal" && scoringTeam ? ` (suma a ${scoringTeam.name})` : ""}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
        </Card>
      )}

      <Card title="Observaciones del árbitro y de la mesa">
        {match.notes ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-700">{match.notes}</p>
        ) : (
          <Empty>Sin observaciones en el acta.</Empty>
        )}
      </Card>

      {/* Cuadro de firmas oficial (imprimible) */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Cierre y firmas del acta oficial · Campeonato de Fútbol Sala de Lodosa
        </h3>
        <div className="mt-8 grid grid-cols-3 gap-6 text-center text-xs text-slate-500">
          <div className="border-t border-slate-300 pt-2">
            <span className="font-semibold text-slate-800">Capitán {home?.name || "Local"}</span>
            <div className="h-12"></div>
            <span className="text-[10px] text-slate-400">Firma / Conforme</span>
          </div>
          <div className="border-t border-slate-300 pt-2">
            <span className="font-semibold text-slate-800">Capitán {away?.name || "Visitante"}</span>
            <div className="h-12"></div>
            <span className="text-[10px] text-slate-400">Firma / Conforme</span>
          </div>
          <div className="border-t border-slate-300 pt-2">
            <span className="font-semibold text-slate-800">El Árbitro / Cronometrador</span>
            <div className="h-12"></div>
            <span className="text-[10px] text-slate-400">Firma oficial</span>
          </div>
        </div>
      </section>
    </div>
  );
}
