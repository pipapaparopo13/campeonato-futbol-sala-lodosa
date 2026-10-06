import type { Metadata } from "next";
import Link from "next/link";
import { createTeam } from "@/app/actions";
import { getDB } from "@/lib/db";
import { Card, Flash, PageTitle, TeamBadge } from "@/components/ui";

import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Equipos" };

export default async function AdminEquipos({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  await requireAdmin();
  const [db, sp] = await Promise.all([getDB(), searchParams]);
  return (
    <>
      <PageTitle subtitle="Pulsa en un equipo para cambiar su nombre, color y plantilla.">Equipos y jugadores</PageTitle>
      <Flash searchParams={sp} />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {db.teams.map((t) => {
          const n = db.players.filter((p) => p.teamId === t.id).length;
          return (
            <Link key={t.id} href={`/admin/equipos/${t.id}`} className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 hover:ring-emerald-400">
              <TeamBadge team={t} />
              <div>
                <div className="font-semibold">{t.name}</div>
                <div className="text-xs text-slate-500">{n} jugadores</div>
              </div>
              <span className="ml-auto text-sm text-emerald-700">Editar →</span>
            </Link>
          );
        })}
      </div>
      <Card title="Añadir equipo">
        <form action={createTeam} className="flex flex-wrap gap-3">
          <input name="name" required placeholder="Nombre del equipo" className="input max-w-xs" />
          <button className="btn">Añadir</button>
        </form>
      </Card>
    </>
  );
}
