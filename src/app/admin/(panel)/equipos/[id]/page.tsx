import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { addPlayer, deletePlayer, deleteTeam, updatePlayer, updateTeam } from "@/app/actions";
import { getDB } from "@/lib/db";
import { Card, Empty, Flash, PageTitle, TeamBadge } from "@/components/ui";
import { ConfirmButton } from "@/components/confirm-button";

import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Editar equipo" };

export default async function AdminEquipo({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  await requireAdmin();
  const [{ id }, sp, db] = await Promise.all([params, searchParams, getDB()]);
  const team = db.teams.find((t) => t.id === id);
  if (!team) notFound();
  const players = db.players
    .filter((p) => p.teamId === id)
    .sort((a, b) => (a.number ?? 999) - (b.number ?? 999) || a.name.localeCompare(b.name));

  return (
    <>
      <Link href="/admin/equipos" className="mb-3 inline-block text-sm font-semibold text-emerald-700 hover:underline">
        ← Equipos
      </Link>
      <PageTitle>
        <span className="flex items-center gap-3">
          <TeamBadge team={team} /> {team.name}
        </span>
      </PageTitle>
      <Flash searchParams={sp} />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Card title="Datos del equipo">
          <form action={updateTeam} className="space-y-4">
            <input type="hidden" name="id" value={team.id} />
            <div>
              <label className="label" htmlFor="name">Nombre</label>
              <input id="name" name="name" defaultValue={team.name} required className="input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="shortName">Abreviatura</label>
                <input id="shortName" name="shortName" defaultValue={team.shortName} maxLength={4} className="input" />
              </div>
              <div>
                <label className="label" htmlFor="color">Color</label>
                <input id="color" name="color" type="color" defaultValue={team.color} className="h-10 w-full cursor-pointer rounded-lg border border-slate-300" />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="delegate">Delegado (opcional)</label>
              <input id="delegate" name="delegate" defaultValue={team.delegate} className="input" />
            </div>
            <button className="btn">Guardar equipo</button>
          </form>
          <form action={deleteTeam} className="mt-6 border-t border-slate-100 pt-4">
            <input type="hidden" name="id" value={team.id} />
            <ConfirmButton message={`¿Borrar el equipo «${team.name}» y todos sus jugadores?`}>
              Borrar equipo
            </ConfirmButton>
          </form>
        </Card>

        <Card title={`Plantilla (${players.length})`}>
          <form action={addPlayer} className="mb-5 flex flex-wrap items-end gap-2 rounded-xl bg-slate-50 p-3">
            <input type="hidden" name="teamId" value={team.id} />
            <div className="w-20">
              <label className="label" htmlFor="new-number">Dorsal</label>
              <input id="new-number" name="number" type="number" min={0} max={99} className="input" />
            </div>
            <div className="min-w-[180px] flex-1">
              <label className="label" htmlFor="new-name">Nombre y apellidos</label>
              <input id="new-name" name="name" required className="input" />
            </div>
            <button className="btn">+ Añadir jugador</button>
          </form>

          {players.length ? (
            <ul className="space-y-2">
              {players.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-2">
                  <form action={updatePlayer} className="flex flex-1 flex-wrap items-center gap-2">
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="teamId" value={team.id} />
                    <input name="number" type="number" min={0} max={99} defaultValue={p.number ?? ""} className="input w-20" aria-label="Dorsal" />
                    <input name="name" defaultValue={p.name} required className="input min-w-[160px] flex-1" aria-label="Nombre" />
                    <button className="btn-secondary">Guardar</button>
                  </form>
                  <form action={deletePlayer}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="teamId" value={team.id} />
                    <ConfirmButton message={`¿Borrar a ${p.name}?`}>Borrar</ConfirmButton>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Aún no hay jugadores. Añade el primero arriba.</Empty>
          )}
        </Card>
      </div>
    </>
  );
}
