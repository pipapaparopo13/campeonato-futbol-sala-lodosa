"use client";

import { useState } from "react";

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
  const [isOpen, setIsOpen] = useState(false);
  const [filterComp, setFilterComp] = useState<"todas" | "liga" | "copa">("todas");

  const filteredMatches = matches.filter((m) => {
    if (filterComp === "liga") return (m.competition ?? "liga") === "liga";
    if (filterComp === "copa") return m.competition === "copa";
    return true;
  });

  // Agrupar partidos por competición y jornada
  const roundsMap = new Map<string, MatchItem[]>();
  for (const m of filteredMatches) {
    const key = `${m.competition ?? "liga"}-${m.round}`;
    roundsMap.set(key, [...(roundsMap.get(key) ?? []), m]);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 active:scale-95"
      >
        <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span>Exportar Calendario PDF</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-2 sm:p-4 backdrop-blur-sm print:p-0 print:bg-white print:static print:z-auto">
          {/* Modal Container */}
          <div className="flex max-h-[96vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden print:max-h-none print:w-full print:max-w-none print:rounded-none print:shadow-none print:border-none">
            
            {/* Cabecera del modal (oculta al imprimir) */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3.5 print:hidden">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-700 text-white font-black text-sm">
                  PDF
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Vista previa de Impresión / Guardar PDF
                  </h3>
                  <p className="text-xs text-slate-500">
                    Formato oficial optimizado con escudo oficial para imprimir o guardar
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1 bg-slate-200/80 p-1 rounded-lg text-xs font-semibold">
                  <button
                    onClick={() => setFilterComp("todas")}
                    className={`px-2.5 py-1 rounded-md transition ${filterComp === "todas" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
                  >
                    Todo
                  </button>
                  <button
                    onClick={() => setFilterComp("liga")}
                    className={`px-2.5 py-1 rounded-md transition ${filterComp === "liga" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
                  >
                    Liga
                  </button>
                  <button
                    onClick={() => setFilterComp("copa")}
                    className={`px-2.5 py-1 rounded-md transition ${filterComp === "copa" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
                  >
                    Copa
                  </button>
                </div>

                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-95"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  <span>Imprimir / Guardar PDF</span>
                </button>

                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
                  aria-label="Cerrar vista previa"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Contenido imprimible en PDF */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 print:p-0 print:overflow-visible">
              <div id="pdf-printable-area" className="mx-auto max-w-3xl bg-white text-slate-900 font-sans">
                
                {/* CABECERA OFICIAL CON ESCUDO */}
                <div className="border-b-2 border-emerald-700 pb-4 mb-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      {/* Logo oficial */}
                      <img
                        src="/logo.png"
                        alt="Escudo Lodosa"
                        className="h-20 w-20 object-contain drop-shadow-sm print:h-20 print:w-20"
                      />
                      <div>
                        <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800">
                          Calendario Oficial de Competición
                        </span>
                        <h1 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
                          {settings.name}
                        </h1>
                        <p className="text-xs font-semibold text-slate-600 mt-0.5">
                          Temporada {settings.season} · {settings.location}
                        </p>
                      </div>
                    </div>

                    <div className="text-right text-[11px] text-slate-500">
                      <div className="font-bold text-slate-800">Pabellón Oficial:</div>
                      <div>{settings.defaultVenue || "Polideportivo Municipal"}</div>
                      <div className="mt-1 font-semibold text-emerald-700">Partidos en Sábado</div>
                    </div>
                  </div>
                </div>

                {/* LISTADO DE JORNADAS EN CUADRÍCULA DE 2 COLUMNAS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-3">
                  {[...roundsMap.entries()].map(([key, rMatches]) => {
                    const first = rMatches[0];
                    const isCopa = first?.competition === "copa";
                    const roundNum = first?.round;

                    return (
                      <div
                        key={key}
                        className="break-inside-avoid rounded-xl border border-slate-300 bg-slate-50/50 p-3.5 print:border-slate-300 print:bg-white print:p-2.5 print:shadow-none"
                      >
                        {/* Cabecera de la jornada */}
                        <div className="flex items-baseline justify-between border-b border-slate-200 pb-1.5 mb-2">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                                isCopa
                                  ? "bg-amber-100 text-amber-900 border border-amber-300"
                                  : "bg-emerald-100 text-emerald-900 border border-emerald-300"
                              }`}
                            >
                              {isCopa ? "Copa" : "Liga"}
                            </span>
                            <span className="font-extrabold text-sm text-slate-900">
                              Jornada {roundNum}
                            </span>
                          </div>
                          {first?.date && (
                            <span className="text-[11px] font-bold text-slate-600">
                              {new Date(first.date + "T00:00:00").toLocaleDateString("es-ES", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          )}
                        </div>

                        {/* Partidos de la jornada */}
                        <div className="space-y-1.5 text-xs">
                          {rMatches.map((m) => {
                            const home = teams[m.homeTeamId]?.name ?? "Local";
                            const away = teams[m.awayTeamId]?.name ?? "Visitante";
                            const hasScore = m.homeScore !== null && m.awayScore !== null;

                            return (
                              <div
                                key={m.id}
                                className="flex items-center justify-between rounded bg-white px-2 py-1.5 border border-slate-100 shadow-2xs print:border-slate-200 print:shadow-none print:py-1"
                              >
                                <span className="w-11 shrink-0 font-mono font-bold text-slate-500 text-[11px]">
                                  {m.time || "--:--"}
                                </span>
                                
                                <div className="flex flex-1 items-center justify-between gap-1 font-medium text-slate-800">
                                  <span className="truncate text-left flex-1" title={home}>
                                    {home}
                                  </span>
                                  
                                  {hasScore ? (
                                    <span className="shrink-0 rounded bg-slate-900 px-1.5 py-0.5 font-mono text-[11px] font-black text-white">
                                      {m.homeScore} - {m.awayScore}
                                    </span>
                                  ) : (
                                    <span className="shrink-0 text-slate-400 font-bold px-1">
                                      vs
                                    </span>
                                  )}

                                  <span className="truncate text-right flex-1" title={away}>
                                    {away}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* PIE DE PÁGINA DEL DOCUMENTO */}
                <div className="mt-8 border-t border-slate-200 pt-3 text-center text-[10px] text-slate-400 print:mt-4">
                  Documento oficial expedido para el {settings.name} ({settings.season}) · Polideportivo Municipal de Lodosa
                </div>
              </div>
            </div>

            {/* Footer con botón directo de impresión en móvil */}
            <div className="border-t border-slate-200 bg-slate-50 p-3 sm:hidden print:hidden">
              <button
                onClick={handlePrint}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 font-bold text-white text-sm shadow-sm"
              >
                🖨️ Imprimir / Guardar en PDF
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
