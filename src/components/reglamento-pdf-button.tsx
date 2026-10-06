"use client";

import { useState } from "react";
import { exportReglamentoToPdf } from "@/lib/export-reglamento-pdf";

interface Props {
  articles: string[];
  settings: {
    name: string;
    season: string;
    location: string;
    defaultVenue?: string;
  };
}

export function ReglamentoPdfButton({ articles, settings }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);

  function handleDownload() {
    try {
      setIsGenerating(true);
      exportReglamentoToPdf({ articles, settings });
    } catch (err) {
      console.error("Error al exportar reglamento en PDF:", err);
      alert("Hubo un error al generar el PDF. Inténtalo de nuevo.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={isGenerating}
      className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 active:scale-95 disabled:opacity-50"
    >
      <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <span>{isGenerating ? "Generando documento..." : "Descargar Reglamento en PDF"}</span>
    </button>
  );
}
