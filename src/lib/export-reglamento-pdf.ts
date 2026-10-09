import jsPDF from "jspdf";
import { LOGO_BASE64 } from "@/lib/logo-base64";

interface SettingsInfo {
  name: string;
  season: string;
  location: string;
  defaultVenue?: string;
}

export function exportReglamentoToPdf({
  articles,
  settings,
}: {
  articles: string[];
  settings: SettingsInfo;
}) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2; // 182 mm
  let currentY = 32;

  function drawHeader() {
    doc.setFillColor(6, 95, 70); // Verde esmeralda
    doc.rect(0, 0, pageWidth, 25, "F");

    try {
      doc.addImage(LOGO_BASE64, "PNG", marginX, 2.5, 20, 20);
    } catch {
      // fallback
    }

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(settings.name.toUpperCase(), marginX + 24, 10);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(209, 250, 229);
    doc.text(`REGLAMENTO OFICIAL Y CÓDIGO DISCIPLINARIO · TEMPORADA ${settings.season}`, marginX + 24, 16);
    doc.text(`${settings.location} · ${settings.defaultVenue || "Polideportivo Municipal de Lodosa"}`, marginX + 24, 21);
  }

  function drawFooter(page: number, totalPagesPlaceholder: boolean = false) {
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Reglamento Oficial · ${settings.name} (${settings.season}) · Página ${page}`,
      pageWidth / 2,
      pageHeight - 6,
      { align: "center" }
    );
  }

  function checkPageBreak(neededSpace: number) {
    if (currentY + neededSpace > pageHeight - 12) {
      doc.addPage();
      drawHeader();
      currentY = 32;
    }
  }

  // Página 1: Cabecera inicial
  drawHeader();

  // SECCIÓN 1: CÓDIGO DISCIPLINARIO Y SANCIONES (Destacado)
  doc.setFillColor(254, 242, 242); // Fondo rojo suave
  doc.setDrawColor(248, 113, 113); // Borde rojo
  doc.roundedRect(marginX, currentY, contentWidth, 58, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(153, 27, 27);
  doc.text("CÓDIGO DE SANCIONES DISCIPLINARIAS DEL COMITÉ", marginX + 4, currentY + 6);

  // Columnas de sanciones
  doc.setFontSize(7.5);
  const colW = (contentWidth - 8) / 2;
  const col1X = marginX + 4;
  const col2X = marginX + 4 + colW + 2;

  // Columna 1: Hacia jugadores
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text("HACIA JUGADORES / CONTRARIOS:", col1X, currentY + 12);

  const sansJugadores = [
    ["Menosprecio a un contrario:", "1 a 3 partidos"],
    ["Insultos a un contrario:", "1 a 3 partidos"],
    ["Insultos graves:", "5 a 10 partidos"],
    ["Intento de agresión:", "5 a 10 partidos"],
    ["Agresión física:", "10 a 15 partidos"],
  ];

  let sy = currentY + 17;
  doc.setFont("helvetica", "normal");
  for (const [motivo, sancion] of sansJugadores) {
    doc.setTextColor(71, 85, 105);
    doc.text(motivo, col1X, sy);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(185, 28, 28);
    doc.text(sancion, col1X + colW - 4, sy, { align: "right" });
    doc.setFont("helvetica", "normal");
    sy += 4.5;
  }

  // Columna 2: Hacia árbitro
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text("HACIA EL ÁRBITRO O MESA:", col2X, currentY + 12);

  const sansArbitro = [
    ["Protestas airadas:", "1 a 3 partidos"],
    ["Menosprecio / insultos:", "3 a 6 partidos"],
    ["Insultos graves o amenazas:", "6 a 12 partidos"],
    ["Intento de agresión:", "10 a 20 partidos"],
    ["Agresión física:", "A PERPETUIDAD"],
  ];

  let ay = currentY + 17;
  doc.setFont("helvetica", "normal");
  for (const [motivo, sancion] of sansArbitro) {
    doc.setTextColor(71, 85, 105);
    doc.text(motivo, col2X, ay);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(185, 28, 28);
    doc.text(sancion, col2X + colW - 4, ay, { align: "right" });
    doc.setFont("helvetica", "normal");
    ay += 4.5;
  }

  // Nota de tarjetas
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.8);
  doc.setTextColor(146, 64, 14);
  doc.text(
    "TARJETAS Y FALTAS: 3ª falta aviso / 4ª doble penalti. Roja: 3 min con uno menos o gol rival. 3 Amarillas = 1 partido sanción.",
    marginX + 4,
    currentY + 54
  );

  currentY += 64;

  // SECCIÓN 2: ARTÍCULOS DEL REGLAMENTO
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("ARTÍCULOS OFICIALES DEL CAMPEONATO", marginX, currentY);
  currentY += 5;

  articles.forEach((art, index) => {
    const artNum = `${index + 1}.`;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    
    // Calcular altura del texto
    const textLines = doc.splitTextToSize(art, contentWidth - 12);
    const boxHeight = Math.max(8, textLines.length * 3.8 + 3.5);

    checkPageBreak(boxHeight + 2);

    // Fondo alterno suave
    if (index % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(marginX, currentY - 3, contentWidth, boxHeight, "F");
    }

    // Número
    doc.setTextColor(6, 95, 70);
    doc.setFont("helvetica", "bold");
    doc.text(artNum, marginX + 1.5, currentY + 0.5);

    // Texto del artículo
    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);
    doc.text(textLines, marginX + 9, currentY + 0.5);

    currentY += boxHeight;
  });

  // Numerar páginas al final
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(i);
  }

  // Guardar archivo
  const fileName = `Reglamento_${settings.name.replace(/\s+/g, "_")}_${settings.season}.pdf`;
  doc.save(fileName);
}
