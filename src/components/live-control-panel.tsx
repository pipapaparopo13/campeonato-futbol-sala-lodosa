"use client";

import { useState, useTransition } from "react";
import type { EventType, Match, Player, Team } from "@/lib/types";
import { EVENT_LABELS } from "@/lib/types";
import { addEvent, deleteEvent, quickLiveUpdate } from "@/app/actions";

interface Props {
  match: Match;
  home: Team | undefined;
  away: Team | undefined;
  players: Player[];
  redirectTo?: string;
}

export function LiveControlPanel({ match, home, away, players, redirectTo }: Props) {
  const [isPending, startTransition] = useTransition();

  // Modal / selector rápido para añadir eventos (gol, tarjeta)
  const [activeModal, setActiveModal] = useState<"goal" | "card" | null>(null);
  const [selectedSide, setSelectedSide] = useState<"home" | "away">("home");
  const [selectedEventType, setSelectedEventType] = useState<EventType>("goal");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [eventMinute, setEventMinute] = useState<string>("");

  const inProgress = match.status === "in_progress";
  const homeScore = match.homeScore ?? 0;
  const awayScore = match.awayScore ?? 0;

  // Filtrar jugadores por equipo
  const homePlayers = players.filter((p) => p.teamId === home?.id);
  const awayPlayers = players.filter((p) => p.teamId === away?.id);
  const activeTeamPlayers = selectedSide === "home" ? homePlayers : awayPlayers;

  // Jugadores del partido como mapa rápido
  const playerMap = new Map(players.map((p) => [p.id, p]));

  function handleScoreDelta(side: "home" | "away", delta: number) {
    const fd = new FormData();
    fd.append("matchId", match.id);
    fd.append("actionType", "score_delta");
    fd.append("side", side);
    fd.append("delta", delta.toString());
    if (redirectTo) fd.append("redirectTo", redirectTo);
    startTransition(() => {
      quickLiveUpdate(fd);
    });
  }

  function handleSetStatus(newStatus: "in_progress" | "played" | "scheduled") {
    const fd = new FormData();
    fd.append("matchId", match.id);
    fd.append("actionType", "set_status");
    fd.append("newStatus", newStatus);
    if (redirectTo) fd.append("redirectTo", redirectTo);
    startTransition(() => {
      quickLiveUpdate(fd);
    });
  }

  function openAddGoal(side: "home" | "away") {
    setSelectedSide(side);
    setSelectedEventType("goal");
    const teamPlayers = side === "home" ? homePlayers : awayPlayers;
    setSelectedPlayerId(teamPlayers[0]?.id || "");
    setEventMinute("");
    setActiveModal("goal");
  }

  function openAddCard(side: "home" | "away") {
    setSelectedSide(side);
    setSelectedEventType("yellow");
    const teamPlayers = side === "home" ? homePlayers : awayPlayers;
    setSelectedPlayerId(teamPlayers[0]?.id || "");
    setEventMinute("");
    setActiveModal("card");
  }

  function handleSaveEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPlayerId) return;

    const fd = new FormData();
    fd.append("matchId", match.id);
    fd.append("type", selectedEventType);
    fd.append("playerId", selectedPlayerId);
    if (eventMinute) fd.append("minute", eventMinute);
    if (redirectTo) fd.append("redirectTo", redirectTo);

    startTransition(() => {
      addEvent(fd);
      setActiveModal(null);
    });
  }

  function handleDeleteEvent(eventId: string) {
    const fd = new FormData();
    fd.append("matchId", match.id);
    fd.append("eventId", eventId);
    if (redirectTo) fd.append("redirectTo", redirectTo);

    startTransition(() => {
      deleteEvent(fd);
    });
  }

  const matchEvents = match.events || [];
  const goalsList = matchEvents.filter((e) => e.type === "goal" || e.type === "own_goal");
  const cardsList = matchEvents.filter((e) => e.type === "yellow" || e.type === "red");

  return (
    <div className="rounded-2xl border-2 border-rose-300 bg-gradient-to-br from-rose-50/80 via-white to-amber-50/50 p-4 sm:p-5 shadow-sm space-y-4">
      {/* 1. Cabecera y controles de emisión */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rose-100 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-600 text-lg text-white shadow-xs">
            ⏱️
          </span>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <span>Control y Marcador en Vivo</span>
              {inProgress && (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-black uppercase text-white animate-pulse">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  EMITIENDO EN VIVO
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-600">
              Registra goles, goleadores y tarjetas en tiempo real durante el encuentro.
            </p>
          </div>
        </div>

        {/* Botones de estado: Iniciar directo, Pausar o Finalizar */}
        <div className="flex items-center gap-2">
          {!inProgress ? (
            <button
              onClick={() => handleSetStatus("in_progress")}
              disabled={isPending}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-rose-700 active:scale-95 disabled:opacity-50"
            >
              <span>🔴</span>
              <span>Poner EN VIVO</span>
            </button>
          ) : (
            <>
              <button
                onClick={() => handleSetStatus("played")}
                disabled={isPending}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
              >
                <span>🏁</span>
                <span>Finalizar partido</span>
              </button>
              <button
                onClick={() => handleSetStatus("scheduled")}
                disabled={isPending}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Pausar
              </button>
            </>
          )}
        </div>
      </div>

      {/* 2. Marcador táctil interactivo */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6 py-2">
        {/* Local */}
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="text-xs font-bold text-slate-700 truncate max-w-[130px] sm:max-w-[180px]">
            {home?.name || "Local"}
          </span>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => handleScoreDelta("home", -1)}
              disabled={isPending || homeScore <= 0}
              title="Restar gol"
              className="h-9 w-9 rounded-xl border border-slate-300 bg-white text-base font-bold text-slate-700 shadow-xs transition hover:bg-slate-100 active:scale-90 disabled:opacity-30"
            >
              -
            </button>
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 font-mono text-3xl font-black text-white shadow-md">
              {homeScore}
            </div>
            <button
              onClick={() => handleScoreDelta("home", 1)}
              disabled={isPending}
              title="Sumar gol"
              className="h-10 w-10 rounded-xl bg-emerald-600 text-lg font-black text-white shadow-md transition hover:bg-emerald-700 active:scale-90 disabled:opacity-50"
            >
              +1
            </button>
          </div>

          {/* Botones de acción rápida para equipo local */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 mt-1">
            <button
              onClick={() => openAddGoal("home")}
              disabled={isPending}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-900 hover:bg-emerald-200 active:scale-95 transition"
            >
              <span>⚽</span>
              <span>+ Anotar Gol</span>
            </button>
            <button
              onClick={() => openAddCard("home")}
              disabled={isPending}
              className="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2 py-1 text-[11px] font-bold text-amber-900 hover:bg-amber-200 active:scale-95 transition"
            >
              <span>🟨</span>
              <span>+ Tarjeta</span>
            </button>
          </div>
        </div>

        {/* VS / Divisor */}
        <div className="flex flex-col items-center">
          <span className="font-mono text-2xl font-black text-slate-400">:</span>
        </div>

        {/* Visitante */}
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="text-xs font-bold text-slate-700 truncate max-w-[130px] sm:max-w-[180px]">
            {away?.name || "Visitante"}
          </span>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => handleScoreDelta("away", 1)}
              disabled={isPending}
              title="Sumar gol"
              className="h-10 w-10 rounded-xl bg-emerald-600 text-lg font-black text-white shadow-md transition hover:bg-emerald-700 active:scale-90 disabled:opacity-50"
            >
              +1
            </button>
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 font-mono text-3xl font-black text-white shadow-md">
              {awayScore}
            </div>
            <button
              onClick={() => handleScoreDelta("away", -1)}
              disabled={isPending || awayScore <= 0}
              title="Restar gol"
              className="h-9 w-9 rounded-xl border border-slate-300 bg-white text-base font-bold text-slate-700 shadow-xs transition hover:bg-slate-100 active:scale-90 disabled:opacity-30"
            >
              -
            </button>
          </div>

          {/* Botones de acción rápida para equipo visitante */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 mt-1">
            <button
              onClick={() => openAddGoal("away")}
              disabled={isPending}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-900 hover:bg-emerald-200 active:scale-95 transition"
            >
              <span>⚽</span>
              <span>+ Anotar Gol</span>
            </button>
            <button
              onClick={() => openAddCard("away")}
              disabled={isPending}
              className="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2 py-1 text-[11px] font-bold text-amber-900 hover:bg-amber-200 active:scale-95 transition"
            >
              <span>🟨</span>
              <span>+ Tarjeta</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Eventos en vivo registrados durante el partido */}
      {(goalsList.length > 0 || cardsList.length > 0) && (
        <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 border-b border-slate-100 pb-1.5">
            <span>Incidencias en vivo ({matchEvents.length})</span>
            <span className="text-[10px] text-slate-400 font-normal">
              Pulsa ✕ para borrar si hubo equivocación
            </span>
          </div>

          <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
            {matchEvents.map((ev) => {
              const p = playerMap.get(ev.playerId);
              const isHomePlayer = p?.teamId === home?.id;
              const teamName = isHomePlayer ? home?.name : away?.name;

              return (
                <div key={ev.id} className="flex items-center justify-between py-1.5 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base leading-none">
                      {ev.type === "goal"
                        ? "⚽"
                        : ev.type === "own_goal"
                          ? "⚽ [PP]"
                          : ev.type === "red"
                            ? "🟥"
                            : "🟨"}
                    </span>
                    <span className="font-bold text-slate-900 truncate">
                      {p?.number != null ? `#${p.number} ` : ""}
                      {p?.name || "Jugador"}
                    </span>
                    <span className="text-[10px] text-slate-500 truncate">({teamName})</span>
                    {ev.minute != null && (
                      <span className="rounded bg-slate-100 px-1 py-0.2 font-mono text-[10px] text-slate-600">
                        {ev.minute}&apos;
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteEvent(ev.id)}
                    disabled={isPending}
                    className="ml-2 text-slate-400 hover:text-rose-600 font-bold p-1 text-xs"
                    title="Borrar incidencia"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal para Seleccionar Jugador y Minuto */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs"
            onClick={() => setActiveModal(null)}
          />

          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                <span>{activeModal === "goal" ? "⚽ Anotar Gol" : "🟨 Tarjeta / Sanción"}</span>
                <span className="text-slate-400 font-normal">·</span>
                <span className="text-emerald-700">
                  {selectedSide === "home" ? home?.name : away?.name}
                </span>
              </h4>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="space-y-3.5">
              {/* Tipo de evento */}
              <div>
                <label className="label text-xs">Tipo de incidencia</label>
                <select
                  value={selectedEventType}
                  onChange={(e) => setSelectedEventType(e.target.value as EventType)}
                  className="input text-xs font-semibold"
                >
                  {activeModal === "goal" ? (
                    <>
                      <option value="goal">⚽ Gol a favor</option>
                      <option value="own_goal">⚽ Gol en propia puerta (PP)</option>
                    </>
                  ) : (
                    <>
                      <option value="yellow">🟨 Tarjeta Amarilla</option>
                      <option value="red">🟥 Tarjeta Roja</option>
                    </>
                  )}
                </select>
              </div>

              {/* Selector de Jugador */}
              <div>
                <label className="label text-xs">Jugador de la plantilla</label>
                <select
                  value={selectedPlayerId}
                  onChange={(e) => setSelectedPlayerId(e.target.value)}
                  required
                  className="input text-xs font-semibold"
                >
                  {activeTeamPlayers.length === 0 ? (
                    <option value="">Sin jugadores registrados en este equipo</option>
                  ) : (
                    activeTeamPlayers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.number != null ? `#${p.number} ` : ""}
                        {p.name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Minuto (opcional) */}
              <div>
                <label className="label text-xs">Minuto de juego (opcional)</label>
                <input
                  type="number"
                  min={0}
                  max={60}
                  placeholder="Ej: 14"
                  value={eventMinute}
                  onChange={(e) => setEventMinute(e.target.value)}
                  className="input text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending || !selectedPlayerId}
                  className="rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
                >
                  {isPending ? "Guardando..." : "Confirmar y Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
