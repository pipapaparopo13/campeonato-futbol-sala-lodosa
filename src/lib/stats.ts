import type { DB, EventType, Match, MatchEvent, Player, Team } from "./types";

export interface StandingRow {
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  form: ("W" | "D" | "L")[];
}

export function isPlayed(m: Match) {
  return m.status === "played" && m.homeScore !== null && m.awayScore !== null;
}

export function sortMatches(matches: Match[]) {
  return [...matches].sort(
    (a, b) =>
      a.round - b.round ||
      (a.date || "9999").localeCompare(b.date || "9999") ||
      (a.time || "99").localeCompare(b.time || "99"),
  );
}

export function teamMap(db: DB) {
  return new Map(db.teams.map((t) => [t.id, t]));
}

export function playerMap(db: DB) {
  return new Map(db.players.map((p) => [p.id, p]));
}

/** Clasificación: 3 puntos victoria, 1 empate. Desempate: DG, GF, nombre. */
export function computeStandings(
  db: DB,
  filter?: { competition?: "liga" | "copa"; stage?: string; teamIds?: string[] },
): StandingRow[] {
  const comp = filter?.competition ?? "liga";
  const stage = filter?.stage;
  const targetTeams = filter?.teamIds
    ? db.teams.filter((t) => filter.teamIds!.includes(t.id))
    : stage
      ? db.teams.filter((t) =>
          db.matches.some(
            (m) =>
              (m.competition ?? "liga") === comp &&
              m.stage === stage &&
              (m.homeTeamId === t.id || m.awayTeamId === t.id),
          ),
        )
      : db.teams;

  const rows = new Map<string, StandingRow>(
    targetTeams.map((team) => [
      team.id,
      {
        team,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0,
        form: [],
      },
    ]),
  );

  for (const m of sortMatches(db.matches)) {
    if (!isPlayed(m)) continue;
    if ((m.competition ?? "liga") !== comp) continue;
    if (stage && m.stage !== stage) continue;
    const home = rows.get(m.homeTeamId);
    const away = rows.get(m.awayTeamId);
    if (!home || !away) continue;
    const hs = m.homeScore!;
    const as = m.awayScore!;
    home.played++;
    away.played++;
    home.goalsFor += hs;
    home.goalsAgainst += as;
    away.goalsFor += as;
    away.goalsAgainst += hs;
    if (hs > as) {
      home.won++;
      away.lost++;
      home.points += 3;
      home.form.push("W");
      away.form.push("L");
    } else if (hs < as) {
      away.won++;
      home.lost++;
      away.points += 3;
      home.form.push("L");
      away.form.push("W");
    } else {
      home.drawn++;
      away.drawn++;
      home.points++;
      away.points++;
      home.form.push("D");
      away.form.push("D");
    }
  }

  return [...rows.values()]
    .map((r) => ({ ...r, form: r.form.slice(-5) }))
    .sort(
      (a, b) =>
        b.points - a.points ||
        b.goalsFor - b.goalsAgainst - (a.goalsFor - a.goalsAgainst) ||
        b.goalsFor - a.goalsFor ||
        a.team.name.localeCompare(b.team.name),
    );
}

export interface PlayerStats {
  player: Player;
  team: Team | undefined;
  goals: number;
  ownGoals: number;
  yellows: number;
  reds: number;
  matches: number; // partidos con al menos un evento registrado
}

export function computePlayerStats(db: DB): PlayerStats[] {
  const teams = teamMap(db);
  const stats = new Map<string, PlayerStats>(
    db.players.map((player) => [
      player.id,
      {
        player,
        team: teams.get(player.teamId),
        goals: 0,
        ownGoals: 0,
        yellows: 0,
        reds: 0,
        matches: 0,
      },
    ]),
  );
  for (const m of db.matches) {
    const seen = new Set<string>();
    for (const e of m.events) {
      const s = stats.get(e.playerId);
      if (!s) continue;
      if (e.type === "goal") s.goals++;
      if (e.type === "own_goal") s.ownGoals++;
      if (e.type === "yellow") s.yellows++;
      if (e.type === "red") s.reds++;
      seen.add(e.playerId);
    }
    for (const id of seen) stats.get(id)!.matches++;
  }
  return [...stats.values()];
}

export interface EventWithContext {
  match: Match;
  event: MatchEvent;
  player: Player | undefined;
}

/** Todos los eventos de cierto tipo, con su partido (p. ej. tarjetas). */
export function eventsOfType(db: DB, types: EventType[]): EventWithContext[] {
  const players = playerMap(db);
  const out: EventWithContext[] = [];
  for (const match of sortMatches(db.matches)) {
    for (const event of sortEvents(match.events)) {
      if (types.includes(event.type)) {
        out.push({ match, event, player: players.get(event.playerId) });
      }
    }
  }
  return out;
}

