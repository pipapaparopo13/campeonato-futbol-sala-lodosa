import Link from "next/link";
import type { Match, Team } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/types";
import { formatDate, type StandingRow } from "@/lib/stats";

export function TeamBadge({
  team,
  size = "md",
}: {
  team: Team | undefined;
  size?: "sm" | "md" | "lg";
}) {
  const dims =
    size === "lg"
      ? "h-16 w-16 text-lg"
      : size === "sm"
        ? "h-6 w-6 text-[9px]"
        : "h-9 w-9 text-xs";
  return (
    <span
      className={`${dims} inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white ring-2 ring-white/70 shadow-sm`}
      style={{ backgroundColor: team?.color ?? "#9ca3af" }}
      aria-hidden
    >
      {team?.shortName ?? "?"}
    </span>
  );
}

export function TeamName({ team }: { team: Team | undefined }) {
  if (!team) return <span className="text-slate-400">Equipo eliminado</span>;
  return (
    <Link href={`/equipos/${team.id}`} className="hover:underline">
      {team.name}
    </Link>
  );
}

export function PageTitle({
  children,
  subtitle,
}: {
  children: React.ReactNode;
  subtitle?: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
        {children}
      </h1>
      {subtitle && <p className="mt-1 text-slate-500">{subtitle}</p>}
    </div>
  );
}

export function Card({
  title,
  action,
  children,
  className = "",
}: {
  title?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden ${className}`}
    >
      {title && (
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-5">
          <h2 className="font-bold text-slate-900 text-sm sm:text-base">{title}</h2>
          {action}
        </div>
      )}
      <div className="p-3.5 sm:p-5">{children}</div>
    </section>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-sm text-slate-400">{children}</p>;
}

export function CardIcon({ type }: { type: "yellow" | "red" }) {
  return (
    <span
      className={`inline-block h-4 w-3 rounded-[2px] shadow-sm ${type === "yellow" ? "bg-yellow-400" : "bg-red-600"}`}
      title={type === "yellow" ? "Tarjeta amarilla" : "Tarjeta roja"}
    />
  );
}

export function EventIcon({ type }: { type: string }) {
  if (type === "yellow" || type === "red") return <CardIcon type={type} />;
  return (
    <span title={type === "own_goal" ? "Gol en propia puerta" : "Gol"}>
      ⚽{type === "own_goal" && <sup className="text-[10px] text-red-600">PP</sup>}
    </span>
  );
}

export function MatchRow({
  match,
  teams,
  href,
}: {
  match: Match;
  teams: Map<string, Team>;
  href?: string;
}) {
  const home = teams.get(match.homeTeamId);
  const away = teams.get(match.awayTeamId);
  const played = match.status === "played";
  const inProgress = match.status === "in_progress";
  return (
    <Link
      href={href ?? `/partidos/${match.id}`}
      className={`group grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3 rounded-xl px-2 sm:px-3 py-2.5 sm:py-3 transition ${
        inProgress ? "bg-rose-50/80 ring-1 ring-rose-300 hover:bg-rose-100/70" : "hover:bg-emerald-50 active:bg-emerald-100/50"
      }`}
    >
      <div className="flex min-w-0 items-center justify-end gap-1.5 sm:gap-2 text-right">
        <span className="truncate text-xs sm:text-sm font-semibold text-slate-800">
          {home?.name ?? "?"}
        </span>
        <TeamBadge team={home} size="sm" />
      </div>
      <div className="flex min-w-[70px] sm:min-w-[88px] flex-col items-center">
        {played || inProgress ? (
          <div className="flex flex-col items-center">
            {inProgress && (
              <span className="mb-0.5 inline-flex items-center gap-1 rounded-full bg-rose-600 px-1.5 py-0.2 text-[9px] font-black uppercase text-white animate-pulse">
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
                EN VIVO
              </span>
            )}
            <span
              className={`rounded-lg px-2 sm:px-3 py-0.5 sm:py-1 font-mono text-base sm:text-lg font-bold text-white shadow-xs ${
                inProgress ? "bg-rose-600 ring-2 ring-rose-400" : "bg-slate-900"
              }`}
            >
              {match.homeScore ?? 0} - {match.awayScore ?? 0}
            </span>
          </div>
        ) : (
          <span
            className={`rounded-lg px-2 sm:px-3 py-0.5 sm:py-1 text-[11px] sm:text-xs font-semibold ${match.status === "postponed" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"}`}
          >
            {match.status === "postponed"
              ? STATUS_LABELS.postponed
              : match.time || "vs"}
          </span>
        )}
        <span className="mt-0.5 sm:mt-1 text-[10px] sm:text-[11px] text-slate-400">
          {formatDate(match.date)}
        </span>
      </div>
      <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
        <TeamBadge team={away} size="sm" />
        <span className="truncate text-xs sm:text-sm font-semibold text-slate-800">
          {away?.name ?? "?"}
        </span>
      </div>
    </Link>
  );
}

