"use client";

import { useTransition } from "react";
import type { Match, Team } from "@/lib/types";
import { quickLiveUpdate } from "@/app/actions";

interface Props {
  match: Match;
  home: Team | undefined;
  away: Team | undefined;
}

export function LiveControlPanel({ match, home, away }: Props) {
  const [isPending, startTransition] = useTransition();

  const inProgress = match.status === "in_progress";
  const homeScore = match.homeScore ?? 0;
  const awayScore = match.awayScore ?? 0;

  function handleScoreDelta(side: "home" | "away", delta: number) {
    const fd = new FormData();
    fd.append("matchId", match.id);
    fd.append("actionType", "score_delta");
    fd.append("side", side);
    fd.append("delta", delta.toString());
    startTransition(() => {
      quickLiveUpdate(fd);
    });
  }

  function handleSetStatus(newStatus: "in_progress" | "played" | "scheduled") {
    const fd = new FormData();
    fd.append("matchId", match.id);
    fd.append("actionType", "set_status");
    fd.append("newStatus", newStatus);
    startTransition(() => {
      quickLiveUpdate(fd);
    });
  }

  return (
    <div className="rounded-2xl border-2 border-rose-300 bg-gradient-to-br from-rose-50/80 via-white to-amber-50/50 p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rose-100 pb-3 mb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-600 text-lg text-white shadow-xs">
            ⏱️
          </span>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <span>Control Rápido en Vivo</span>
              {inProgress && (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-black uppercase text-white animate-pulse">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  EMITIENDO EN VIVO
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-600">
              Suma o resta goles con un toque. Los aficionados verán el marcador actualizado en tiempo real.
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

      {/* Marcador grande interactivo */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 py-2">
        {/* Local */}
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="text-xs font-bold text-slate-700 truncate max-w-[140px]">
            {home?.name || "Local"}
          </span>
          <div className="flex items-center gap-2">
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
          <span className="text-[11px] text-slate-500 font-medium">Gol Local</span>
        </div>

        {/* VS / Divisor */}
        <div className="flex flex-col items-center">
          <span className="font-mono text-2xl font-black text-slate-400">:</span>
        </div>

        {/* Visitante */}
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="text-xs font-bold text-slate-700 truncate max-w-[140px]">
            {away?.name || "Visitante"}
          </span>
          <div className="flex items-center gap-2">
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
          <span className="text-[11px] text-slate-500 font-medium">Gol Visitante</span>
        </div>
      </div>
    </div>
  );
}
