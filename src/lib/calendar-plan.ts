export interface CalendarEvent {
  date: string;
  type: "liga" | "copa" | "descanso";
  round?: number;
  title: string;
  subtitle?: string;
}

export const TOURNAMENT_BREAKS: { date: string; title: string; desc: string }[] = [
  {
    date: "2026-12-05",
    title: "Puente Constitución / Inmaculada",
    desc: "Fin de semana festivo del 5 de diciembre (sin partidos).",
  },
  {
    date: "2026-12-26",
    title: "Parón de Navidad",
    desc: "Fin de semana posterior al día de Navidad (sin partidos).",
  },
  {
    date: "2027-01-02",
    title: "Parón de Año Nuevo",
    desc: "Fin de semana de Año Nuevo y víspera de Reyes (sin partidos).",
  },
  {
    date: "2027-02-06",
    title: "Descanso de febrero",
    desc: "Jornada libre fijada del 6 de febrero.",
  },
  {
    date: "2027-03-27",
    title: "Semana Santa",
    desc: "Sábado Santo (sin partidos).",
  },
  {
    date: "2027-05-01",
    title: "Fiesta del Trabajo",
    desc: "Festivo nacional del 1 de mayo (sin partidos).",
  },
  {
    date: "2027-05-08",
    title: "Descanso de mayo",
    desc: "Jornada libre fijada del 8 de mayo.",
  },
];

export const CUP_ROUNDS: { round: number; date: string; title: string; desc: string }[] = [
  {
    round: 1,
    date: "2026-11-07",
    title: "Copa · Jornada 1",
    desc: "Grupos A y B (tras la Jornada 3 de Liga).",
  },
  {
    round: 2,
    date: "2026-12-12",
    title: "Copa · Jornada 2",
    desc: "Grupos A y B (tras la Jornada 6 y el puente de diciembre).",
  },
  {
    round: 3,
    date: "2027-01-23",
    title: "Copa · Jornada 3",
    desc: "Grupos A y B (tras la Jornada 9 de Liga).",
  },
  {
    round: 4,
    date: "2027-02-27",
    title: "Copa · Jornada 4",
    desc: "Grupos A y B (tras la Jornada 12 de Liga).",
  },
  {
    round: 5,
    date: "2027-04-03",
    title: "Copa · Jornada 5",
    desc: "Grupos A y B (tras la Jornada 15 de Liga y Semana Santa).",
  },
  {
    round: 6,
    date: "2027-05-15",
    title: "Copa · Semifinales y Gran Final",
    desc: "Semifinales y Gran Final en jornada única (Sábado 15 de mayo de 2027).",
  },
];
