import jsPDF from "jspdf";
import { LOGO_BASE64 } from "@/lib/logo-base64";

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

interface SettingsInfo {
  name: string;
  season: string;
  location: string;
  defaultVenue?: string;
}

export function exportCalendarToPdf({
  matches,
  teams,
  settings,
  scope = "liga",
}: {
  matches: MatchItem[];
  teams: Record<string, TeamInfo>;
  settings: SettingsInfo;
  scope?: "liga" | "copa" | "todas";
}) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 12;
  const contentWidth = pageWidth - marginX * 2; // 186 mm

  // Filtrar partidos
  const filtered = matches.filter((m) => {
    if (scope === "liga") return (m.competition ?? "liga") === "liga";
    if (scope === "copa") return m.competition === "copa";
    return true;
  });

  // Agrupar por jornada
  const roundsMap = new Map<string, MatchItem[]>();
  for (const m of filtered) {
    const key = `${m.competition ?? "liga"}-${m.round}`;
    roundsMap.set(key, [...(roundsMap.get(key) ?? []), m]);
  }

  const sortedKeys = [...roundsMap.keys()].sort((a, b) => {
    const matchesA = roundsMap.get(a) || [];
    const matchesB = roundsMap.get(b) || [];
    const dateA = matchesA[0]?.date || "9999-99-99";
    const dateB = matchesB[0]?.date || "9999-99-99";

    if (dateA !== dateB) {
      return dateA.localeCompare(dateB);
    }

    const [compA, roundA] = a.split("-");
    const [compB, roundB] = b.split("-");
    if (compA !== compB) return compA.localeCompare(compB);
    return Number(roundA) - Number(roundB);
  });

  function drawHeader(pageNum: number, totalPages: number) {
    // Fondo de cabecera verde esmeralda
    doc.setFillColor(6, 95, 70); // #065F46
    doc.rect(0, 0, pageWidth, 28, "F");

    // Logo oficial
    try {
      doc.addImage(LOGO_BASE64, "PNG", marginX, 3.5, 21, 21);
    } catch {
      // fallback si falla el renderizado de imagen
    }

    // Título y texto
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(settings.name.toUpperCase(), marginX + 25, 11);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(209, 250, 229);
    const scopeLabel = scope === "liga" ? "LIGA REGULAR" : scope === "copa" ? "TORNEO DE COPA" : "LIGA Y COPA";
    doc.text(`CALENDARIO OFICIAL · ${scopeLabel} · TEMPORADA ${settings.season}`, marginX + 25, 17);
    doc.text(`${settings.location} · ${settings.defaultVenue || "Polideportivo Municipal"}`, marginX + 25, 22);

    // Pie de página
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Página ${pageNum} de ${totalPages} · ${settings.name} (${settings.season})`,
      pageWidth / 2,
      pageHeight - 7,
      { align: "center" }
    );
  }

  // Medidas de las tarjetas de jornada (2 columnas)
  const colWidth = (contentWidth - 6) / 2; // ~90 mm
  const cardHeight = 40; // mm por jornada de 5 partidos
  const startY = 33;
  const maxRowsPerPage = 6; // 6 filas de 2 tarjetas = 12 jornadas por página
  const cardsPerPage = maxRowsPerPage * 2;

  const totalPages = Math.ceil(sortedKeys.length / cardsPerPage) || 1;

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) doc.addPage();
    drawHeader(page + 1, totalPages);

    const pageKeys = sortedKeys.slice(page * cardsPerPage, (page + 1) * cardsPerPage);

    pageKeys.forEach((key, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = marginX + col * (colWidth + 6);
      const y = startY + row * (cardHeight + 3);

      const rMatches = roundsMap.get(key) || [];
      const first = rMatches[0];
      const isCopa = first?.competition === "copa";
      const roundNum = first?.round;

      // Caja de la jornada
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(x, y, colWidth, cardHeight, 2, 2, "FD");

      // Barra superior de la tarjeta
      doc.setFillColor(isCopa ? 254 : 236, isCopa ? 243 : 253, isCopa ? 199 : 245);
      doc.rect(x + 0.5, y + 0.5, colWidth - 1, 6.5, "F");

      // Título de la jornada
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(isCopa ? 146 : 6, isCopa ? 64 : 95, isCopa ? 14 : 70);
      const title = `${isCopa ? "COPA" : "LIGA"} · JORNADA ${roundNum}`;
      doc.text(title, x + 2.5, y + 5);

      // Fecha
      if (first?.date) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        const dateObj = new Date(first.date + "T00:00:00");
        const dateText = dateObj.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
        doc.text(dateText, x + colWidth - 2.5, y + 5, { align: "right" });
      }

      // Partidos (hasta 5 partidos por jornada)
      let matchY = y + 11.5;
      rMatches.slice(0, 5).forEach((m) => {
        // Hora
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text(m.time || "--:--", x + 2.5, matchY);

        // Equipos
        const home = teams[m.homeTeamId]?.name || "Local";
        const away = teams[m.awayTeamId]?.name || "Visitante";
        const hasScore = m.homeScore !== null && m.awayScore !== null;

        // Texto local
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.2);
        doc.setTextColor(15, 23, 42);
        const homeTrim = home.length > 15 ? home.slice(0, 14) + "…" : home;
        doc.text(homeTrim, x + 13, matchY);

        // Marcador o vs
        doc.setFont("helvetica", "bold");
        if (hasScore) {
          doc.setTextColor(15, 23, 42);
          doc.text(`${m.homeScore}-${m.awayScore}`, x + 50, matchY, { align: "center" });
        } else {
          doc.setTextColor(148, 163, 184);
          doc.text("vs", x + 50, matchY, { align: "center" });
        }

        // Texto visitante
        doc.setFont("helvetica", "normal");
        doc.setTextColor(15, 23, 42);
        const awayTrim = away.length > 15 ? away.slice(0, 14) + "…" : away;
        doc.text(awayTrim, x + colWidth - 2.5, matchY, { align: "right" });

        matchY += 5.5;
      });
    });
  }

  // Descargar PDF directamente
  const fileName = `Calendario_${settings.name.replace(/\s+/g, "_")}_${settings.season}.pdf`;
  doc.save(fileName);
}
