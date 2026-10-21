"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Match, Settings, Team } from "@/lib/types";
import { formatDate } from "@/lib/stats";
import { updateRefereeFee } from "@/app/actions";

interface Props {
  matches: Match[];
  teams: Record<string, Team>;
  settings: Settings;
}

interface RefereeStat {
  name: string;
  count: number;
  yellowCards: number;
  redCards: number;
  matches: {
    match: Match;
    home: Team | undefined;
    away: Team | undefined;
    yellows: number;
    reds: number;
  }[];
}

export function AdminArbitrosPanel({ matches, teams, settings }: Props) {
  const [fee, setFee] = useState<number>(settings.refereeFee ?? 20);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedReferee, setExpandedReferee] = useState<string | null>(null);

  // Agrupar y calcular estadísticas por árbitro
  const { refereeStats, unassignedMatches, totalMatchesArbitrated, totalArbitros } = useMemo(() => {
    const map = new Map<string, RefereeStat>();
    const unassigned: Match[] = [];
    let arbitratedCount = 0;

    for (const m of matches) {
      if (m.status !== "played" && !m.referee?.trim()) {
        continue;
      }

      const refName = m.referee?.trim();

      if (!refName) {
        if (m.status === "played") {
          unassigned.push(m);
        }
        continue;
      }

      arbitratedCount++;
      const key = refName.toLowerCase();

      // Contar tarjetas en el partido
      let matchYellows = 0;
      let matchReds = 0;
      for (const ev of m.events || []) {
        if (ev.type === "yellow") matchYellows++;
        if (ev.type === "red") matchReds++;
      }

      const existing = map.get(key);
      const matchDetail = {
        match: m,
        home: teams[m.homeTeamId],
        away: teams[m.awayTeamId],
        yellows: matchYellows,
        reds: matchReds,
      };

      if (!existing) {
        map.set(key, {
          name: refName,
          count: 1,
          yellowCards: matchYellows,
          redCards: matchReds,
          matches: [matchDetail],
        });
      } else {
        existing.count += 1;
        existing.yellowCards += matchYellows;
        existing.redCards += matchReds;
        existing.matches.push(matchDetail);
      }
    }

    // Ordenar árbitros por número de partidos (mayor a menor)
    const list = Array.from(map.values()).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    return {
      refereeStats: list,
      unassignedMatches: unassigned,
      totalMatchesArbitrated: arbitratedCount,
      totalArbitros: list.length,
    };
  }, [matches, teams]);

  // Filtrado de búsqueda
  const filteredReferees = useMemo(() => {
    if (!searchTerm.trim()) return refereeStats;
    const q = searchTerm.toLowerCase();
    return refereeStats.filter((r) => r.name.toLowerCase().includes(q));
  }, [refereeStats, searchTerm]);

  // Total global a pagar
  const totalAmountToPay = totalMatchesArbitrated * fee;

  // Compartir por WhatsApp el resumen de pagos
  function handleShareWhatsApp() {
    if (refereeStats.length === 0) return;
    const lines: string[] = [];
    lines.push(`⚖️ *LIQUIDACIÓN DE ARBITRAJES - ${settings.name.toUpperCase()}*`);
    lines.push(`Temporada: ${settings.season}`);
    lines.push(`Tarifa: ${fee}€ / partido`);
    lines.push(`Total partidos: ${totalMatchesArbitrated} | Total liquidación: ${totalAmountToPay}€\n`);
    lines.push(`*DESGLOSE POR ÁRBITRO:*`);

    for (const r of refereeStats) {
      lines.push(`• *${r.name}*: ${r.count} partido${r.count > 1 ? "s" : ""} = *${r.count * fee}€* (${r.yellowCards}🟨 ${r.redCards}🟥)`);
    }

    const text = encodeURIComponent(lines.join("\n"));
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  }

  return (
    <div className="space-y-6">
      {/* 1. Tarjetas de Resumen Financiero */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Árbitros Activos
          </div>
          <div className="mt-1 text-2xl font-black text-slate-800">
            {totalArbitros}
          </div>
          <div className="text-[11px] text-slate-400">Registrados en actas</div>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 shadow-xs">
          <div className="text-xs font-semibold text-blue-800 uppercase tracking-wide">
            Partidos Arbitrados
          </div>
          <div className="mt-1 text-2xl font-black text-blue-700">
            {totalMatchesArbitrated}
          </div>
          <div className="text-[11px] text-blue-600">Con árbitro asignado</div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-xs">
          <div className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">
            Tarifa por Partido
          </div>
          <div className="mt-1 text-2xl font-black text-emerald-700">
            {fee}€
          </div>
          <div className="text-[11px] text-emerald-600">Por encuentro pitado</div>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-xs">
          <div className="text-xs font-semibold text-amber-800 uppercase tracking-wide">
            Total a Liquidar
          </div>
          <div className="mt-1 text-2xl font-black text-amber-700">
            {totalAmountToPay}€
          </div>
          <div className="text-[11px] text-amber-600">A pagar a final de temporada</div>
        </div>
      </div>

      {/* 2. Ajuste de tarifa y acciones de exportación */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <form action={updateRefereeFee} className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="redirectTo" value="/admin/arbitros" />
          <div className="flex items-center gap-2">
            <label htmlFor="refereeFee" className="text-xs font-bold text-slate-700 whitespace-nowrap">
              💶 Precio por partido:
            </label>
            <div className="relative">
              <input
                id="refereeFee"
                name="refereeFee"
                type="number"
                min="0"
                step="1"
                value={fee}
                onChange={(e) => setFee(Math.max(0, Number(e.target.value) || 0))}
                className="input w-24 py-1.5 pl-3 pr-7 text-sm font-extrabold text-slate-800"
              />
              <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">€</span>
            </div>
          </div>
          <button
            type="submit"
            className="rounded-xl bg-slate-900 hover:bg-slate-800 px-3 py-1.5 text-xs font-bold text-white shadow-xs"
          >
            Guardar tarifa oficial
          </button>
        </form>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleShareWhatsApp}
            disabled={refereeStats.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs disabled:opacity-50"
          >
            <span>📱 Enviar resumen WhatsApp</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="btn-secondary py-1.5 text-xs font-bold"
          >
            🖨 Imprimir liquidación
          </button>
        </div>
      </div>

      {/* 3. Aviso de partidos jugados sin árbitro anotado */}
      {unassignedMatches.length > 0 && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900 shadow-xs">
          <div className="flex items-center gap-2 font-bold text-sm">
            <span>⚠️</span>
            <span>Hay {unassignedMatches.length} partido(s) disputado(s) sin árbitro registrado en el acta:</span>
          </div>
          <p className="mt-1 text-xs text-amber-800">
            Para que el cálculo de pagos sea exacto, anota el nombre del colegiado que pitó cada encuentro.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {unassignedMatches.map((m) => (
              <Link
                key={m.id}
                href={`/admin/partidos/${m.id}`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1 text-xs font-bold text-amber-950 border border-amber-300 hover:bg-amber-100 shadow-2xs"
              >
                <span>J{m.round}: {teams[m.homeTeamId]?.shortName || "L"} vs {teams[m.awayTeamId]?.shortName || "V"}</span>
                <span className="text-amber-600">→ Asignar</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 4. Buscador */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Buscar por nombre de árbitro..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input py-2 pl-9 text-xs font-semibold"
          />
          <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
        </div>
        <div className="text-xs font-bold text-slate-500">
          Mostrando {filteredReferees.length} árbitro(s)
        </div>
      </div>

      {/* 5. Listado de Árbitros y Desglose */}
      {filteredReferees.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-slate-500">
          <div className="text-4xl mb-2">⚖️</div>
          <h3 className="font-extrabold text-base text-slate-800">No hay árbitros registrados todavía</h3>
          <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
            A medida que la mesa o el administrador suba las actas o edite los partidos y escriba el nombre del colegiado, aparecerá aquí automáticamente con el número de partidos acumulados y su liquidación económica.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReferees.map((ref) => {
            const isExpanded = expandedReferee === ref.name;
            const refTotalAmount = ref.count * fee;

            return (
              <div
                key={ref.name}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition hover:border-slate-300"
              >
                {/* Fila principal del árbitro */}
                <div className="flex flex-wrap items-center justify-between gap-4 p-5">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-lg font-black text-white shadow-sm">
                      ⚖️
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-black text-slate-900 text-base truncate">
                        {ref.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <span className="font-bold text-slate-700">
                          {ref.count} partido{ref.count > 1 ? "s" : ""} arbitrado{ref.count > 1 ? "s" : ""}
                        </span>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
                          {ref.yellowCards} 🟨
                        </span>
                        <span className="inline-flex items-center gap-1 font-semibold text-rose-700">
                          {ref.redCards} 🟥
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Liquidación económica y botón de desglose */}
                  <div className="flex items-center gap-5">
                    <div className="text-right">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        A Pagar ({ref.count} × {fee}€)
                      </div>
                      <div className="font-mono text-xl sm:text-2xl font-black text-emerald-700">
                        {refTotalAmount}€
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setExpandedReferee(isExpanded ? null : ref.name)}
                      className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
                        isExpanded
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {isExpanded ? "Ocultar partidos ▲" : "Ver partidos ▼"}
                    </button>
                  </div>
                </div>

                {/* Desglose de partidos arbitrados (desplegable) */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/80 p-4 sm:p-5">
                    <div className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3">
                      Partidos arbitrados por {ref.name} ({ref.matches.length}):
                    </div>

                    <div className="divide-y divide-slate-200/80 rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                      {ref.matches.map(({ match: m, home, away, yellows, reds }) => (
                        <div
                          key={m.id}
                          className="flex flex-wrap items-center justify-between gap-3 p-3 text-xs hover:bg-slate-50"
                        >
                          <div className="flex items-center gap-3">
                            <span className="rounded bg-slate-100 px-2 py-0.5 font-bold text-[11px] text-slate-700 uppercase">
                              {m.competition === "copa" ? "Copa" : "Liga"} · J{m.round}
                            </span>
                            <span className="text-slate-500 text-[11px]">
                              {m.date ? formatDate(m.date) : "Sin fecha"}
                            </span>
                          </div>

                          {/* Equipos y resultado */}
                          <div className="flex items-center gap-2 font-semibold text-slate-800">
                            <span className="truncate max-w-[120px] sm:max-w-[160px] text-right">
                              {home?.name || "Local"}
                            </span>
                            <span className="rounded bg-slate-900 px-2 py-0.5 font-mono font-bold text-white text-[11px]">
                              {m.homeScore ?? 0} - {m.awayScore ?? 0}
                            </span>
                            <span className="truncate max-w-[120px] sm:max-w-[160px]">
                              {away?.name || "Visitante"}
                            </span>
                          </div>

                          {/* Tarjetas y enlaces */}
                          <div className="flex items-center gap-3">
                            {(yellows > 0 || reds > 0) && (
                              <span className="text-slate-500 font-semibold text-[11px]">
                                {yellows > 0 && `${yellows} 🟨 `}
                                {reds > 0 && `${reds} 🟥`}
                              </span>
                            )}

                            {m.hasActaPhoto && (
                              <Link
                                href="/admin/actas"
                                className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 font-bold text-[10px] text-emerald-800 hover:bg-emerald-100"
                              >
                                📷 Acta original
                              </Link>
                            )}

                            <Link
                              href={`/admin/partidos/${m.id}`}
                              className="font-bold text-emerald-700 hover:underline text-[11px]"
                            >
                              Editar acta →
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
