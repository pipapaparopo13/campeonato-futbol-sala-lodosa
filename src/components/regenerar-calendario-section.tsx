"use client";

import { useState } from "react";
import { generateFixtures } from "@/app/actions";

interface Props {
  teamsCount: number;
}

export function RegenerarCalendarioSection({ teamsCount }: Props) {
  const [doubleRound, setDoubleRound] = useState(true);
  const [replace, setReplace] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (!replace) {
      // Si no marca borrar partidos, el backend fallará si ya hay partidos
      return;
    }

    if (!confirmed) {
      e.preventDefault();
      alert("Debes marcar la casilla de confirmación de seguridad antes de continuar.");
      return;
    }

    const seguro = window.confirm(
      "⚠️ ¿ESTÁS TOTALMENTE SEGURO?\n\nEsta acción borrará TODOS los partidos existentes, resultados, actas y estadísticas para generar un calendario de liga nuevo desde cero. Esta operación no se puede deshacer."
    );

    if (!seguro) {
      e.preventDefault();
    }
  }

  return (
    <div className="mt-12 rounded-2xl border-2 border-dashed border-red-300 bg-red-50/60 p-6 sm:p-8 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
        <div className="max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-800">
            <span>⚠️</span>
            <span>Zona de peligro / Acción destructiva</span>
          </div>
          <h3 className="text-lg font-black text-red-950">
            Regenerar calendario automático de Liga
          </h3>
          <p className="text-sm text-red-800/90 leading-relaxed">
            Esta herramienta crea un calendario completo round-robin utilizando los <strong>{teamsCount} equipos</strong> registrados actualmente en el sistema. 
            Al regenerar el calendario, se sobreescribirá la planificación actual.
          </p>
        </div>

        <div className="w-full md:w-auto md:min-w-[320px] rounded-xl bg-white p-5 border border-red-200 shadow-md">
          <form action={generateFixtures} onSubmit={handleSubmit} className="space-y-4 text-sm">
            <label className="flex items-center gap-2.5 font-medium text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                name="doubleRound"
                checked={doubleRound}
                onChange={(e) => setDoubleRound(e.target.checked)}
                className="h-4 w-4 rounded text-red-600 focus:ring-red-500"
              />
              <span>Ida y vuelta (18 jornadas)</span>
            </label>

            <div className="rounded-lg border border-red-200 bg-red-50/50 p-3 space-y-2.5">
              <label className="flex items-start gap-2.5 font-bold text-red-900 cursor-pointer text-xs sm:text-sm">
                <input
                  type="checkbox"
                  name="replace"
                  checked={replace}
                  onChange={(e) => {
                    setReplace(e.target.checked);
                    if (!e.target.checked) setConfirmed(false);
                  }}
                  className="mt-0.5 h-4 w-4 rounded text-red-600 focus:ring-red-500"
                />
                <span>Borrar los partidos existentes y sus actas</span>
              </label>

              {replace && (
                <div className="border-t border-red-200/80 pt-2.5 animate-in fade-in duration-200">
                  <label className="flex items-start gap-2.5 text-xs font-extrabold text-red-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded text-red-700 focus:ring-red-500"
                    />
                    <span>He leído la advertencia y confirmo el borrado</span>
                  </label>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={replace && !confirmed}
              className={`w-full py-2.5 px-4 rounded-xl font-black text-sm tracking-wide transition shadow-sm ${
                replace
                  ? confirmed
                    ? "bg-red-600 text-white hover:bg-red-700 active:scale-98"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300"
                  : "bg-slate-800 text-white hover:bg-slate-900"
              }`}
            >
              🔄 Regenerar calendario de liga
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
