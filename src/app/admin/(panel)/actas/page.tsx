import type { Metadata } from "next";
import { getDB } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { PageTitle, Flash } from "@/components/ui";
import { AdminActasArchive } from "@/components/admin-actas-archive";
import { teamMap } from "@/lib/stats";
import type { Team } from "@/lib/types";

export const metadata: Metadata = {
  title: "Archivo de Actas",
  robots: { index: false },
};

export default async function AdminActasPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  await requireAdmin();
  const [db, sp] = await Promise.all([getDB(), searchParams]);

  const teamsObj: Record<string, Team> = {};
  for (const t of db.teams) {
    teamsObj[t.id] = t;
  }

  // Ordenar los partidos por jornada y fecha
  const matches = [...db.matches].sort((a, b) => {
    if (a.round !== b.round) return a.round - b.round;
    return (a.date || "").localeCompare(b.date || "");
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageTitle subtitle="Fotografías de las actas físicas en papel subidas desde el móvil o la mesa de control. Solo visibles para ti como administrador.">
          📂 Archivo de Actas Oficiales
        </PageTitle>
      </div>

      <Flash searchParams={sp} />

      <AdminActasArchive matches={matches} teams={teamsObj} />
    </div>
  );
}
