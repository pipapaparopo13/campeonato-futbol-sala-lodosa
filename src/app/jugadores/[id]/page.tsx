import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDB } from "@/lib/db";
import { formatDate, sortEvents, sortMatches, teamMap } from "@/lib/stats";
import { EVENT_LABELS } from "@/lib/types";
import { Card, Empty, EventIcon, TeamBadge } from "@/components/ui";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const db = await getDB();
  return { title: db.players.find((p) => p.id === id)?.name ?? "Jugador" };
}

export default async function JugadorPage({ params }: Props) {
  const { id } = await params;
  const db = await getDB();
  const player = db.players.find((p) => p.id === id);
  if (!player) notFound();
  const teams = teamMap(db);
  const team = teams.get(player.teamId);

  const history = sortMatches(db.matches)
    .map((match) => ({
      match,
      events: sortEvents(match.events.filter((e) => e.playerId === id)),
    }))
    .filter((h) => h.events.length > 0);

  const all = history.flatMap((h) => h.events);
  const count = (t: string) => all.filter((e) => e.type === t).length;

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center gap-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-2xl font-mono text-2xl font-black text-white"
          style={{ backgroundColor: team?.color ?? "#64748b" }}
        >
          {player.number ?? "–"}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-extrabold text-slate-900">{player.name}</h1>
          {team && (
            <Link href={`/equipos/${team.id}`} className="mt-1 inline-flex items-center gap-2 text-sm text-slate-600 hover:underline">
              <TeamBadge team={team} size="sm" /> {team.name}
            </Link>
          )}
        </div>
        <div className="flex gap-6 text-center">
          {[
            ["Goles", count("goal")],
            ["Amarillas", count("yellow")],
            ["Rojas", count("red")],
          ].map(([k, v]) => (
            <div key={k}>
              <div className="text-2xl font-black text-slate-900">{v}</div>
              <div className="text-[11px] tracking-wide text-slate-400 uppercase">{k}</div>
            </div>
          ))}
        </div>
      </section>

      <Card title="Goles y tarjetas por partido">
        {history.length ? (
          <ul className="divide-y divide-slate-100">
            {history.map(({ match, events }) => {
              const rival = teams.get(
                match.homeTeamId === player.teamId ? match.awayTeamId : match.homeTeamId,
              );
              return (
                <li key={match.id} className="flex flex-wrap items-center gap-3 py-3">
                  <Link href={`/partidos/${match.id}`} className="min-w-[220px] flex-1 hover:underline">
                    <span className="text-xs text-slate-400">
                      J{match.round} · {formatDate(match.date)}
                    </span>
                    <span className="block font-semibold">
                      vs {rival?.name ?? "?"}
                      {match.status === "played" && (
                        <span className="ml-2 font-mono text-slate-500">
                          ({match.homeScore}-{match.awayScore})
                        </span>
                      )}
                    </span>
                  </Link>
                  <div className="flex flex-wrap gap-3">
                    {events.map((e) => (
                      <span key={e.id} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs">
                        <EventIcon type={e.type} /> {EVENT_LABELS[e.type]}
                        {e.minute !== null && <span className="text-slate-400">{e.minute}&apos;</span>}
                      </span>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <Empty>Este jugador todavía no tiene goles ni tarjetas.</Empty>
        )}
      </Card>
    </div>
  );
}
