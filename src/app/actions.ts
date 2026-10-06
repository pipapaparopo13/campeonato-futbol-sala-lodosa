"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  checkCredentials,
  createSession,
  destroySession,
  requireAdmin,
  requireEditorOrReferee,
} from "@/lib/auth";
import { analyzeActaImage, type ExtractedActa } from "@/lib/ai-acta";
import { getDB, mutate, newId } from "@/lib/db";
import { roundRobin } from "@/lib/stats";
import type { EventType, MatchStatus } from "@/lib/types";

// ---------- utilidades ----------

function str(fd: FormData, key: string, max = 200) {
  return String(fd.get(key) ?? "")
    .trim()
    .slice(0, max);
}

function intOrNull(fd: FormData, key: string) {
  const v = str(fd, key);
  if (v === "") return null;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function done(path: string, message?: string): never {
  revalidatePath("/", "layout");
  redirect(message ? `${path}?ok=${encodeURIComponent(message)}` : path);
}

const EVENT_TYPES: EventType[] = ["goal", "own_goal", "yellow", "red"];
const STATUSES: MatchStatus[] = ["scheduled", "in_progress", "played", "postponed"];

// ---------- sesión ----------

export async function login(fd: FormData) {
  const username = str(fd, "username", 50);
  const password = String(fd.get("password") ?? "");
  const session = checkCredentials(password, username);
  if (!session) {
    fail("/admin/login", "Credenciales incorrectas (comprueba usuario o contraseña).");
  }
  await createSession(session);
  redirect("/admin");
}

export async function logout() {
  await destroySession();
  revalidatePath("/", "layout");
  redirect("/");
}

// ---------- ajustes ----------

export async function updateSettings(fd: FormData) {
  await requireAdmin();
  const name = str(fd, "name");
  if (!name) fail("/admin/ajustes", "El nombre es obligatorio.");
  await mutate((db) => {
    db.settings = {
      name,
      season: str(fd, "season", 40),
      location: str(fd, "location"),
      defaultVenue: str(fd, "defaultVenue"),
    };
  });
  done("/admin/ajustes", "Ajustes guardados.");
}

// ---------- equipos ----------

export async function createTeam(fd: FormData) {
  await requireAdmin();
  const name = str(fd, "name", 80);
  if (!name) fail("/admin/equipos", "El nombre es obligatorio.");
  await mutate((db) => {
    db.teams.push({
      id: newId(),
      name,
      shortName: name.slice(0, 3).toUpperCase(),
      color: "#4b5563",
      delegate: "",
    });
  });
  done("/admin/equipos", "Equipo creado.");
}

export async function updateTeam(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const back = `/admin/equipos/${id}`;
  const name = str(fd, "name", 80);
  if (!name) fail(back, "El nombre es obligatorio.");
  const color = /^#[0-9a-fA-F]{6}$/.test(str(fd, "color"))
    ? str(fd, "color")
    : "#4b5563";
  await mutate((db) => {
    const t = db.teams.find((x) => x.id === id);
    if (!t) return;
    t.name = name;
    t.shortName = (str(fd, "shortName", 4) || name.slice(0, 3)).toUpperCase();
    t.color = color;
    t.delegate = str(fd, "delegate", 120);
  });
  done(back, "Equipo actualizado.");
}

export async function deleteTeam(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const err = await mutate((db) => {
    if (db.matches.some((m) => m.homeTeamId === id || m.awayTeamId === id)) {
      return "No se puede borrar: el equipo tiene partidos. Borra antes sus partidos.";
    }
    db.teams = db.teams.filter((t) => t.id !== id);
    db.players = db.players.filter((p) => p.teamId !== id);
    return null;
  });
  if (err) fail(`/admin/equipos/${id}`, err);
  done("/admin/equipos", "Equipo eliminado.");
}

// ---------- jugadores ----------

export async function addPlayer(fd: FormData) {
  await requireAdmin();
  const teamId = str(fd, "teamId");
  const back = `/admin/equipos/${teamId}`;
  const name = str(fd, "name", 80);
  if (!name) fail(back, "El nombre del jugador es obligatorio.");
  await mutate((db) => {
    if (!db.teams.some((t) => t.id === teamId)) return;
    db.players.push({ id: newId(), teamId, name, number: intOrNull(fd, "number") });
  });
  done(back, "Jugador añadido.");
}

export async function updatePlayer(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const teamId = str(fd, "teamId");
  const back = `/admin/equipos/${teamId}`;
  const name = str(fd, "name", 80);
  if (!name) fail(back, "El nombre del jugador es obligatorio.");
  await mutate((db) => {
    const p = db.players.find((x) => x.id === id);
    if (!p) return;
    p.name = name;
    p.number = intOrNull(fd, "number");
  });
  done(back, "Jugador actualizado.");
}

export async function deletePlayer(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const teamId = str(fd, "teamId");
  const back = `/admin/equipos/${teamId}`;
  const err = await mutate((db) => {
    if (db.matches.some((m) => m.events.some((e) => e.playerId === id))) {
      return "No se puede borrar: el jugador aparece en alguna acta (goles/tarjetas).";
    }
    db.players = db.players.filter((p) => p.id !== id);
    return null;
  });
  if (err) fail(back, err);
  done(back, "Jugador eliminado.");
}

export async function createMatch(fd: FormData) {
  await requireAdmin();
  const homeTeamId = str(fd, "homeTeamId");
  const awayTeamId = str(fd, "awayTeamId");
  if (!homeTeamId || !awayTeamId || homeTeamId === awayTeamId) {
    fail("/admin/partidos", "Debes seleccionar dos equipos diferentes.");
  }
  const id = newId();
  const competition = (str(fd, "competition") as "liga" | "copa") || "liga";
  const stage = str(fd, "stage") || undefined;

  await mutate((db) => {
    db.matches.push({
      id,
      round: intOrNull(fd, "round") ?? 1,
      date: str(fd, "date", 10),
      time: str(fd, "time", 5),
      venue: str(fd, "venue") || db.settings.defaultVenue || "Polideportivo Municipal de Lodosa",
      homeTeamId,
      awayTeamId,
      status: "scheduled",
      homeScore: null,
      awayScore: null,
      referee: "",
      notes: "",
      events: [],
      competition,
      stage,
    });
  });
  done("/admin/partidos", "¡Partido añadido correctamente al calendario!");
}

export async function generateFixtures(fd: FormData) {
  await requireAdmin();
  const doubleRound = fd.get("doubleRound") === "on";
  const replace = fd.get("replace") === "on";
  const err = await mutate((db) => {
    if (db.matches.length > 0 && !replace) {
      return "Ya hay partidos. Marca «Borrar los partidos existentes» para regenerar el calendario.";
    }
    if (db.teams.length < 2) return "Hacen falta al menos 2 equipos.";
    const fixtures = roundRobin(
      db.teams.map((t) => t.id),
      doubleRound,
    );
    db.matches = fixtures.map((f) => ({
      id: newId(),
      round: f.round,
      date: "",
      time: "",
      venue: db.settings.defaultVenue || "Polideportivo Municipal de Lodosa",
      homeTeamId: f.home,
      awayTeamId: f.away,
      status: "scheduled" as const,
      homeScore: null,
      awayScore: null,
      referee: "",
      notes: "",
      events: [],
      competition: "liga",
    }));
    return null;
  });
  if (err) fail("/admin/partidos", err);
  done("/admin/partidos", "Calendario generado.");
}

export async function updateMatch(fd: FormData) {
  await requireEditorOrReferee();
  const id = str(fd, "id");
  const back = `/admin/partidos/${id}`;
  const homeTeamId = str(fd, "homeTeamId");
  const awayTeamId = str(fd, "awayTeamId");
  if (homeTeamId === awayTeamId) fail(back, "Elige dos equipos distintos.");
  const statusRaw = str(fd, "status") as MatchStatus;
  const status = STATUSES.includes(statusRaw) ? statusRaw : "scheduled";
  let homeScore = intOrNull(fd, "homeScore");
  let awayScore = intOrNull(fd, "awayScore");
  if (status === "in_progress" && (homeScore === null || awayScore === null)) {
    homeScore = homeScore ?? 0;
    awayScore = awayScore ?? 0;
  }
  if (status === "played" && (homeScore === null || awayScore === null)) {
    fail(back, "Para marcar el partido como finalizado, introduce el resultado.");
  }
  const comp = str(fd, "competition") as "liga" | "copa";
  const stage = str(fd, "stage");

  await mutate((db) => {
    const m = db.matches.find((x) => x.id === id);
    if (!m) return;
    m.round = intOrNull(fd, "round") ?? m.round;
    m.date = str(fd, "date", 10);
    m.time = str(fd, "time", 5);
    m.venue = str(fd, "venue") || db.settings.defaultVenue || "Polideportivo Municipal de Lodosa";
    m.homeTeamId = homeTeamId;
    m.awayTeamId = awayTeamId;
    m.status = status;
    m.homeScore = homeScore;
    m.awayScore = awayScore;
    m.referee = str(fd, "referee", 120);
    m.notes = str(fd, "notes", 4000);
    if (comp === "liga" || comp === "copa") m.competition = comp;
    if (stage) m.stage = stage;
  });
  done(back, "Acta y datos del partido guardados.");
}

export async function deleteMatch(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  await mutate((db) => {
    db.matches = db.matches.filter((m) => m.id !== id);
  });
  done("/admin/partidos", "Partido eliminado.");
}

export async function addEvent(fd: FormData) {
  await requireEditorOrReferee();
  const matchId = str(fd, "matchId");
  const back = `/admin/partidos/${matchId}`;
  const type = str(fd, "type") as EventType;
  const playerId = str(fd, "playerId");
  if (!EVENT_TYPES.includes(type)) fail(back, "Tipo de evento no válido.");
  if (!playerId) fail(back, "Elige un jugador.");
  const minute = intOrNull(fd, "minute");
  const err = await mutate((db) => {
    const m = db.matches.find((x) => x.id === matchId);
    const p = db.players.find((x) => x.id === playerId);
    if (!m || !p) return "Partido o jugador no encontrado.";
    if (p.teamId !== m.homeTeamId && p.teamId !== m.awayTeamId) {
      return "Ese jugador no pertenece a ninguno de los dos equipos.";
    }
    m.events.push({ id: newId(), type, playerId, minute });
    // Si es un gol y el partido está en juego o finalizado, autoincrementar el marcador correspondiente
    if (type === "goal") {
      if (p.teamId === m.homeTeamId) {
        m.homeScore = (m.homeScore ?? 0) + 1;
      } else if (p.teamId === m.awayTeamId) {
        m.awayScore = (m.awayScore ?? 0) + 1;
      }
    } else if (type === "own_goal") {
      // Autogol suma al rival
      if (p.teamId === m.homeTeamId) {
        m.awayScore = (m.awayScore ?? 0) + 1;
      } else if (p.teamId === m.awayTeamId) {
        m.homeScore = (m.homeScore ?? 0) + 1;
      }
    }
    return null;
  });
  if (err) fail(back, err);
  done(back);
}

// Acción rápida para Mesa y Admin: marcar en directo / actualizar marcador / finalizar
export async function quickLiveUpdate(fd: FormData) {
  await requireEditorOrReferee();
  const matchId = str(fd, "matchId");
  const actionType = str(fd, "actionType"); // "start_live" | "score_delta" | "set_status"
  const side = str(fd, "side") as "home" | "away";
  const rawDelta = Number.parseInt(str(fd, "delta"), 10);
  const delta = Number.isFinite(rawDelta) ? rawDelta : 1;
  const newStatus = str(fd, "newStatus") as MatchStatus;
  const back = str(fd, "redirectTo") || `/admin/partidos/${matchId}`;

  const err = await mutate((db) => {
    const m = db.matches.find((x) => x.id === matchId);
    if (!m) return "Partido no encontrado.";

    if (actionType === "start_live") {
      m.status = "in_progress";
      if (m.homeScore === null) m.homeScore = 0;
      if (m.awayScore === null) m.awayScore = 0;
    } else if (actionType === "score_delta") {
      if (m.status === "scheduled") m.status = "in_progress";
      if (side === "home") {
        m.homeScore = Math.max(0, (m.homeScore ?? 0) + delta);
      } else if (side === "away") {
        m.awayScore = Math.max(0, (m.awayScore ?? 0) + delta);
      }
    } else if (actionType === "set_status") {
      if (STATUSES.includes(newStatus)) {
        m.status = newStatus;
        if (newStatus === "in_progress") {
          if (m.homeScore === null) m.homeScore = 0;
          if (m.awayScore === null) m.awayScore = 0;
        }
      }
    }

    return null;
  });

  if (err) fail(back, err);
  done(back);
}

export async function deleteEvent(fd: FormData) {
  await requireEditorOrReferee();
  const matchId = str(fd, "matchId");
  const eventId = str(fd, "eventId");
  const back = str(fd, "redirectTo") || `/admin/partidos/${matchId}`;
  await mutate((db) => {
    const m = db.matches.find((x) => x.id === matchId);
    if (!m) return;
    const ev = m.events.find((e) => e.id === eventId);
    if (ev) {
      const p = db.players.find((x) => x.id === ev.playerId);
      if (p) {
        if (ev.type === "goal") {
          if (p.teamId === m.homeTeamId) {
            m.homeScore = Math.max(0, (m.homeScore ?? 0) - 1);
          } else if (p.teamId === m.awayTeamId) {
            m.awayScore = Math.max(0, (m.awayScore ?? 0) - 1);
          }
        } else if (ev.type === "own_goal") {
          if (p.teamId === m.homeTeamId) {
            m.awayScore = Math.max(0, (m.awayScore ?? 0) - 1);
          } else if (p.teamId === m.awayTeamId) {
            m.homeScore = Math.max(0, (m.homeScore ?? 0) - 1);
          }
        }
      }
      m.events = m.events.filter((e) => e.id !== eventId);
    }
  });
  done(back);
}

// ---------- copa ----------

export async function drawCup(fd: FormData) {
  await requireAdmin();
  const CUP_DATES: Record<number, string> = {
    1: "2026-11-07",
    2: "2026-12-12",
    3: "2027-01-23",
    4: "2027-02-27",
    5: "2027-04-03",
  };
  const CUP_HOURS = ["16:00", "17:00", "18:00", "19:00"];

  const err = await mutate((db) => {
    if (db.teams.length < 10) {
      return "Hacen falta los 10 equipos para sortear los 2 grupos de 5.";
    }
    // Si ya hay partidos de copa
    if (db.matches.some((m) => m.competition === "copa")) {
      return "Ya hay un sorteo de Copa realizado. Si quieres repetirlo, reinicia la copa primero.";
    }

    // Mezclar aleatoriamente los 10 equipos
    const shuffled = [...db.teams].sort(() => Math.random() - 0.5);
    const groupA = shuffled.slice(0, 5);
    const groupB = shuffled.slice(5, 10);

    const fixturesA = roundRobin(
      groupA.map((t) => t.id),
      false,
    );
    const fixturesB = roundRobin(
      groupB.map((t) => t.id),
      false,
    );

    const newMatches: typeof db.matches = [];

    for (let r = 1; r <= 5; r++) {
      const mA = fixturesA.filter((f) => f.round === r);
      const mB = fixturesB.filter((f) => f.round === r);
      const date = CUP_DATES[r] || "";

      // 2 partidos Grupo A
      mA.forEach((f, idx) => {
        newMatches.push({
          id: newId(),
          round: r,
          date,
          time: CUP_HOURS[idx],
          venue: db.settings.defaultVenue,
          homeTeamId: f.home,
          awayTeamId: f.away,
          status: "scheduled",
          homeScore: null,
          awayScore: null,
          referee: "",
          notes: "",
          events: [],
          competition: "copa",
          stage: "Grupo A",
        });
      });

      // 2 partidos Grupo B
      mB.forEach((f, idx) => {
        newMatches.push({
          id: newId(),
          round: r,
          date,
          time: CUP_HOURS[idx + 2],
          venue: db.settings.defaultVenue,
          homeTeamId: f.home,
          awayTeamId: f.away,
          status: "scheduled",
          homeScore: null,
          awayScore: null,
          referee: "",
          notes: "",
          events: [],
          competition: "copa",
          stage: "Grupo B",
        });
      });
    }

    db.matches.push(...newMatches);
    return null;
  });

  if (err) fail("/admin/partidos", err);
  done("/admin/partidos", "¡Sorteo de Copa realizado con éxito! 2 grupos de 5 equipos generados.");
}

export async function resetCup() {
  await requireAdmin();
  await mutate((db) => {
    db.matches = db.matches.filter((m) => m.competition !== "copa");
  });
  done("/admin/partidos", "Copa reiniciada. Puedes volver a realizar el sorteo.");
}

// ---------- escaneo y extracción con ia ----------

export async function extractActaData(fd: FormData): Promise<
  | { ok: true; data: ExtractedActa }
  | { ok: false; error: string }
> {
  await requireEditorOrReferee();
  const matchId = str(fd, "matchId");
  const file = fd.get("photo") as File | null;

  if (!file || file.size === 0) {
    return { ok: false, error: "Por favor, selecciona o haz una fotografía del acta." };
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const base64Data = buffer.toString("base64");
  const mimeType = file.type || "image/jpeg";

  const db = await getDB();
  const match = db.matches.find((m) => m.id === matchId);
  if (!match) return { ok: false, error: "Partido no encontrado." };

  const homeTeam = db.teams.find((t) => t.id === match.homeTeamId);
  const awayTeam = db.teams.find((t) => t.id === match.awayTeamId);
  if (!homeTeam || !awayTeam) return { ok: false, error: "Equipos no encontrados." };

  const homePlayers = db.players.filter((p) => p.teamId === homeTeam.id);
  const awayPlayers = db.players.filter((p) => p.teamId === awayTeam.id);

  try {
    const extracted = await analyzeActaImage({
      base64Data,
      mimeType,
      homeTeam,
      awayTeam,
      homePlayers,
      awayPlayers,
    });
    return { ok: true, data: extracted };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Error al analizar el acta con IA." };
  }
}

export async function saveActaReviewed(fd: FormData) {
  await requireEditorOrReferee();
  const matchId = str(fd, "matchId");
  const back = str(fd, "redirectTo") || "/admin";

  const homeScore = intOrNull(fd, "homeScore");
  const awayScore = intOrNull(fd, "awayScore");
  const referee = str(fd, "referee", 150);
  const notes = str(fd, "notes", 1500);
  const eventsRaw = str(fd, "eventsJson", 20000);

  let events: { type: EventType; playerId: string; minute: number | null }[] = [];
  try {
    if (eventsRaw) {
      events = JSON.parse(eventsRaw);
    }
  } catch {
    events = [];
  }

  const err = await mutate((db) => {
    const match = db.matches.find((m) => m.id === matchId);
    if (!match) return "Partido no encontrado.";

    match.status = "played";
    match.homeScore = homeScore ?? 0;
    match.awayScore = awayScore ?? 0;
    match.referee = referee;
    match.notes = notes;
    match.events = events
      .filter((e) => e.playerId && EVENT_TYPES.includes(e.type))
      .map((e) => ({
        id: newId(),
        type: e.type,
        playerId: e.playerId,
        minute: typeof e.minute === "number" ? e.minute : null,
      }));

    return null;
  });

  if (err) fail(back, err);
  done(back, "¡Acta confirmada y registrada con éxito!");
}

export async function scanActaPhoto(fd: FormData) {
  await requireEditorOrReferee();
  const matchId = str(fd, "matchId");
  const back = str(fd, "redirectTo") || `/admin/partidos/${matchId}`;
  const file = fd.get("photo") as File | null;

  if (!file || file.size === 0) {
    fail(back, "Por favor, selecciona o haz una fotografía del acta.");
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const base64Data = buffer.toString("base64");
  const mimeType = file.type || "image/jpeg";

  const err = await mutate(async (db) => {
    const match = db.matches.find((m) => m.id === matchId);
    if (!match) return "Partido no encontrado.";

    const homeTeam = db.teams.find((t) => t.id === match.homeTeamId);
    const awayTeam = db.teams.find((t) => t.id === match.awayTeamId);
    if (!homeTeam || !awayTeam) return "Equipos no encontrados.";

    const homePlayers = db.players.filter((p) => p.teamId === homeTeam.id);
    const awayPlayers = db.players.filter((p) => p.teamId === awayTeam.id);

    const extracted = await analyzeActaImage({
      base64Data,
      mimeType,
      homeTeam,
      awayTeam,
      homePlayers,
      awayPlayers,
    });

    match.status = "played";
    if (extracted.homeScore !== null) match.homeScore = extracted.homeScore;
    if (extracted.awayScore !== null) match.awayScore = extracted.awayScore;
    if (extracted.referee) match.referee = extracted.referee;
    if (extracted.notes) {
      match.notes = match.notes
        ? `${match.notes}\n[IA]: ${extracted.notes}`
        : extracted.notes;
    }

    // Rellenar o añadir eventos extraídos por la IA
    if (extracted.events.length > 0) {
      match.events = extracted.events.map((e) => ({
        id: newId(),
        type: e.type,
        playerId: e.playerId,
        minute: e.minute,
      }));
    }

    return null;
  });

  if (err) fail(back, err);
  done(
    back,
    "¡Acta analizada con IA! Marcador, goleadores, minutos y tarjetas rellenados automáticamente.",
  );
}


