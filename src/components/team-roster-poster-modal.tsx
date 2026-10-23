"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Player, Team } from "@/lib/types";
import { TeamBadge } from "@/components/ui";

interface Props {
  // Modo 1: Para un único equipo (ej. en /equipos/[id])
  team?: Team;
  players?: Player[];

  // Modo 2: Para la lista general de equipos (ej. en /equipos)
  teams?: Team[];
  allPlayers?: Player[];

  buttonLabel?: string;
  buttonClassName?: string;
  variant?: "primary" | "secondary" | "banner";
}

export function TeamRosterPosterModal({
  team: initialTeam,
  players: initialPlayers,
  teams,
  allPlayers,
  buttonLabel = "📸 Exportar plantilla en imagen",
  buttonClassName,
  variant = "primary",
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string>(
    initialTeam?.id || teams?.[0]?.id || ""
  );
  const [downloading, setDownloading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Determinar el equipo activo
  const activeTeam = useMemo(() => {
    if (initialTeam) return initialTeam;
    if (teams && selectedTeamId) {
      return teams.find((t) => t.id === selectedTeamId) || teams[0];
    }
    return undefined;
  }, [initialTeam, teams, selectedTeamId]);

  // Determinar los jugadores del equipo activo
  const activePlayers = useMemo(() => {
    if (initialPlayers && (!teams || initialTeam?.id === selectedTeamId)) {
      return [...initialPlayers].sort(
        (a, b) =>
          (a.number ?? 999) - (b.number ?? 999) || a.name.localeCompare(b.name)
      );
    }
    if (allPlayers && activeTeam) {
      return allPlayers
        .filter((p) => p.teamId === activeTeam.id)
        .sort(
          (a, b) =>
            (a.number ?? 999) - (b.number ?? 999) || a.name.localeCompare(b.name)
        );
    }
    return [];
  }, [initialPlayers, allPlayers, activeTeam, teams, initialTeam, selectedTeamId]);

  // Dibujar en el canvas de previsualización cuando cambie el equipo o se abra el modal
  useEffect(() => {
    if (!isOpen || !canvasRef.current || !activeTeam) return;
    renderCanvas(canvasRef.current, activeTeam, activePlayers);
  }, [isOpen, activeTeam, activePlayers]);

  // Renderizar imagen en canvas (1080 x 1350 vertical estilo cartel oficial)
  async function renderCanvas(
    canvas: HTMLCanvasElement,
    t: Team,
    pls: Player[]
  ) {
    const width = 1080;
    const height = 1350;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 1. Fondo elegante con degradado fútbol sala oscuro
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, "#064e3b"); // Verde esmeralda profundo
    bgGrad.addColorStop(0.35, "#0f172a"); // Pizarra oscuro
    bgGrad.addColorStop(1, "#020617"); // Casi negro
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Resplandor del color del equipo en la parte superior
    const teamGlow = ctx.createRadialGradient(
      width / 2,
      220,
      30,
      width / 2,
      220,
      450
    );
    teamGlow.addColorStop(0, `${t.color || "#10b981"}33`);
    teamGlow.addColorStop(1, "transparent");
    ctx.fillStyle = teamGlow;
    ctx.fillRect(0, 0, width, 550);

    // Cargar logo oficial del campeonato
    const logoImg = await new Promise<HTMLImageElement | null>((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = "/logo.png";
    });

    // 2. Cabecera superior
    ctx.textAlign = "center";

    // Logo oficial (90x90 px)
    if (logoImg) {
      const logoSize = 90;
      ctx.drawImage(logoImg, width / 2 - logoSize / 2, 40, logoSize, logoSize);
    } else {
      ctx.font = "bold 50px system-ui, -apple-system, sans-serif";
      ctx.fillText("⚽", width / 2, 100);
    }

    // Texto del campeonato
    ctx.fillStyle = "#34d399";
    ctx.font = "bold 20px system-ui, -apple-system, sans-serif";
    ctx.letterSpacing = "2px";
    ctx.fillText("CAMPEONATO FÚTBOL SALA LODOSA · 2026/27", width / 2, 160);

    // Escudo/Círculo del equipo
    const badgeY = 220;
    ctx.save();
    ctx.beginPath();
    ctx.arc(width / 2, badgeY, 36, 0, Math.PI * 2);
    ctx.fillStyle = t.color || "#10b981";
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "900 24px system-ui, -apple-system, sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillText(t.shortName || t.name.slice(0, 3).toUpperCase(), width / 2, badgeY);
    ctx.restore();

    // Nombre del equipo en grande
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 46px system-ui, -apple-system, sans-serif";
    ctx.fillText(t.name.toUpperCase(), width / 2, 305);

    // Subtítulo: número de jugadores y delegado
    ctx.fillStyle = "#94a3b8";
    ctx.font = "600 21px system-ui, -apple-system, sans-serif";
    const subText = `PLANTILLA OFICIAL · ${pls.length} JUGADORES${
      t.delegate ? ` · Delegado: ${t.delegate}` : ""
    }`;
    ctx.fillText(subText, width / 2, 345);

    // Línea divisoria elegante
    const lineGrad = ctx.createLinearGradient(120, 0, width - 120, 0);
    lineGrad.addColorStop(0, "transparent");
    lineGrad.addColorStop(0.5, t.color || "#10b981");
    lineGrad.addColorStop(1, "transparent");
    ctx.strokeStyle = lineGrad;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(120, 375);
    ctx.lineTo(width - 120, 375);
    ctx.stroke();

    // 3. Renderizar listado de jugadores con dorsales
    // Zona disponible para jugadores: Y de 400 a 1220 (820 px)
    const areaStartY = 405;
    const areaMaxY = 1220;
    const availableH = areaMaxY - areaStartY;

    if (pls.length === 0) {
      ctx.fillStyle = "#94a3b8";
      ctx.font = "500 24px system-ui, -apple-system, sans-serif";
      ctx.fillText("Plantilla aún no publicada", width / 2, 600);
    } else {
      // Usar 2 columnas estilizadas
      const colWidth = 445;
      const colGap = 30;
      const leftColX = (width - (colWidth * 2 + colGap)) / 2;
      const rightColX = leftColX + colWidth + colGap;

      const numRows = Math.ceil(pls.length / 2);
      // Calcular altura de cada tarjeta según el número de filas
      const maxCardH = 68;
      const minCardH = 46;
      let cardH = maxCardH;
      let gapY = 14;

      if (numRows > 8) {
        cardH = Math.max(minCardH, Math.floor((availableH - (numRows - 1) * 8) / numRows));
        gapY = 8;
      }

      // Centrar verticalmente el bloque de jugadores en el espacio disponible
      const totalBlockH = numRows * cardH + (numRows - 1) * gapY;
      const startY = areaStartY + Math.max(0, Math.floor((availableH - totalBlockH) / 2));

      pls.forEach((p, idx) => {
        const isRight = idx >= numRows;
        const colX = isRight ? rightColX : leftColX;
        const rowIdx = isRight ? idx - numRows : idx;
        const y = startY + rowIdx * (cardH + gapY);

        // Fondo de tarjeta de jugador
        ctx.fillStyle = "rgba(30, 41, 59, 0.78)";
        ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
        ctx.lineWidth = 1.5;
        roundRect(ctx, colX, y, colWidth, cardH, 14);
        ctx.fill();
        ctx.stroke();

        // Caja del dorsal con el color del equipo
        const badgeSize = cardH - 12;
        const badgeBoxX = colX + 6;
        const badgeBoxY = y + 6;

        ctx.fillStyle = t.color || "#10b981";
        roundRect(ctx, badgeBoxX, badgeBoxY, badgeSize, badgeSize, 10);
        ctx.fill();

        // Número del dorsal
        ctx.fillStyle = "#ffffff";
        ctx.font = `900 ${badgeSize > 50 ? 24 : 20}px monospace, system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          p.number != null ? String(p.number) : "–",
          badgeBoxX + badgeSize / 2,
          badgeBoxY + badgeSize / 2 + 1
        );

        // Nombre y apellidos del jugador
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#ffffff";
        const fontSize = cardH >= 60 ? 21 : 18;
        ctx.font = `700 ${fontSize}px system-ui, -apple-system, sans-serif`;
        const textX = badgeBoxX + badgeSize + 14;
        const maxTextW = colWidth - (badgeSize + 28);
        const nameText = truncateText(ctx, p.name, maxTextW);
        ctx.fillText(nameText, textX, y + cardH / 2);
      });
    }

    // 4. Pie de página
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";

    // Línea inferior
    const bottomLineY = 1245;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(120, bottomLineY);
    ctx.lineTo(width - 120, bottomLineY);
    ctx.stroke();

    ctx.fillStyle = "#34d399";
    ctx.font = "bold 23px system-ui, -apple-system, sans-serif";
    ctx.fillText("www.lodosafs.com", width / 2, 1285);

    ctx.fillStyle = "#64748b";
    ctx.font = "500 17px system-ui, -apple-system, sans-serif";
    ctx.fillText(
      "Polideportivo Municipal de Lodosa · Calendario, resultados y clasificaciones",
      width / 2,
      1318
    );
  }

  // Descargar imagen PNG de alta calidad
  async function handleDownloadImage() {
    if (!activeTeam) return;
    setDownloading(true);
    try {
      const canvas = document.createElement("canvas");
      await renderCanvas(canvas, activeTeam, activePlayers);

      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      const cleanName = activeTeam.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      a.download = `Plantilla-${cleanName}-FS-Lodosa.png`;
      a.click();
    } finally {
      setDownloading(false);
    }
  }

  // Compartir en WhatsApp o nativo
  async function handleShare() {
    if (!activeTeam) return;
    try {
      const title = `⚽ Plantilla Oficial · ${activeTeam.name}`;
      const lines = [title];
      lines.push("🏆 Campeonato Local de Fútbol Sala de Lodosa 2026/27");
      if (activeTeam.delegate) lines.push(`👤 Delegado: ${activeTeam.delegate}`);
      lines.push("\n📋 JUGADORES:");

      activePlayers.forEach((p) => {
        lines.push(`▪ ${p.number != null ? `${p.number}. ` : ""}${p.name}`);
      });

      lines.push("\n🔗 Consulta la web oficial:");
      lines.push(
        typeof window !== "undefined"
          ? `${window.location.origin}/equipos/${activeTeam.id}`
          : "www.lodosafs.com"
      );

      const text = lines.join("\n");

      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title,
          text,
          url: window.location.href,
        });
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
      {/* Botón de apertura según variante */}
      {variant === "banner" ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`shrink-0 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-slate-950 shadow-md transition hover:bg-emerald-400 active:scale-95 ${
            buttonClassName || ""
          }`}
        >
          <span>📸</span>
          <span>{buttonLabel}</span>
        </button>
      ) : variant === "secondary" ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 hover:text-emerald-700 active:scale-95 ${
            buttonClassName || ""
          }`}
        >
          <span>📸</span>
          <span>{buttonLabel}</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-800 active:scale-95 ${
            buttonClassName || ""
          }`}
        >
          <span>📸</span>
          <span>{buttonLabel}</span>
        </button>
      )}

      {/* Modal interactivo */}
      {isOpen && activeTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs">
          <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-slate-900 border border-slate-700 text-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Cabecera del modal */}
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4 shrink-0 bg-slate-900/90">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-xl text-emerald-400">
                  📸
                </span>
                <div>
                  <h3 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                    Exportar Plantilla en Imagen
                  </h3>
                  <p className="text-xs text-slate-400">
                    Formato vertical (1080×1350) listo para WhatsApp, estados y redes sociales.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                aria-label="Cerrar modal"
              >
                ✕
              </button>
            </div>

            {/* Selector de equipo (si se abrió en modo lista general) */}
            {teams && teams.length > 1 && (
              <div className="bg-slate-950/80 border-b border-slate-800 px-5 py-3 flex flex-wrap items-center gap-3 shrink-0">
                <label htmlFor="team-select" className="text-xs font-bold text-slate-300">
                  Selecciona el equipo:
                </label>
                <select
                  id="team-select"
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold text-white border border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                >
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-slate-500">
                  ({activePlayers.length} jugadores inscritos)
                </span>
              </div>
            )}

            {/* Contenido: Previsualización de la imagen y lista de jugadores */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid gap-6 md:grid-cols-[1.1fr_1fr]">
              {/* Vista previa gráfica del cartel canvas */}
              <div className="flex flex-col items-center justify-center rounded-xl bg-slate-950 p-3 sm:p-4 border border-slate-800">
                <div className="mb-2 text-center text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <span>✨</span> Vista previa del cartel descargable
                </div>
                <div className="relative w-full max-w-[340px] aspect-[4/5] rounded-xl overflow-hidden shadow-2xl ring-1 ring-slate-700">
                  <canvas
                    ref={canvasRef}
                    className="w-full h-full object-contain block"
                  />
                </div>
                <span className="mt-2 text-[11px] text-slate-500">
                  Resolución nítida 1080 × 1350 px
                </span>
              </div>

              {/* Panel de detalles del equipo y listado de jugadores */}
              <div className="flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                    <TeamBadge team={activeTeam} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="text-base font-extrabold text-white truncate">
                        {activeTeam.name}
                      </div>
                      <div className="text-xs text-slate-400">
                        {activePlayers.length} jugadores en la plantilla oficial
                        {activeTeam.delegate ? ` · Delegado: ${activeTeam.delegate}` : ""}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Jugadores incluidos en la imagen:
                    </h4>
                    <div className="max-h-[260px] overflow-y-auto pr-1 space-y-1.5">
                      {activePlayers.length ? (
                        activePlayers.map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center gap-2.5 rounded-lg bg-slate-800/60 px-3 py-1.5 text-xs text-slate-200"
                          >
                            <span
                              className="flex h-5 w-5 shrink-0 items-center justify-center rounded font-mono font-bold text-[10px] text-white"
                              style={{ backgroundColor: activeTeam.color || "#10b981" }}
                            >
                              {p.number != null ? p.number : "–"}
                            </span>
                            <span className="font-medium truncate">{p.name}</span>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-slate-500 py-3 text-center">
                          No hay jugadores registrados en este equipo todavía.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Botones de descarga y compartir */}
                <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row gap-2.5">
                  <button
                    type="button"
                    onClick={handleDownloadImage}
                    disabled={downloading}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-slate-950 shadow-md hover:bg-emerald-400 active:scale-95 disabled:opacity-50 transition"
                  >
                    <span>{downloading ? "⏳" : "📥"}</span>
                    <span>{downloading ? "Generando imagen..." : "Descargar Imagen (PNG)"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleShare}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-3 text-sm font-bold text-white border border-slate-700 hover:bg-slate-700 active:scale-95 transition"
                  >
                    <span>📲</span>
                    <span>Compartir en WhatsApp</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

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
  ctx.quadraticCurveTo(x + width, y, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function truncateText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 0 && ctx.measureText(truncated + "...").width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + "...";
}
