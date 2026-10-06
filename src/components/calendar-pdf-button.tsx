"use client";

import { useState } from "react";
import { exportCalendarToPdf } from "@/lib/export-calendar-pdf";

interface TeamInfo {
  id: string;
  name: string;
}

interface MatchItem {
  id: string;
  round: number;
  date: string;
  time: string;
  homeTeamId: string;
  awayTeamId: string;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  competition?: string;
  stage?: string;
}

interface Props {
  matches: MatchItem[];
  teams: Record<string, TeamInfo>;
  settings: {
    name: string;
    season: string;
    location: string;
    defaultVenue?: string;
  };
}

export function CalendarPdfButton({ matches, teams, settings }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  function handleDownload(scope: "liga" | "copa" | "todas") {
    try {
      setIsGenerating(true);
      exportCalendarToPdf({ matches, teams, settings, scope });
      setShowOptions(false);
    } catch (err) {
      console.error("Error generando PDF:", err);
      alert("Hubo un error al generar el PDF. Por favor, inténtalo de nuevo.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowOptions(!showOptions)}
        className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 active:scale-95"
      >
        <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span>{isGenerating ? "Generando..." : "Descargar PDF"}</span>
        <svg className="h-3 w-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showOptions && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowOptions(false)}
          />
          <div className="absolute right-0 top-full mt-2 z-50 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-slate-400">
              Seleccionar competición
            </div>

            <button
              onClick={() => handleDownload("liga")}
              className="w-full text-left flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 transition"
            >
              <span>Liga Regular (18 J)</span>
              <span className="text-[10px] text-emerald-600 bg-emerald-100 font-extrabold px-1.5 py-0.5 rounded">PDF</span>
            </button>

            <button
              onClick={() => handleDownload("copa")}
              className="w-full text-left flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-amber-50 hover:text-amber-900 transition"
            >
              <span>Torneo de Copa</span>
              <span className="text-[10px] text-amber-600 bg-amber-100 font-extrabold px-1.5 py-0.5 rounded">PDF</span>
            </button>

            <button
              onClick={() => handleDownload("todas")}
              className="w-full text-left flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition"
            >
              <span>Todo (Liga + Copa)</span>
              <span className="text-[10px] text-slate-600 bg-slate-200 font-extrabold px-1.5 py-0.5 rounded">PDF</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
