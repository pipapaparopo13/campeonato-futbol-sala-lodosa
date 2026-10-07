"use client";

import { useState, useEffect } from "react";
import { voteMvp } from "@/app/actions";

interface PlayerInfo {
  id: string;
  name: string;
  number: number | null;
  teamId: string;
}

interface TeamInfo {
  id: string;
  name: string;
}

interface Props {
  matchId: string;
  matchStatus: string;
  matchDate: string;
  matchTime: string;
  finishedAt?: string;
  homeTeam?: TeamInfo;
  awayTeam?: TeamInfo;
  homePlayers: PlayerInfo[];
  awayPlayers: PlayerInfo[];
  mvpVotes?: Record<string, number>;
  manualMvpPlayerId?: string;
}

export function MatchMvpSection({
  matchId,
  matchStatus,
  matchDate,
  matchTime,
  finishedAt,
  homeTeam,
  awayTeam,
  homePlayers,
  awayPlayers,
  mvpVotes = {},
  manualMvpPlayerId,
}: Props) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [hasVoted, setHasVoted] = useState(false);
  const [timeLeftStr, setTimeLeftStr] = useState<string>("");
  const [isVotingOpen, setIsVotingOpen] = useState(false);
  const [isVotingExpired, setIsVotingExpired] = useState(false);

  // Mapa de jugadores
  const allPlayers = [...homePlayers, ...awayPlayers];
  const playerMap = new Map(allPlayers.map((p) => [p.id, p]));

  // Determinar MVP si ya ha votado la gente o si está cerrado
  let topMvpId: string | null = manualMvpPlayerId || null;
  let topMvpVotes = 0;

  if (!topMvpId && Object.keys(mvpVotes).length > 0) {
    for (const [pId, count] of Object.entries(mvpVotes)) {
      if (count > topMvpVotes) {
        topMvpVotes = count;
        topMvpId = pId;
      }
    }
  }

  const topMvpPlayer = topMvpId ? playerMap.get(topMvpId) : null;
  const topMvpTeam = topMvpPlayer
    ? topMvpPlayer.teamId === homeTeam?.id
      ? homeTeam?.name
      : awayTeam?.name
    : null;

  // Comprobar voto local
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`voted_mvp_${matchId}`);
      if (stored) {
        setHasVoted(true);
      }
    } catch {
      // Ignorar
    }
  }, [matchId]);

  // Temporizador de 30 minutos
  useEffect(() => {
    function calculateWindow() {
      if (matchStatus !== "played") {
        setIsVotingOpen(false);
        setIsVotingExpired(false);
        return;
      }

      let deadlineMs = 0;

      // Calcular fecha final según horario del partido (Opción B)
      const [year, month, day] = (matchDate || "").split("-").map(Number);
      const [hour, minute] = (matchTime || "").split(":").map(Number);

      if (year && month && day && !isNaN(hour) && !isNaN(minute)) {
        // Duración aproximada: 50 min de juego + 5 min descanso = 55 min tras la hora de inicio
        const matchEndTime = new Date(year, month - 1, day, hour, minute + 55, 0).getTime();
        deadlineMs = matchEndTime + 30 * 60 * 1000;
      } else if (finishedAt) {
        deadlineMs = new Date(finishedAt).getTime() + 30 * 60 * 1000;
      } else {
        // Si no tiene fecha, permitimos votar o damos un plazo por defecto
        deadlineMs = Date.now() + 30 * 60 * 1000;
      }

      const diff = deadlineMs - Date.now();

      if (diff <= 0) {
        setIsVotingOpen(false);
        setIsVotingExpired(true);
        setTimeLeftStr("00:00");
      } else {
        setIsVotingOpen(true);
        setIsVotingExpired(false);
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setTimeLeftStr(`${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`);
      }
    }

    calculateWindow();
    const interval = setInterval(calculateWindow, 1000);
    return () => clearInterval(interval);
  }, [matchStatus, matchDate, matchTime, finishedAt]);

  // Si el partido no se ha jugado todavía, no mostramos la sección
  if (matchStatus !== "played") {
    return null;
  }

  // Si la votación ha terminado (pasaron los 30 min) y hay un MVP
  if (isVotingExpired) {
    return (
      <div className="overflow-hidden rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 via-amber-100/60 to-yellow-50 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-2xl sm:text-3xl shadow-inner">
              ⭐
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-900">
                Votación Finalizada · Jugador del Partido
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                MVP: {topMvpPlayer ? topMvpPlayer.name : "Votación desierta"}
              </h3>
              {topMvpTeam && (
                <p className="text-xs font-bold text-amber-800">
                  {topMvpTeam} {topMvpVotes > 0 ? `(${topMvpVotes} votos de la afición)` : ""}
                </p>
              )}
            </div>
          </div>

          <div className="rounded-xl bg-white/80 px-3 py-1.5 text-xs font-bold text-amber-900 border border-amber-200 shadow-2xs">
            🏆 Elegido por la afición
          </div>
        </div>
      </div>
    );
  }

  // Si la votación está ABIERTA (dentro de los 30 minutos)
  return (
    <div className="rounded-2xl border border-emerald-300 bg-gradient-to-br from-emerald-50 via-teal-50 to-white p-5 sm:p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-200/80 pb-4 mb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold text-sm shadow-xs">
            ⭐
          </span>
          <div>
            <h3 className="font-extrabold text-base text-slate-900">
              Vota al MVP del Partido
            </h3>
            <p className="text-xs text-slate-500">
              Votación abierta para la afición (1 voto por persona)
            </p>
          </div>
        </div>

        {/* Cuenta atrás */}
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-1.5 border border-rose-200 text-rose-800 shadow-2xs">
          <span className="h-2 w-2 rounded-full bg-rose-600 animate-ping" />
          <span className="text-xs font-bold">Cierra en:</span>
          <span className="font-mono font-black text-sm">{timeLeftStr}</span>
        </div>
      </div>

      {hasVoted ? (
        <div className="space-y-4">
          <div className="rounded-xl bg-emerald-100/70 p-3.5 text-center text-xs font-bold text-emerald-900 border border-emerald-300">
            ✓ ¡Gracias! Tu voto ha sido registrado. Puedes ver la votación en tiempo real:
          </div>

          <div className="space-y-2">
            {allPlayers
              .filter((p) => (mvpVotes[p.id] ?? 0) > 0)
              .sort((a, b) => (mvpVotes[b.id] ?? 0) - (mvpVotes[a.id] ?? 0))
              .map((p) => {
                const votes = mvpVotes[p.id] ?? 0;
                const total = Object.values(mvpVotes).reduce((acc, v) => acc + v, 0) || 1;
                const pct = Math.round((votes / total) * 100);

                return (
                  <div key={p.id} className="rounded-xl bg-white p-2.5 border border-slate-200 shadow-2xs text-xs">
                    <div className="flex justify-between font-bold text-slate-800 mb-1">
                      <span>{p.name}</span>
                      <span className="font-mono">{votes} votos ({pct}%)</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      ) : (
        <form
          action={async (fd) => {
            if (!selectedPlayerId) return;
            try {
              localStorage.setItem(`voted_mvp_${matchId}`, selectedPlayerId);
              setHasVoted(true);
            } catch {
              // Ignorar
            }
            await voteMvp(fd);
          }}
          className="space-y-4"
        >
          <input type="hidden" name="matchId" value={matchId} />
          <input type="hidden" name="playerId" value={selectedPlayerId} />

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Jugadores Local */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 block">
                {homeTeam?.name || "Local"}:
              </span>
              <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                {homePlayers.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPlayerId(p.id)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center justify-between border ${
                      selectedPlayerId === p.id
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <span>{p.name}</span>
                    {selectedPlayerId === p.id && <span>✓</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Jugadores Visitante */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 block">
                {awayTeam?.name || "Visitante"}:
              </span>
              <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                {awayPlayers.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPlayerId(p.id)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center justify-between border ${
                      selectedPlayerId === p.id
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <span>{p.name}</span>
                    {selectedPlayerId === p.id && <span>✓</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={!selectedPlayerId}
            className={`w-full py-3 rounded-xl font-bold text-sm transition shadow-sm ${
              selectedPlayerId
                ? "bg-emerald-700 text-white hover:bg-emerald-800 active:scale-98 cursor-pointer"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            {selectedPlayerId
              ? `Confirmar voto para ${playerMap.get(selectedPlayerId)?.name}`
              : "Selecciona un jugador para votar"}
          </button>
        </form>
      )}
    </div>
  );
}
