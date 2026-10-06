import Link from "next/link";
import { getDB } from "@/lib/db";
import {
  computePlayerStats,
  computeStandings,
  isPlayed,
  sortMatches,
  teamMap,
} from "@/lib/stats";
import { Card, Empty, MatchRow, StandingsTable, TeamBadge } from "@/components/ui";
import { RoundPosterModal } from "@/components/round-poster-modal";

export default async function Home() {
  const db = await getDB();
  const teams = teamMap(db);
  const teamsObj = Object.fromEntries(teams);
  const standings = computeStandings(db);
  const sorted = sortMatches(db.matches);
  const results = sorted.filter(isPlayed).reverse().slice(0, 6);
  const upcoming = sorted.filter((m) => !isPlayed(m)).slice(0, 6);
  const scorers = computePlayerStats(db)
    .filter((s) => s.goals > 0)
    .sort((a, b) => b.goals - a.goals)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Banner rápido para compartir carteles */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 p-4 text-white shadow-md">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-xl">
            📸
          </span>
          <div>
            <h3 className="text-sm font-extrabold">Carteles Oficiales para Redes</h3>
            <p className="text-xs text-emerald-200/80">
              Genera imágenes de la próxima jornada y resultados para Instagram Stories o WhatsApp
            </p>
          </div>
        </div>
        <RoundPosterModal matches={db.matches} teams={teamsObj} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <Card
            title="Últimos resultados"
            action={
              <Link href="/calendario" className="text-sm font-semibold text-emerald-700 hover:underline">
                Ver calendario →
              </Link>
            }
          >
            {results.length ? (
              <div className="-mx-3 divide-y divide-slate-100">
                {results.map((m) => (
                  <MatchRow key={m.id} match={m} teams={teams} />
                ))}
              </div>
            ) : (
              <Empty>Todavía no se ha jugado ningún partido.</Empty>
            )}
          </Card>
          <Card title="Próximos partidos">
            {upcoming.length ? (
              <div className="-mx-3 divide-y divide-slate-100">
                {upcoming.map((m) => (
                  <MatchRow key={m.id} match={m} teams={teams} />
                ))}
              </div>
            ) : (
              <Empty>No hay partidos programados.</Empty>
            )}
          </Card>
        </div>
      <div className="space-y-6">
        <Card
          title="Clasificación"
          action={
            <Link href="/clasificacion" className="text-sm font-semibold text-emerald-700 hover:underline">
              Completa →
            </Link>
          }
        >
          <StandingsTable rows={standings} compact />
        </Card>
        <Card
          title="Máximos goleadores"
          action={
            <Link href="/estadisticas" className="text-sm font-semibold text-emerald-700 hover:underline">
              Estadísticas →
            </Link>
          }
        >
          {scorers.length ? (
            <ol className="space-y-2">
              {scorers.map((s, i) => (
                <li key={s.player.id} className="flex items-center gap-3">
                  <span className="w-5 text-sm font-bold text-slate-400">{i + 1}</span>
                  <TeamBadge team={s.team} size="sm" />
                  <Link href={`/jugadores/${s.player.id}`} className="flex-1 truncate font-medium hover:underline">
                    {s.player.name}
                  </Link>
                  <span className="font-mono font-bold text-emerald-700">{s.goals}</span>
                </li>
              ))}
            </ol>
          ) : (
            <Empty>Sin goles registrados todavía.</Empty>
          )}
        </Card>
      </div>
    </div>
  </div>
  );
}
