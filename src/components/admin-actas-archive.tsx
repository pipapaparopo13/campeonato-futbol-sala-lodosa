"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Match, Team } from "@/lib/types";
import { formatDate } from "@/lib/stats";
import { uploadActaPhotoOnly, deleteActaPhotoAction } from "@/app/actions";
import { compressImage } from "@/lib/image-compress";

interface Props {
  matches: Match[];
  teams: Record<string, Team>;
}

export function AdminActasArchive({ matches, teams }: Props) {
  const [filterStatus, setFilterStatus] = useState<"all" | "with_photo" | "without_photo">("all");
  const [filterCompetition, setFilterCompetition] = useState<"all" | "liga" | "copa">("all");
  const [filterRound, setFilterRound] = useState<string>("all");
  const [selectedPhotoMatch, setSelectedPhotoMatch] = useState<Match | null>(null);
  const [uploadingMatchId, setUploadingMatchId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estadísticas globales
  const stats = useMemo(() => {
    const played = matches.filter((m) => m.status === "played");
    const withPhoto = matches.filter((m) => m.hasActaPhoto);
    const playedWithoutPhoto = played.filter((m) => !m.hasActaPhoto);
    return {
      totalMatches: matches.length,
      playedMatches: played.length,
      withPhotoCount: withPhoto.length,
      withoutPhotoCount: playedWithoutPhoto.length,
    };
  }, [matches]);

  // Lista de jornadas disponibles para el filtro
  const rounds = useMemo(() => {
    const set = new Set<number>();
    for (const m of matches) {
      set.add(m.round);
    }
    return Array.from(set).sort((a, b) => a - b);
  }, [matches]);

  // Partidos filtrados
  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      if (filterCompetition !== "all" && (m.competition ?? "liga") !== filterCompetition) {
        return false;
      }
      if (filterRound !== "all" && m.round !== Number(filterRound)) {
        return false;
      }
      if (filterStatus === "with_photo" && !m.hasActaPhoto) {
        return false;
      }
      if (filterStatus === "without_photo" && (m.hasActaPhoto || m.status !== "played")) {
        return false;
      }
      return true;
    });
  }, [matches, filterCompetition, filterRound, filterStatus]);

  async function handleDirectUpload(e: React.ChangeEvent<HTMLInputElement>, matchId: string) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSubmitting(true);
    setUploadingMatchId(matchId);

    try {
      const compressed = await compressImage(file, 2048, 2048, 0.82);
      const fd = new FormData();
      fd.append("matchId", matchId);
      fd.append("photo", compressed);
      fd.append("redirectTo", "/admin/actas");
      await uploadActaPhotoOnly(fd);
    } catch (err) {
      console.error("Error al subir fotografía del acta:", err);
      alert("Error al procesar la imagen. Inténtalo de nuevo.");
      setIsSubmitting(false);
      setUploadingMatchId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Tarjetas de resumen estadístico */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Partidos Jugados
          </div>
          <div className="mt-1 text-2xl font-black text-slate-800">
            {stats.playedMatches}{" "}
            <span className="text-xs font-normal text-slate-400">/ {stats.totalMatches}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-xs">
          <div className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">
            Actas en Papel Guardadas
          </div>
          <div className="mt-1 text-2xl font-black text-emerald-700">
            {stats.withPhotoCount}
          </div>
          <div className="text-[11px] font-medium text-emerald-600">
            {stats.playedMatches > 0
              ? `${Math.round((stats.withPhotoCount / stats.playedMatches) * 100)}% de los jugados`
              : "0%"}
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-xs">
          <div className="text-xs font-semibold text-amber-800 uppercase tracking-wide">
            Pendientes de Foto
          </div>
          <div className="mt-1 text-2xl font-black text-amber-700">
            {stats.withoutPhotoCount}
          </div>
          <div className="text-[11px] font-medium text-amber-600">
            Jugados sin fotografía física
          </div>
        </div>

        <div className="rounded-2xl border border-sky-200 bg-sky-50/60 p-4 shadow-xs">
          <div className="text-xs font-semibold text-sky-800 uppercase tracking-wide">
            Acceso
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-sm font-bold text-sky-900">
            <span>🔒 Exclusivo Admin</span>
          </div>
          <div className="text-[11px] text-sky-700">
            No visible para público ni árbitros
          </div>
        </div>
      </div>

      {/* 2. Barra de filtros */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterStatus("all")}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
              filterStatus === "all"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Todos ({matches.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus("with_photo")}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
              filterStatus === "with_photo"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            }`}
          >
            📸 Con fotografía ({stats.withPhotoCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus("without_photo")}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
              filterStatus === "without_photo"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-amber-50 text-amber-800 hover:bg-amber-100"
            }`}
          >
            ⚠️ Sin fotografía ({stats.withoutPhotoCount})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filtro competición */}
          <select
            value={filterCompetition}
            onChange={(e) => setFilterCompetition(e.target.value as any)}
            className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500"
          >
            <option value="all">Todas las competiciones</option>
            <option value="liga">Liga</option>
            <option value="copa">Copa</option>
          </select>

          {/* Filtro jornada */}
          <select
            value={filterRound}
            onChange={(e) => setFilterRound(e.target.value)}
            className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500"
          >
            <option value="all">Todas las jornadas</option>
            {rounds.map((r) => (
              <option key={r} value={r}>
                Jornada {r}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. Listado de actas */}
      {filteredMatches.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-slate-500">
          <div className="text-4xl mb-2">📂</div>
          <p className="font-semibold">No hay actas que coincidan con los filtros seleccionados.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredMatches.map((m) => {
            const home = teams[m.homeTeamId];
            const away = teams[m.awayTeamId];
            const isPlayed = m.status === "played";

            return (
              <div
                key={m.id}
                className={`flex flex-col justify-between rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md ${
                  m.hasActaPhoto
                    ? "border-emerald-200 ring-1 ring-emerald-100"
                    : isPlayed
                      ? "border-amber-200 ring-1 ring-amber-100"
                      : "border-slate-200"
                }`}
              >
                <div>
                  {/* Encabezado: Competición, Jornada y Fecha */}
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-2">
                    <span className="rounded bg-slate-100 px-2 py-0.5 uppercase tracking-wide text-slate-700">
                      {m.competition === "copa" ? `Copa · ${m.stage || "Jornada"}` : "Liga"} · J{m.round}
                    </span>
                    <span>{m.date ? formatDate(m.date) : "Fecha por fijar"}</span>
                  </div>

                  {/* Enfrentamiento y marcador */}
                  <div className="my-2 rounded-xl bg-slate-50 p-3 border border-slate-100">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: home?.color || "#10b981" }}
                        />
                        <span className="font-bold text-slate-800 truncate">
                          {home?.name || "Local"}
                        </span>
                      </div>
                      <span className="font-mono text-sm font-black text-slate-900">
                        {isPlayed ? (m.homeScore ?? 0) : "-"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-xs mt-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: away?.color || "#2563eb" }}
                        />
                        <span className="font-bold text-slate-800 truncate">
                          {away?.name || "Visitante"}
                        </span>
                      </div>
                      <span className="font-mono text-sm font-black text-slate-900">
                        {isPlayed ? (m.awayScore ?? 0) : "-"}
                      </span>
                    </div>
                  </div>

                  {/* Información adicional: Árbitro y estado */}
                  <div className="text-xs space-y-1 mb-3">
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-[11px] text-slate-400">Árbitro:</span>
                      <span className="font-semibold text-slate-800">
                        {m.referee ? `⚖️ ${m.referee}` : "— Sin anotar —"}
                      </span>
                    </div>

                    {m.notes && (
                      <p className="line-clamp-2 text-[11px] text-slate-500 italic bg-slate-50/80 p-1.5 rounded-lg border border-slate-100">
                        &quot;{m.notes}&quot;
                      </p>
                    )}
                  </div>
                </div>

                {/* Zona de Fotografía del Acta */}
                <div className="border-t border-slate-100 pt-3">
                  {m.hasActaPhoto ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          ✓ Foto guardada
                        </span>
                        {m.actaPhotoUploadedAt && (
                          <span className="text-[10px] text-slate-400">
                            {new Date(m.actaPhotoUploadedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      {/* Miniatura que abre el visor */}
                      <button
                        type="button"
                        onClick={() => setSelectedPhotoMatch(m)}
                        className="group relative w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-900 text-left transition hover:border-emerald-500"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/api/actas/${m.id}`}
                          alt="Fotografía del acta"
                          className="h-32 w-full object-cover opacity-85 transition group-hover:opacity-100 group-hover:scale-102"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition group-hover:opacity-100">
                          <span className="rounded-xl bg-white/95 px-3 py-1.5 text-xs font-black text-slate-900 shadow-md">
                            🔍 Ver en grande
                          </span>
                        </div>
                      </button>

                      {/* Botones de acción */}
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <label className="cursor-pointer text-[11px] font-semibold text-emerald-700 hover:underline">
                          <span>🔄 Cambiar foto</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleDirectUpload(e, m.id)}
                            disabled={isSubmitting}
                          />
                        </label>

                        <form action={deleteActaPhotoAction}>
                          <input type="hidden" name="matchId" value={m.id} />
                          <input type="hidden" name="redirectTo" value="/admin/actas" />
                          <button
                            type="submit"
                            onClick={(e) => {
                              if (!confirm("¿Seguro que deseas eliminar la fotografía guardada de este acta?")) {
                                e.preventDefault();
                              }
                            }}
                            className="text-[11px] font-semibold text-rose-600 hover:underline"
                          >
                            Eliminar foto
                          </button>
                        </form>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-3 text-center">
                        <div className="text-xl mb-1">📷</div>
                        <p className="text-[11px] text-slate-500 mb-2">
                          Sin fotografía física guardada
                        </p>
                        <label
                          className={`btn-secondary inline-flex w-full cursor-pointer items-center justify-center gap-1 py-1.5 text-xs font-bold text-emerald-800 ${
                            isSubmitting && uploadingMatchId === m.id ? "opacity-50 pointer-events-none" : ""
                          }`}
                        >
                          <span>{isSubmitting && uploadingMatchId === m.id ? "Subiendo..." : "Subir fotografía"}</span>
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={(e) => handleDirectUpload(e, m.id)}
                            disabled={isSubmitting}
                          />
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Enlace para editar el partido */}
                  <div className="mt-2 text-right">
                    <Link
                      href={`/admin/partidos/${m.id}`}
                      className="text-[11px] font-bold text-slate-500 hover:text-emerald-700 hover:underline"
                    >
                      Editar datos del partido →
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Modal para ver la fotografía a tamaño completo con zoom */}
      {selectedPhotoMatch && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-xs"
          onClick={() => setSelectedPhotoMatch(null)}
        >
          <div
            className="relative flex max-h-[92vh] max-w-4xl flex-col rounded-2xl bg-slate-900 border border-slate-800 text-white shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera del modal */}
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-3">
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-white">
                  Fotografía del Acta Oficial
                </h3>
                <p className="text-xs text-slate-400">
                  {teams[selectedPhotoMatch.homeTeamId]?.name} vs {teams[selectedPhotoMatch.awayTeamId]?.name} · Jornada {selectedPhotoMatch.round}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`/api/actas/${selectedPhotoMatch.id}`}
                  download={`acta-jornada-${selectedPhotoMatch.round}-${teams[selectedPhotoMatch.homeTeamId]?.shortName || "L"}-vs-${teams[selectedPhotoMatch.awayTeamId]?.shortName || "V"}.jpg`}
                  className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white shadow-xs"
                >
                  ⬇ Descargar imagen
                </a>
                <button
                  type="button"
                  onClick={() => setSelectedPhotoMatch(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                  aria-label="Cerrar visor"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Imagen ampliada */}
            <div className="flex-1 overflow-auto p-2 bg-black flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/actas/${selectedPhotoMatch.id}`}
                alt="Acta original en papel"
                className="max-h-[75vh] w-auto max-w-full rounded object-contain shadow-lg"
              />
            </div>

            {/* Pie con detalles del árbitro y notas */}
            <div className="border-t border-slate-800 bg-slate-950/80 px-4 py-2.5 text-xs text-slate-300 flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-slate-400">Árbitro: </span>
                <span className="font-bold text-white">
                  {selectedPhotoMatch.referee || "No especificado"}
                </span>
                {selectedPhotoMatch.status === "played" && (
                  <span className="ml-3 text-emerald-400 font-bold">
                    Resultado: {selectedPhotoMatch.homeScore} - {selectedPhotoMatch.awayScore}
                  </span>
                )}
              </div>
              <Link
                href={`/admin/partidos/${selectedPhotoMatch.id}`}
                className="text-emerald-400 hover:underline font-semibold"
              >
                Abrir editor del partido →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
