"use client";

import { useMemo, useRef, useState } from "react";
import type { Match, Team } from "@/lib/types";
import { formatDate } from "@/lib/stats";

interface Props {
  matches: Match[];
  teams: Record<string, Team>;
}

export function RoundPosterModal({ matches, teams }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<"results" | "upcoming">("upcoming");
  const [selectedRound, setSelectedRound] = useState<number>(1);
  const [downloading, setDownloading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Determinar jornadas de liga
  const rounds = useMemo(() => {
    const set = new Set<number>();
    for (const m of matches) {
      if ((m.competition ?? "liga") === "liga") {
        set.add(m.round);
      }
    }
    return Array.from(set).sort((a, b) => a - b);
  }, [matches]);

  // Encontrar la última jugada y la próxima por jugar
  const { lastPlayedRound, nextUpcomingRound } = useMemo(() => {
    const liga = matches.filter((m) => (m.competition ?? "liga") === "liga");
    let lastPlayed = 1;
    let nextUpcoming = 1;

    for (const m of liga) {
      if (m.status === "played" && m.round > lastPlayed) {
        lastPlayed = m.round;
      }
    }

    const firstPending = liga.find((m) => m.status !== "played");
    if (firstPending) {
      nextUpcoming = firstPending.round;
    } else {
      nextUpcoming = lastPlayed;
    }

    return { lastPlayedRound: lastPlayed, nextUpcomingRound: nextUpcoming };
  }, [matches]);

  function openModal(initialTab: "results" | "upcoming") {
    setTab(initialTab);
    setSelectedRound(initialTab === "results" ? lastPlayedRound : nextUpcomingRound);
    setIsOpen(true);
  }

  // Partidos de la jornada seleccionada
  const roundMatches = useMemo(() => {
    return matches
      .filter((m) => (m.competition ?? "liga") === "liga" && m.round === selectedRound)
      .sort((a, b) => (a.time || "").localeCompare(b.time || ""));
  }, [matches, selectedRound]);

  const roundDate = roundMatches[0]?.date ? formatDate(roundMatches[0].date, { long: true }) : "";

  // Generar y descargar el cartel como imagen PNG nítida (1080x1350 vertical estilo Instagram)
  async function handleDownloadImage() {
    setDownloading(true);
    try {
      const canvas = document.createElement("canvas");
      // Formato 4:5 vertical ideal para Instagram Feed y Stories (1080 x 1350)
      const width = 1080;
      const height = 1350;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // 1. Fondo elegante con degradado fútbol sala
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, "#064e3b"); // Esmeralda profundo
      bgGrad.addColorStop(0.35, "#0f172a"); // Pizarra oscuro
      bgGrad.addColorStop(1, "#020617"); // Casi negro
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Efecto sutil de círculos brillantes
      const glowGrad = ctx.createRadialGradient(width / 2, 180, 20, width / 2, 180, 500);
      glowGrad.addColorStop(0, "rgba(16, 185, 129, 0.22)");
      glowGrad.addColorStop(1, "transparent");
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, width, 500);

      // Cargar logo oficial
      const logoImg = await new Promise<HTMLImageElement | null>((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = "/logo.png";
      });

      // 2. Cabecera superior
      ctx.textAlign = "center";

      // Escudo oficial arriba (110x110 px)
      if (logoImg) {
        const logoSize = 100;
        ctx.drawImage(logoImg, width / 2 - logoSize / 2, 40, logoSize, logoSize);
      } else {
        ctx.font = "bold 56px system-ui, -apple-system, sans-serif";
        ctx.fillText("⚽", width / 2, 110);
      }

      // Nombre del torneo
      ctx.fillStyle = "#34d399";
      ctx.font = "bold 24px system-ui, -apple-system, sans-serif";
      ctx.letterSpacing = "2px";
      ctx.fillText("CAMPEONATO FÚTBOL SALA LODOSA", width / 2, 175);

      // Título de la tarjeta
      ctx.fillStyle = "#ffffff";
      ctx.font = "900 46px system-ui, -apple-system, sans-serif";
      const titleText = tab === "results" ? `RESULTADOS · JORNADA ${selectedRound}` : `PRÓXIMA JORNADA ${selectedRound}`;
      ctx.fillText(titleText, width / 2, 235);

      // Fecha y lugar
      ctx.fillStyle = "#94a3b8";
      ctx.font = "600 23px system-ui, -apple-system, sans-serif";
      ctx.fillText(
        `Polideportivo Municipal de Lodosa ${roundDate ? `· ${roundDate}` : ""}`,
        width / 2,
        278
      );

      // Línea divisoria dorada/esmeralda
      const lineGrad = ctx.createLinearGradient(140, 0, width - 140, 0);
      lineGrad.addColorStop(0, "transparent");
      lineGrad.addColorStop(0.5, "#10b981");
      lineGrad.addColorStop(1, "transparent");
      ctx.strokeStyle = lineGrad;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(140, 305);
      ctx.lineTo(width - 140, 305);
      ctx.stroke();

      // 3. Renderizar cada uno de los 5 partidos
      const startY = 345;
      const cardHeight = 155;
      const gap = 24;
      const cardWidth = 920;
      const cardX = (width - cardWidth) / 2;

      roundMatches.forEach((m, idx) => {
        const y = startY + idx * (cardHeight + gap);
        const home = teams[m.homeTeamId];
        const away = teams[m.awayTeamId];
        const isPlayed = m.status === "played";

        // Fondo de tarjeta de partido
        ctx.fillStyle = "rgba(30, 41, 59, 0.75)";
        ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
        ctx.lineWidth = 1.5;
        roundRect(ctx, cardX, y, cardWidth, cardHeight, 20);
        ctx.fill();
        ctx.stroke();

        // Hora o estado arriba en el centro
        ctx.fillStyle = "#38bdf8";
        ctx.font = "bold 20px system-ui, -apple-system, sans-serif";
        ctx.textAlign = "center";
        const timeBadge = isPlayed ? "FINALIZADO" : m.time || "17:00 h";
        ctx.fillText(timeBadge, width / 2, y + 36);

        // Equipo Local
        ctx.textAlign = "right";
        ctx.fillStyle = "#f8fafc";
        ctx.font = "bold 30px system-ui, -apple-system, sans-serif";
        const homeName = home?.name || "Local";
        ctx.fillText(truncateText(ctx, homeName, 310), width / 2 - 130, y + 96);

        // Punto de color local
        ctx.fillStyle = home?.color || "#10b981";
        ctx.beginPath();
        ctx.arc(width / 2 - 100, y + 86, 12, 0, Math.PI * 2);
        ctx.fill();

        // Centro (Marcador o VS)
        if (isPlayed) {
          // Caja de marcador negra
          ctx.fillStyle = "#0f172a";
          roundRect(ctx, width / 2 - 75, y + 54, 150, 64, 14);
          ctx.fill();
          ctx.strokeStyle = "#334155";
          ctx.stroke();

          ctx.fillStyle = "#ffffff";
          ctx.font = "900 38px monospace";
          ctx.textAlign = "center";
          ctx.fillText(`${m.homeScore ?? 0} - ${m.awayScore ?? 0}`, width / 2, y + 100);
        } else {
          // Caja VS
          ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
          roundRect(ctx, width / 2 - 50, y + 56, 100, 60, 14);
          ctx.fill();
          ctx.strokeStyle = "#334155";
          ctx.stroke();

          ctx.fillStyle = "#94a3b8";
          ctx.font = "bold 24px system-ui, -apple-system, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("VS", width / 2, y + 95);
        }

        // Punto de color visitante
        ctx.fillStyle = away?.color || "#3b82f6";
        ctx.beginPath();
        ctx.arc(width / 2 + 100, y + 86, 12, 0, Math.PI * 2);
        ctx.fill();

        // Equipo Visitante
        ctx.textAlign = "left";
        ctx.fillStyle = "#f8fafc";
        ctx.font = "bold 30px system-ui, -apple-system, sans-serif";
        const awayName = away?.name || "Visitante";
        ctx.fillText(truncateText(ctx, awayName, 310), width / 2 + 130, y + 96);
      });

      // 4. Pie de cartel oficial
      ctx.textAlign = "center";
      ctx.fillStyle = "#34d399";
      ctx.font = "bold 24px system-ui, -apple-system, sans-serif";
      ctx.fillText("www.lodosafs.com", width / 2, height - 70);

      ctx.fillStyle = "#64748b";
      ctx.font = "500 18px system-ui, -apple-system, sans-serif";
      ctx.fillText("Sigue en directo la clasificación, actas y goleadores", width / 2, height - 38);

      // Descargar como archivo
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      const fileName =
        tab === "results"
          ? `Resultados-Jornada-${selectedRound}-FS-Lodosa.png`
          : `Horarios-Jornada-${selectedRound}-FS-Lodosa.png`;
      a.download = fileName;
      a.click();
    } finally {
      setDownloading(false);
    }
  }

  // Compartir directo si el navegador soporta Web Share API (móvil)
  async function handleShareMobile() {
    try {
      const title =
        tab === "results"
          ? `⚽ Resultados Jornada ${selectedRound} · FS Lodosa`
          : `📅 Horarios Próxima Jornada ${selectedRound} · FS Lodosa`;

      const lines = [title];
      if (roundDate) lines.push(`📅 ${roundDate}`);
      lines.push("📍 Polideportivo Municipal de Lodosa\n");

      roundMatches.forEach((m) => {
        const home = teams[m.homeTeamId]?.name || "Local";
        const away = teams[m.awayTeamId]?.name || "Visitante";
        if (m.status === "played") {
          lines.push(`▪ ${home} ${m.homeScore} - ${m.awayScore} ${away}`);
        } else {
          lines.push(`▪ ${m.time || "17:00"} h | ${home} vs ${away}`);
        }
      });

      lines.push("\n🔗 Consulta actas y clasificación:");
      lines.push(window.location.origin);

      const text = lines.join("\n");

      if (navigator.share) {
        await navigator.share({ title, text, url: window.location.origin });
      } else {
        const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
        window.open(url, "_blank");
      }
    } catch {
      // Ignorar cancelaciones
    }
  }

  return (
    <>
      {/* Botones de acción en la web */}
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          onClick={() => openModal("upcoming")}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:from-emerald-500 hover:to-teal-600 active:scale-95"
        >
          <span>📸</span>
          <span>Cartel Próxima Jornada</span>
        </button>

        <button
          onClick={() => openModal("results")}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-emerald-800 active:scale-95"
        >
          <span>🏆</span>
          <span>Cartel Resultados</span>
        </button>
      </div>

      {/* Modal interactivo con previsualización del cartel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Fondo oscuro */}
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          {/* Caja del modal */}
          <div className="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-slate-900 text-white shadow-2xl border border-slate-800 animate-in zoom-in-95 duration-200">
            {/* Header del modal */}
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600/30 text-emerald-400">
                  📸
                </span>
                <div>
                  <h3 className="text-sm font-extrabold text-white">Generador de Cartel Oficial</h3>
                  <p className="text-[11px] text-slate-400">
                    Listo para compartir en Instagram Stories, Estados o WhatsApp
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Controles: Pestaña (Próxima o Resultados) y Selector de Jornada */}
            <div className="bg-slate-950/50 p-4 border-b border-slate-800/80 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setTab("upcoming")}
                  className={`rounded-xl py-2 text-xs font-bold transition ${
                    tab === "upcoming"
                      ? "bg-emerald-600 text-white shadow"
                      : "bg-slate-800/70 text-slate-400 hover:text-white"
                  }`}
                >
                  📅 Próxima Jornada
                </button>
                <button
                  onClick={() => setTab("results")}
                  className={`rounded-xl py-2 text-xs font-bold transition ${
                    tab === "results"
                      ? "bg-emerald-600 text-white shadow"
                      : "bg-slate-800/70 text-slate-400 hover:text-white"
                  }`}
                >
                  🏁 Resultados Anteriores
                </button>
              </div>

              <div className="flex items-center justify-between gap-3">
                <label className="text-xs font-semibold text-slate-400">Elegir Jornada:</label>
                <select
                  value={selectedRound}
                  onChange={(e) => setSelectedRound(Number(e.target.value))}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-white outline-none focus:border-emerald-500"
                >
                  {rounds.map((r) => (
                    <option key={r} value={r}>
                      Jornada {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Vista Previa del Cartel (Aspecto Instagram) */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="mx-auto max-w-sm rounded-2xl bg-gradient-to-b from-emerald-950 via-slate-900 to-slate-950 p-5 shadow-inner border border-emerald-500/20 text-center">
                <img
                  src="/logo.png"
                  alt="Escudo Lodosa"
                  className="h-12 w-12 mx-auto mb-2 object-contain drop-shadow"
                />
                <div className="text-[10px] font-extrabold tracking-widest text-emerald-400 uppercase">
                  Campeonato Fútbol Sala Lodosa
                </div>
                <div className="text-base font-black text-white mt-0.5">
                  {tab === "results" ? `Resultados · Jornada ${selectedRound}` : `Próxima Jornada ${selectedRound}`}
                </div>
                <div className="text-[11px] text-slate-400 mb-4">
                  {roundDate || "Polideportivo Municipal de Lodosa"}
                </div>

                <div className="space-y-2">
                  {roundMatches.map((m) => {
                    const home = teams[m.homeTeamId];
                    const away = teams[m.awayTeamId];
                    const isPlayed = m.status === "played";

                    return (
                      <div
                        key={m.id}
                        className="flex items-center justify-between rounded-xl bg-slate-800/80 px-3 py-2 text-xs border border-slate-700/60"
                      >
                        <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end text-right">
                          <span className="truncate font-semibold text-white">
                            {home?.name || "Local"}
                          </span>
                          <span
                            className="inline-block h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: home?.color || "#10b981" }}
                          />
                        </div>

                        <div className="mx-2 shrink-0">
                          {isPlayed ? (
                            <span className="rounded bg-slate-950 px-2 py-0.5 font-mono font-bold text-emerald-400">
                              {m.homeScore} - {m.awayScore}
                            </span>
                          ) : (
                            <span className="rounded bg-slate-900 px-2 py-0.5 font-mono text-[10px] font-bold text-sky-300">
                              {m.time || "17:00"}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-start text-left">
                          <span
                            className="inline-block h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: away?.color || "#3b82f6" }}
                          />
                          <span className="truncate font-semibold text-white">
                            {away?.name || "Visitante"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 pt-3 border-t border-white/10 text-[11px] text-emerald-300 font-bold font-mono">
                  www.lodosafs.com
                </div>
              </div>
            </div>

            {/* Acciones: Descargar Imagen y Compartir por WhatsApp */}
            <div className="flex flex-wrap items-center gap-2 border-t border-slate-800 bg-slate-950 p-4">
              <button
                onClick={handleDownloadImage}
                disabled={downloading}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-lg transition hover:bg-emerald-500 active:scale-95 disabled:opacity-50"
              >
                <span>💾</span>
                <span>{downloading ? "Generando imagen..." : "Descargar Imagen HD (PNG)"}</span>
              </button>

              <button
                onClick={handleShareMobile}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-xs font-bold text-slate-950 shadow-lg transition hover:bg-[#20ba59] active:scale-95"
              >
                <span>📲</span>
                <span>WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Helpers para dibujar rectángulos con esquinas redondeadas en Canvas
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 0 && ctx.measureText(truncated + "...").width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + "...";
}
