"use client";

import { useMemo, useState } from "react";
import type { EventType, Match, Player, Team } from "@/lib/types";
import { extractActaData, saveActaReviewed } from "@/app/actions";
import { formatDate } from "@/lib/stats";
import type { ExtractedActaEvent } from "@/lib/ai-acta";
import { compressImage } from "@/lib/image-compress";
import { LiveControlPanel } from "./live-control-panel";

interface Props {
  matches: Match[];
  teams: Record<string, Team>;
  players: Player[];
}

interface EditableEvent {
  id: string; // id temporal para React key
  type: EventType;
  team: "home" | "away";
  playerId: string;
  minute: number | null;
}

export function MesaScanner({ matches, teams, players }: Props) {
  // 1. Agrupar jornadas disponibles
  const rounds = useMemo(() => {
    const list: { key: string; label: string; competition: string; round: number }[] = [];
    const seen = new Set<string>();

    for (const m of matches) {
      const comp = m.competition ?? "liga";
      const key = `${comp}-${m.round}`;
      if (!seen.has(key)) {
        seen.add(key);
        const label =
          comp === "copa"
            ? `Copa · Jornada ${m.round}`
            : `Liga · Jornada ${m.round}${m.date ? ` (${formatDate(m.date)})` : ""}`;
        list.push({ key, label, competition: comp, round: m.round });
      }
    }
    return list;
  }, [matches]);

  // Jornada con partidos pendientes por defecto
  const defaultRoundKey = useMemo(() => {
    const pending = matches.find((m) => m.status !== "played");
    if (pending) {
      return `${pending.competition ?? "liga"}-${pending.round}`;
    }
    return rounds[0]?.key || "liga-1";
  }, [matches, rounds]);

  const [selectedRoundKey, setSelectedRoundKey] = useState<string>(defaultRoundKey);

  // Partidos de la jornada seleccionada
  const roundMatches = useMemo(() => {
    const [comp, roundStr] = selectedRoundKey.split("-");
    const roundNum = Number(roundStr);
    return matches
      .filter((m) => (m.competition ?? "liga") === comp && m.round === roundNum)
      .sort((a, b) => (a.time || "").localeCompare(b.time || ""));
  }, [matches, selectedRoundKey]);

  // Partido seleccionado dentro de la jornada
  const [selectedMatchId, setSelectedMatchId] = useState<string>(() => {
    return roundMatches[0]?.id || "";
  });

  const selectedMatch = useMemo(() => {
    return matches.find((m) => m.id === selectedMatchId) || roundMatches[0];
  }, [matches, selectedMatchId, roundMatches]);

  // Jugadores del partido seleccionado
  const homeTeam = selectedMatch ? teams[selectedMatch.homeTeamId] : null;
  const awayTeam = selectedMatch ? teams[selectedMatch.awayTeamId] : null;

  const homePlayers = useMemo(() => {
    if (!homeTeam) return [];
    return players
      .filter((p) => p.teamId === homeTeam.id)
      .sort((a, b) => (a.number ?? 99) - (b.number ?? 99));
  }, [players, homeTeam]);

  const awayPlayers = useMemo(() => {
    if (!awayTeam) return [];
    return players
      .filter((p) => p.teamId === awayTeam.id)
      .sort((a, b) => (a.number ?? 99) - (b.number ?? 99));
  }, [players, awayTeam]);

  // Estado del archivo y lectura IA
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [extractError, setExtractError] = useState<string | null>(null);

  // Estado editable tras la lectura con IA
  const [hasExtractedData, setHasExtractedData] = useState<boolean>(false);
  const [editHomeScore, setEditHomeScore] = useState<number>(0);
  const [editAwayScore, setEditAwayScore] = useState<number>(0);
  const [editReferee, setEditReferee] = useState<string>("");
  const [editNotes, setEditNotes] = useState<string>("");
  const [editEvents, setEditEvents] = useState<EditableEvent[]>([]);
  const [aiProvider, setAiProvider] = useState<string>("");

  function resetFormForNewMatch() {
    setPreview(null);
    setSelectedFile(null);
    setHasExtractedData(false);
    setExtractError(null);
    setEditEvents([]);
  }

  function handleRoundChange(newKey: string) {
    setSelectedRoundKey(newKey);
    const [comp, roundStr] = newKey.split("-");
    const firstMatch = matches.find(
      (m) => (m.competition ?? "liga") === comp && m.round === Number(roundStr),
    );
    if (firstMatch) {
      setSelectedMatchId(firstMatch.id);
      resetFormForNewMatch();
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setPreview(null);
      setSelectedFile(null);
      return;
    }
    setExtractError(null);
    try {
      // Comprimir en el cliente para móviles (evita error 441 por tamaño excesivo)
      const compressed = await compressImage(file, 2048, 2048, 0.82);
      setSelectedFile(compressed);
      const reader = new FileReader();
      reader.onload = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(compressed);
    } catch {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  // Ejecutar extracción con IA
  async function handleExtractWithAI() {
    if (!selectedMatch || !selectedFile) return;

    setIsExtracting(true);
    setExtractError(null);

    try {
      // Re-comprimir por seguridad si supera 1MB
      let fileToSend = selectedFile;
      if (fileToSend.size > 1024 * 1024) {
        fileToSend = await compressImage(fileToSend, 1920, 1920, 0.75);
      }

      const fd = new FormData();
      fd.append("matchId", selectedMatch.id);
      fd.append("photo", fileToSend);

      const res = await extractActaData(fd);

      if (!res.ok) {
        setExtractError(res.error);
        return;
      }

      const d = res.data;
      setEditHomeScore(d.homeScore ?? 0);
      setEditAwayScore(d.awayScore ?? 0);
      setEditReferee(d.referee || "");
      setEditNotes(d.notes || "");
      setAiProvider(d.provider);

      // Convertir eventos a editables
      const converted: EditableEvent[] = (d.events || []).map((e: ExtractedActaEvent, idx: number) => ({
        id: `ev-${idx}-${Date.now()}`,
        type: e.type,
        team: e.team,
        playerId: e.playerId || (e.team === "away" ? awayPlayers[0]?.id : homePlayers[0]?.id) || "",
        minute: e.minute,
      }));

      setEditEvents(converted);
      setHasExtractedData(true);
    } catch (err: any) {
      console.error("Error al procesar acta:", err);
      const msg = err?.message || String(err);
      if (msg.includes("441") || msg.includes("Server Components")) {
        setExtractError(
          "La fotografía es demasiado pesada para el servidor. Intenta hacer la foto un poco más de cerca o recortar los bordes.",
        );
      } else {
        setExtractError(msg || "Error al procesar la fotografía.");
      }
    } finally {
      setIsExtracting(false);
    }
  }

  // Manejo de eventos manuales (añadir, editar, borrar)
  function handleAddEvent(type: EventType, team: "home" | "away") {
    const defaultPlayerId = team === "home" ? homePlayers[0]?.id : awayPlayers[0]?.id;
    setEditEvents((prev) => [
      ...prev,
      {
        id: `manual-${Date.now()}-${Math.random()}`,
        type,
        team,
        playerId: defaultPlayerId || "",
        minute: null,
      },
    ]);
  }

  function handleRemoveEvent(id: string) {
    setEditEvents((prev) => prev.filter((e) => e.id !== id));
  }

  function handleUpdateEvent(id: string, updates: Partial<EditableEvent>) {
    setEditEvents((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        const updated = { ...e, ...updates };
        // Si cambia el equipo, actualizar el jugador al primer jugador del nuevo equipo si no pertenece
        if (updates.team && updates.team !== e.team) {
          const newTeamList = updates.team === "home" ? homePlayers : awayPlayers;
          updated.playerId = newTeamList[0]?.id || "";
        }
        return updated;
      }),
    );
  }

  // Filtrar goles y tarjetas para visualización ordenada
  const goalEvents = editEvents.filter((e) => e.type === "goal" || e.type === "own_goal");
  const cardEvents = editEvents.filter((e) => e.type === "yellow" || e.type === "red");

  return (
    <div className="space-y-6">
      {/* 1. Selector de Jornada y Partido */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-extrabold text-slate-900 mb-1">
          1. Selecciona la jornada y el partido
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Elige qué encuentro se ha disputado para subir su acta física.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="roundSelect" className="label text-xs">
              Jornada del Campeonato
            </label>
            <select
              id="roundSelect"
              value={selectedRoundKey}
              onChange={(e) => handleRoundChange(e.target.value)}
              className="input text-sm font-semibold"
            >
              {rounds.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="matchSelect" className="label text-xs">
              Partido a registrar
            </label>
            <select
              id="matchSelect"
              value={selectedMatch?.id || ""}
              onChange={(e) => {
                setSelectedMatchId(e.target.value);
                resetFormForNewMatch();
              }}
              className="input text-sm font-semibold"
            >
              {roundMatches.map((m) => {
                const ht = teams[m.homeTeamId]?.name || "Local";
                const at = teams[m.awayTeamId]?.name || "Visitante";
                const hora = m.time ? `${m.time}h · ` : "";
                const estado =
                  m.status === "played"
                    ? `[Jugado: ${m.homeScore ?? 0} - ${m.awayScore ?? 0}]`
                    : "[Pendiente]";
                return (
                  <option key={m.id} value={m.id}>
                    {hora}
                    {ht} vs {at} {estado}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {/* Tarjeta del partido seleccionado */}
      {selectedMatch && homeTeam && awayTeam && (
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-white via-emerald-50/30 to-teal-50/20 p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-emerald-100 pb-3">
            <div className="text-xs font-semibold text-emerald-900">
              📅 {selectedMatch.date ? formatDate(selectedMatch.date) : "Fecha por definir"} · ⏰{" "}
              {selectedMatch.time || "15:30"} · 📍 {selectedMatch.venue}
            </div>
            {selectedMatch.status === "played" ? (
              <span className="rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-bold text-emerald-800">
                ✓ Ya tiene acta registrada ({selectedMatch.homeScore} - {selectedMatch.awayScore})
              </span>
            ) : (
              <span className="rounded-full bg-amber-100 px-3 py-0.5 text-xs font-bold text-amber-800">
                ⏳ Pendiente de acta oficial
              </span>
            )}
          </div>

          <div className="my-2 flex items-center justify-around gap-4 text-center">
            <div className="flex-1">
              <span
                className="inline-block h-4 w-4 rounded-full ring-2 ring-slate-200 mb-1"
                style={{ backgroundColor: homeTeam.color || "#047857" }}
              />
              <div className="text-sm font-black text-slate-900 sm:text-base">
                {homeTeam.name}
              </div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase">Local</div>
            </div>

            <div className="rounded-xl bg-slate-900 px-4 py-2 font-mono text-xl font-black text-white shadow-xs">
              {selectedMatch.status === "played"
                ? `${selectedMatch.homeScore ?? 0} - ${selectedMatch.awayScore ?? 0}`
                : "VS"}
            </div>

            <div className="flex-1">
              <span
                className="inline-block h-4 w-4 rounded-full ring-2 ring-slate-200 mb-1"
                style={{ backgroundColor: awayTeam.color || "#0369a1" }}
              />
              <div className="text-sm font-black text-slate-900 sm:text-base">
                {awayTeam.name}
              </div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase">Visitante</div>
            </div>
          </div>
        </div>
      )}

      {/* Control Rápido en Vivo durante el partido */}
      {selectedMatch && (
        <LiveControlPanel
          match={selectedMatch}
          home={homeTeam || undefined}
          away={awayTeam || undefined}
        />
      )}

      {/* 2. Subida de la foto del acta */}
      {selectedMatch && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-xl text-white shadow-xs">
              📷
            </span>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                2. Tomar foto del acta física en papel
              </h2>
              <p className="text-xs text-slate-500">
                Enfoca bien los dorsales, goles, minutos, tarjetas y firma del árbitro.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/70 p-6 text-center transition hover:bg-slate-100/60">
              <label className="flex cursor-pointer flex-col items-center gap-2">
                <span className="rounded-xl bg-white p-3 text-3xl shadow-sm ring-1 ring-slate-200">
                  📸
                </span>
                <span className="text-sm font-bold text-slate-800">
                  {selectedFile ? "Cambiar foto seleccionada" : "Hacer foto con el móvil o elegir archivo"}
                </span>
                <span className="text-xs text-slate-400">
                  (En el móvil abre la cámara trasera directamente)
                </span>
                <input
                  type="file"
                  name="photo"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  onChange={handleFileChange}
                />
              </label>
            </div>

            {preview && (
              <div className="mx-auto max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 p-2 shadow-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview}
                  alt="Vista previa del acta física"
                  className="max-h-72 w-full rounded-xl object-contain bg-white"
                />
                <div className="pt-2 text-center text-xs font-semibold text-emerald-400">
                  ✓ Foto lista para procesar
                </div>
              </div>
            )}

            {extractError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
                ⚠ {extractError}
              </div>
            )}

            <button
              type="button"
              onClick={handleExtractWithAI}
              disabled={!selectedFile || isExtracting}
              className="btn w-full py-3.5 text-base font-extrabold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40"
            >
              {isExtracting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Leyendo dorsales, goles, tarjetas y árbitro con IA...</span>
                </span>
              ) : (
                <span>✨ Analizar foto con IA</span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 3. Panel de revisión y edición manual antes de guardar */}
      {hasExtractedData && selectedMatch && homeTeam && awayTeam && (
        <div className="rounded-2xl border-2 border-emerald-400 bg-white p-6 shadow-md ring-4 ring-emerald-100">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg">📋</span>
                <h2 className="text-lg font-black text-slate-900">
                  3. Revisión de datos antes de publicar
                </h2>
              </div>
              <p className="text-xs text-slate-500">
                La IA ha rellenado los datos. Revisa que todo coincida con el acta física y edita cualquier campo si es necesario.
              </p>
            </div>
            <span className="rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
              ✓ Procesado con IA ({aiProvider === "gemini" ? "Gemini 2.5 Vision" : aiProvider})
            </span>
          </div>

          <form action={saveActaReviewed} className="space-y-6">
            <input type="hidden" name="matchId" value={selectedMatch.id} />
            <input type="hidden" name="redirectTo" value="/admin" />
            <input
              type="hidden"
              name="eventsJson"
              value={JSON.stringify(
                editEvents.map((e) => ({
                  type: e.type,
                  playerId: e.playerId,
                  minute: e.minute,
                })),
              )}
            />

            {/* Marcador final */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <label className="label text-xs font-bold uppercase tracking-wider text-slate-500">
                Marcador final del partido
              </label>
              <div className="mt-2 flex items-center justify-center gap-4">
                <div className="text-center">
                  <div className="text-xs font-bold text-slate-700 mb-1">{homeTeam.name}</div>
                  <input
                    type="number"
                    name="homeScore"
                    min={0}
                    value={editHomeScore}
                    onChange={(e) => setEditHomeScore(Number(e.target.value))}
                    required
                    className="input w-20 text-center text-2xl font-black"
                  />
                </div>
                <span className="text-2xl font-black text-slate-400">-</span>
                <div className="text-center">
                  <div className="text-xs font-bold text-slate-700 mb-1">{awayTeam.name}</div>
                  <input
                    type="number"
                    name="awayScore"
                    min={0}
                    value={editAwayScore}
                    onChange={(e) => setEditAwayScore(Number(e.target.value))}
                    required
                    className="input w-20 text-center text-2xl font-black"
                  />
                </div>
              </div>
            </div>

            {/* Árbitro */}
            <div>
              <label htmlFor="referee" className="label text-xs font-bold">
                Nombre del Árbitro
              </label>
              <input
                id="referee"
                name="referee"
                type="text"
                value={editReferee}
                onChange={(e) => setEditReferee(e.target.value)}
                placeholder="Nombre del árbitro del acta"
                className="input"
              />
            </div>

            {/* Goles y goleadores */}
            <div className="space-y-3 rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-slate-900">
                  ⚽ Goles registrados ({goalEvents.length})
                </h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleAddEvent("goal", "home")}
                    className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100 ring-1 ring-emerald-200"
                  >
                    + Gol {homeTeam.shortName || "Local"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddEvent("goal", "away")}
                    className="rounded-lg bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-800 hover:bg-sky-100 ring-1 ring-sky-200"
                  >
                    + Gol {awayTeam.shortName || "Visitante"}
                  </button>
                </div>
              </div>

              {goalEvents.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No hay goles anotados.</p>
              ) : (
                <div className="space-y-2">
                  {goalEvents.map((ev, index) => {
                    const currentTeamPlayers = ev.team === "home" ? homePlayers : awayPlayers;
                    return (
                      <div
                        key={ev.id}
                        className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5 shadow-2xs"
                      >
                        <span className="text-xs font-bold text-slate-400 w-5">
                          #{index + 1}
                        </span>

                        {/* Equipo */}
                        <select
                          value={ev.team}
                          onChange={(e) =>
                            handleUpdateEvent(ev.id, {
                              team: e.target.value as "home" | "away",
                            })
                          }
                          className="input w-28 py-1 text-xs font-bold"
                        >
                          <option value="home">{homeTeam.shortName || "Local"}</option>
                          <option value="away">{awayTeam.shortName || "Visitante"}</option>
                        </select>

                        {/* Jugador con dorsal */}
                        <select
                          value={ev.playerId}
                          onChange={(e) => handleUpdateEvent(ev.id, { playerId: e.target.value })}
                          className="input flex-1 min-w-[160px] py-1 text-xs font-semibold"
                        >
                          {currentTeamPlayers.map((p) => (
                            <option key={p.id} value={p.id}>
                              #{p.number ?? "-"} {p.name}
                            </option>
                          ))}
                        </select>

                        {/* Minuto */}
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] text-slate-400 font-semibold">Min</span>
                          <input
                            type="number"
                            min={1}
                            max={60}
                            value={ev.minute ?? ""}
                            onChange={(e) =>
                              handleUpdateEvent(ev.id, {
                                minute: e.target.value ? Number(e.target.value) : null,
                              })
                            }
                            placeholder="Min"
                            className="input w-16 py-1 text-center text-xs font-semibold"
                          />
                        </div>

                        {/* Eliminar gol */}
                        <button
                          type="button"
                          onClick={() => handleRemoveEvent(ev.id)}
                          className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          title="Eliminar gol"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Tarjetas amarillas y rojas */}
            <div className="space-y-3 rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-slate-900">
                  🟨 Tarjetas y Sanciones ({cardEvents.length})
                </h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleAddEvent("yellow", "home")}
                    className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 hover:bg-amber-100 ring-1 ring-amber-200"
                  >
                    + Amarilla
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddEvent("red", "home")}
                    className="rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-800 hover:bg-rose-100 ring-1 ring-rose-200"
                  >
                    + Roja
                  </button>
                </div>
              </div>

              {cardEvents.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No se han registrado tarjetas.</p>
              ) : (
                <div className="space-y-2">
                  {cardEvents.map((ev) => {
                    const currentTeamPlayers = ev.team === "home" ? homePlayers : awayPlayers;
                    return (
                      <div
                        key={ev.id}
                        className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5 shadow-2xs"
                      >
                        {/* Tipo de tarjeta */}
                        <select
                          value={ev.type}
                          onChange={(e) =>
                            handleUpdateEvent(ev.id, {
                              type: e.target.value as EventType,
                            })
                          }
                          className="input w-28 py-1 text-xs font-bold"
                        >
                          <option value="yellow">🟨 Amarilla</option>
                          <option value="red">🟥 Roja</option>
                        </select>

                        {/* Equipo */}
                        <select
                          value={ev.team}
                          onChange={(e) =>
                            handleUpdateEvent(ev.id, {
                              team: e.target.value as "home" | "away",
                            })
                          }
                          className="input w-28 py-1 text-xs font-bold"
                        >
                          <option value="home">{homeTeam.shortName || "Local"}</option>
                          <option value="away">{awayTeam.shortName || "Visitante"}</option>
                        </select>

                        {/* Jugador con dorsal */}
                        <select
                          value={ev.playerId}
                          onChange={(e) => handleUpdateEvent(ev.id, { playerId: e.target.value })}
                          className="input flex-1 min-w-[160px] py-1 text-xs font-semibold"
                        >
                          {currentTeamPlayers.map((p) => (
                            <option key={p.id} value={p.id}>
                              #{p.number ?? "-"} {p.name}
                            </option>
                          ))}
                        </select>

                        {/* Minuto */}
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] text-slate-400 font-semibold">Min</span>
                          <input
                            type="number"
                            min={1}
                            max={60}
                            value={ev.minute ?? ""}
                            onChange={(e) =>
                              handleUpdateEvent(ev.id, {
                                minute: e.target.value ? Number(e.target.value) : null,
                              })
                            }
                            placeholder="Min"
                            className="input w-16 py-1 text-center text-xs font-semibold"
                          />
                        </div>

                        {/* Eliminar tarjeta */}
                        <button
                          type="button"
                          onClick={() => handleRemoveEvent(ev.id)}
                          className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          title="Eliminar tarjeta"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Observaciones e incidencias */}
            <div>
              <label htmlFor="notes" className="label text-xs font-bold">
                Observaciones e Incidencias del Acta
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Incidencias o anotaciones disciplinarias escritas en el acta..."
                className="input"
              />
            </div>

            {/* Botón final para guardar */}
            <div className="pt-2">
              <button
                type="submit"
                className="btn w-full py-4 text-base font-black bg-emerald-600 hover:bg-emerald-700 shadow-md"
              >
                💾 Confirmar y Guardar Acta Oficial
              </button>
              <p className="mt-2 text-center text-xs text-slate-400">
                Al confirmar, se actualizará el resultado, los goleadores, la clasificación y el ciclo de sanciones.
              </p>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
