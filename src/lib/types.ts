export type EventType = "goal" | "own_goal" | "yellow" | "red";

export type MatchStatus = "scheduled" | "played" | "postponed";

export interface Team {
  id: string;
  name: string;
  shortName: string;
  color: string;
  delegate: string;
}

export interface Player {
  id: string;
  teamId: string;
  name: string;
  number: number | null;
}

export interface MatchEvent {
  id: string;
  type: EventType;
  playerId: string;
  minute: number | null;
}

export interface Match {
  id: string;
  round: number;
  date: string; // YYYY-MM-DD o ""
  time: string; // HH:MM o ""
  venue: string;
  homeTeamId: string;
  awayTeamId: string;
  status: MatchStatus;
  homeScore: number | null;
  awayScore: number | null;
  referee: string;
  notes: string;
  events: MatchEvent[];
  competition?: "liga" | "copa";
  stage?: string;
}

export interface Settings {
  name: string;
  season: string;
  location: string;
  defaultVenue: string;
}

export interface DB {
  settings: Settings;
  teams: Team[];
  players: Player[];
  matches: Match[];
}

export const EVENT_LABELS: Record<EventType, string> = {
  goal: "Gol",
  own_goal: "Gol en propia",
  yellow: "Tarjeta amarilla",
  red: "Tarjeta roja",
};

export const STATUS_LABELS: Record<MatchStatus, string> = {
  scheduled: "Pendiente",
  played: "Finalizado",
  postponed: "Aplazado",
};
