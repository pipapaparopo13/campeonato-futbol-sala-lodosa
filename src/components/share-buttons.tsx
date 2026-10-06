"use client";

import { useState } from "react";
import type { Match, MatchEvent, Player, Team } from "@/lib/types";
import { EVENT_LABELS } from "@/lib/types";
import { formatDate } from "@/lib/stats";

export function ShareMatchButtons({
  match,
  home,
  away,
  events,
  players,
}: {
  match: Match;
  home: Team | undefined;
  away: Team | undefined;
  events: MatchEvent[];
  players: Map<string, Player>;
}) {
  const [copied, setCopied] = useState(false);

  const played = match.status === "played";
  const homeName = home?.name ?? "Local";
  const awayName = away?.name ?? "Visitante";

  function generateText() {
    const lines: string[] = [];
    lines.push(`⚽ CAMPEONATO FÚTBOL SALA LODOSA 2026/27`);
    lines.push(
      `${match.competition === "copa" ? "🏆 COPA" : "🏆 LIGA"} · Jornada ${match.round}${match.stage ? ` (${match.stage})` : ""}`,
    );
    lines.push(`📅 ${formatDate(match.date, { long: true })} · ${match.time || "17:00"} h`);
    lines.push(`📍 ${match.venue || "Polideportivo Municipal de Lodosa"}`);
    lines.push(`────────────────────────`);

    if (played) {
      lines.push(`🏁 RESULTADO FINAL:`);
      lines.push(`👉 ${homeName} ${match.homeScore} - ${match.awayScore} ${awayName}`);
    } else {
      lines.push(`⏳ PRÓXIMO ENCUENTRO:`);
      lines.push(`👉 ${homeName} vs ${awayName}`);
    }
    lines.push(`────────────────────────`);

    // Goles
    const goals = events.filter((e) => e.type === "goal" || e.type === "own_goal");
    if (goals.length > 0) {
      lines.push(`⚽ GOLES:`);
      for (const g of goals) {
        const p = players.get(g.playerId);
        const min = g.minute !== null ? ` (${g.minute}')` : "";
        lines.push(`• ${p?.name ?? "Gol"}${min}${g.type === "own_goal" ? " [PP]" : ""}`);
      }
      lines.push(`────────────────────────`);
    }

    // Tarjetas
    const cards = events.filter((e) => e.type === "yellow" || e.type === "red");
    if (cards.length > 0) {
      lines.push(`🟨 TARJETAS Y SANCIONES:`);
      for (const c of cards) {
        const p = players.get(c.playerId);
        const icon = c.type === "red" ? "🟥" : "🟨";
        const min = c.minute !== null ? ` (${c.minute}')` : "";
        lines.push(`• ${icon} ${p?.name ?? "Jugador"}${min}`);
      }
      lines.push(`────────────────────────`);
    }

    if (typeof window !== "undefined") {
      lines.push(`🔗 Ver acta completa y detalles:`);
      lines.push(window.location.href);
    }

    return lines.join("\n");
  }

  function handleWhatsApp() {
    const text = generateText();
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  }

  async function handleCopy() {
    const text = generateText();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <button
        onClick={handleWhatsApp}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700"
        title="Enviar acta por WhatsApp"
      >
        <span>📲</span>
        <span>Compartir en WhatsApp</span>
      </button>

      <button
        onClick={handleCopy}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
      >
        <span>📋</span>
        <span>{copied ? "¡Copiado!" : "Copiar resumen"}</span>
      </button>

      <button
        onClick={handlePrint}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        title="Imprimir acta oficial o guardar en PDF"
      >
        <span>🖨️</span>
        <span>Imprimir acta / PDF</span>
      </button>
    </div>
  );
}