export function sortEvents(events: MatchEvent[]) {
  return [...events].sort((a, b) => (a.minute ?? 999) - (b.minute ?? 999));
}

/** Equipo al que suma el evento (un gol en propia suma al rival). */
export function eventSide(
  match: Match,
  event: MatchEvent,
  players: Map<string, Player>,
): "home" | "away" | null {
  const p = players.get(event.playerId);
  if (!p) return null;
  const side =
    p.teamId === match.homeTeamId
      ? "home"
      : p.teamId === match.awayTeamId
        ? "away"
        : null;
  if (!side) return null;
  if (event.type === "own_goal") return side === "home" ? "away" : "home";
  return side;
}

export function formatDate(date: string, opts?: { long?: boolean }) {
  if (!date) return "Fecha por determinar";
  const d = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return date;
  return new Intl.DateTimeFormat("es-ES", {
    weekday: opts?.long ? "long" : "short",
    day: "numeric",
    month: opts?.long ? "long" : "short",
    year: opts?.long ? "numeric" : undefined,
    timeZone: "UTC",
  }).format(d);
}

/** Calendario todos contra todos (método del círculo). */
export function roundRobin(
  teamIds: string[],
  doubleRound: boolean,
): { round: number; home: string; away: string }[] {
  const ids = [...teamIds];
  if (ids.length % 2 === 1) ids.push("__BYE__");
  const n = ids.length;
  const rounds = n - 1;
  const out: { round: number; home: string; away: string }[] = [];
  let rot = [...ids];
  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < n / 2; i++) {
      const a = rot[i];
      const b = rot[n - 1 - i];
      if (a === "__BYE__" || b === "__BYE__") continue;
      const swap = (i === 0 && r % 2 === 1) || (i > 0 && i % 2 === 1);
      out.push({ round: r + 1, home: swap ? b : a, away: swap ? a : b });
    }
    rot = [rot[0], rot[n - 1], ...rot.slice(1, n - 1)];
  }
  if (doubleRound) {
    const first = [...out];
    for (const m of first) {
      out.push({ round: m.round + rounds, home: m.away, away: m.home });
    }
  }
  return out;
}

export interface PlayerSanction {
  playerId: string;
  player: Player;
  team: Team | undefined;
  isSanctioned: boolean;
  reason: string;
}

/** Calcula qué jugadores tienen sanción activa para el próximo partido. */
export function computeSanctions(db: DB): Map<string, PlayerSanction> {
  const teams = teamMap(db);
  const playedMatches = sortMatches(db.matches).filter(isPlayed);
  const sanctions = new Map<string, PlayerSanction>();

  for (const player of db.players) {
    // Partidos jugados por el equipo del jugador en orden cronológico
    const teamPlayedMatches = playedMatches.filter(
      (m) => m.homeTeamId === player.teamId || m.awayTeamId === player.teamId,
    );

    let yellowAccum = 0;
    let pendingBan = 0;
    let lastReason = "";

    for (let i = 0; i < teamPlayedMatches.length; i++) {
      const match = teamPlayedMatches[i];

      // Cumplimiento de sanción pendiente
      if (pendingBan > 0) {
        pendingBan--;
        if (pendingBan === 0) {
          lastReason = "";
        }
      }

      const eventsInMatch = match.events.filter((e) => e.playerId === player.id);
      const yellowsInMatch = eventsInMatch.filter((e) => e.type === "yellow").length;
      const redsInMatch = eventsInMatch.filter((e) => e.type === "red").length;

      // Tarjeta roja o doble amarilla
      if (redsInMatch > 0) {
        pendingBan = 1;
        lastReason = `Tarjeta roja en Jornada ${match.round}`;
      } else if (yellowsInMatch >= 2) {
        pendingBan = 1;
        lastReason = `Doble amarilla en Jornada ${match.round}`;
      }

      // Ciclo de tarjetas amarillas (3, 6, 9...)
      yellowAccum += yellowsInMatch;
      if (yellowAccum > 0 && yellowAccum % 3 === 0 && yellowsInMatch > 0) {
        const cycle = Math.floor(yellowAccum / 3);
        const banGames = cycle === 1 ? 1 : cycle === 2 ? 2 : 3;
        pendingBan = Math.max(pendingBan, banGames);
        lastReason = `Ciclo de ${yellowAccum} amarillas (${cycle}º ciclo)`;
      }
    }

    if (pendingBan > 0) {
      sanctions.set(player.id, {
        playerId: player.id,
        player,
        team: teams.get(player.teamId),
        isSanctioned: true,
        reason: lastReason || "Sancionado para el próximo partido",
      });
    }
  }

  return sanctions;
}

