"use client";

import { useState } from "react";
import { scanActaPhoto } from "@/app/actions";
import { compressImage } from "@/lib/image-compress";

export function AiActaScanner({ matchId }: { matchId: string }) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setPreview(null);
      setSelectedFile(null);
      return;
    }
    setErrorMsg(null);
    try {
      const compressed = await compressImage(file, 2048, 2048, 0.82);
      setSelectedFile(compressed);
      const reader = new FileReader();
      reader.onload = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(compressed);
    } catch {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  return (
    <div className="rounded-2xl border-2 border-dashed border-emerald-300 bg-gradient-to-br from-emerald-50/70 to-teal-50/40 p-5 shadow-sm">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-lg text-white shadow-xs">
          🤖
        </span>
        <div>
          <h3 className="font-extrabold text-slate-900 text-base">
            Rellenar acta automáticamente con IA
          </h3>
          <p className="text-xs text-slate-600">
            Haz una fotografía del acta física en papel. La IA detectará goles, autores, minutos, tarjetas y árbitro.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
          ⚠️ {errorMsg}
        </div>
      )}

      <form
        action={async (formData) => {
          setLoading(true);
          setErrorMsg(null);
          try {
            if (selectedFile) {
              formData.set("photo", selectedFile);
            }
            await scanActaPhoto(formData);
          } catch (err: any) {
            const msg = err?.message || String(err);
            if (msg.includes("NEXT_REDIRECT")) {
              throw err;
            }
            if (msg.includes("441") || msg.includes("Server Components")) {
              setErrorMsg("La fotografía es demasiado pesada para el servidor. Intenta recortarla o hacerla más cerca.");
            } else {
              setErrorMsg(msg || "Error al procesar la foto con IA.");
            }
          } finally {
            setLoading(false);
          }
        }}
        className="mt-4 space-y-4"
      >
        <input type="hidden" name="matchId" value={matchId} />

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <label className="flex w-full sm:w-auto cursor-pointer items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-slate-800 shadow-sm ring-1 ring-slate-300 transition hover:bg-slate-50 hover:ring-emerald-400">
            <span>📷</span>
            <span>Hacer foto o subir imagen del acta</span>
            <input
              type="file"
              name="photo"
              accept="image/*"
              capture="environment"
              required
              className="sr-only"
              onChange={handleFileChange}
            />
          </label>

          {preview && (
            <span className="text-xs font-semibold text-emerald-800">
              ✓ Foto seleccionada lista para analizar
            </span>
          )}
        </div>

        {preview && (
          <div className="relative max-w-xs overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Vista previa del acta"
              className="max-h-52 w-full object-contain"
            />
            <div className="bg-slate-900/70 px-3 py-1 text-center text-[10px] text-white">
              Fotografía del acta
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="btn bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Analizando letra y eventos con IA...</span>
              </span>
            ) : (
              <span>✨ Analizar foto y rellenar acta</span>
            )}
          </button>
          <span className="text-[11px] text-slate-500">
            Podrás revisar y corregir cualquier dato antes o después de guardar.
          </span>
        </div>
      </form>
    </div>
  );
}