const FORM_STYLE = {
  W: "bg-emerald-500",
  D: "bg-slate-400",
  L: "bg-red-500",
} as const;
const FORM_LABEL = { W: "V", D: "E", L: "D" } as const;

export function StandingsTable({
  rows,
  compact = false,
}: {
  rows: StandingRow[];
  compact?: boolean;
}) {
  return (
    <div className="-mx-3.5 sm:-mx-5 overflow-x-auto">
      <table className="w-full min-w-[340px] text-xs sm:text-sm">
        <thead>
          <tr className="text-[11px] sm:text-xs uppercase tracking-wide text-slate-400 border-b border-slate-100">
            <th className="w-6 sm:w-8 py-2 pl-3 sm:pl-5 text-left">#</th>
            <th className="py-2 text-left">Equipo</th>
            <th className="py-2 px-1 text-center" title="Partidos jugados">PJ</th>
            {!compact && (
              <>
                <th className="py-2 px-1 text-center" title="Ganados">G</th>
                <th className="py-2 px-1 text-center" title="Empatados">E</th>
                <th className="py-2 px-1 text-center" title="Perdidos">P</th>
                <th className="hidden py-2 px-1 text-center sm:table-cell" title="Goles a favor">GF</th>
                <th className="hidden py-2 px-1 text-center sm:table-cell" title="Goles en contra">GC</th>
              </>
            )}
            <th className="py-2 px-1 text-center" title="Diferencia de goles">DG</th>
            <th className="py-2 pr-3 sm:pr-5 text-center">Pts</th>
            {!compact && <th className="hidden py-2 pr-5 text-left md:table-cell">Últimos</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const dg = r.goalsFor - r.goalsAgainst;
            return (
              <tr key={r.team.id} className="border-t border-slate-100 hover:bg-slate-50/70">
                <td className="py-2 sm:py-2.5 pl-3 sm:pl-5 font-bold text-slate-400">{i + 1}</td>
                <td className="py-2 sm:py-2.5">
                  <Link
                    href={`/equipos/${r.team.id}`}
                    className="flex items-center gap-1.5 sm:gap-2 font-semibold text-slate-800 hover:underline"
                  >
                    <TeamBadge team={r.team} size="sm" />
                    <span className="truncate max-w-[130px] sm:max-w-none">{r.team.name}</span>
                  </Link>
                </td>
                <td className="py-2 sm:py-2.5 px-1 text-center">{r.played}</td>
                {!compact && (
                  <>
                    <td className="py-2 sm:py-2.5 px-1 text-center">{r.won}</td>
                    <td className="py-2 sm:py-2.5 px-1 text-center">{r.drawn}</td>
                    <td className="py-2 sm:py-2.5 px-1 text-center">{r.lost}</td>
                    <td className="hidden py-2 sm:py-2.5 px-1 text-center sm:table-cell">{r.goalsFor}</td>
                    <td className="hidden py-2 sm:py-2.5 px-1 text-center sm:table-cell">{r.goalsAgainst}</td>
                  </>
                )}
                <td className="py-2 sm:py-2.5 px-1 text-center text-slate-500 font-mono text-[11px] sm:text-xs">
                  {dg > 0 ? `+${dg}` : dg}
                </td>
                <td className="py-2 sm:py-2.5 pr-3 sm:pr-5 text-center text-sm sm:text-base font-extrabold text-emerald-700">
                  {r.points}
                </td>
                {!compact && (
                  <td className="hidden py-2.5 pr-5 md:table-cell">
                    <div className="flex gap-1">
                      {r.form.map((f, j) => (
                        <span
                          key={j}
                          className={`flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold text-white ${FORM_STYLE[f]}`}
                        >
                          {FORM_LABEL[f]}
                        </span>
                      ))}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function Flash({
  searchParams,
}: {
  searchParams: { error?: string | string[]; ok?: string | string[] };
}) {
  const error = typeof searchParams.error === "string" ? searchParams.error : null;
  const ok = typeof searchParams.ok === "string" ? searchParams.ok : null;
  if (!error && !ok) return null;
  return (
    <div
      className={`mb-4 rounded-xl px-4 py-3 text-sm font-medium ${error ? "bg-red-50 text-red-700 ring-1 ring-red-200" : "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"}`}
    >
      {error ?? ok}
    </div>
  );
}
