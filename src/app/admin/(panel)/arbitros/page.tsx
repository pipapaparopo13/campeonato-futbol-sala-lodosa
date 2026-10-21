import type { Metadata } from "next";
import { getDB } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { PageTitle, Flash } from "@/components/ui";
import { AdminArbitrosPanel } from "@/components/admin-arbitros-panel";
import type { Team } from "@/lib/types";

export const metadata: Metadata = {
  title: "Árbitros y Pagos",
  robots: { index: false },
};

export default async function AdminArbitrosPage({
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageTitle subtitle="Control de partidos pitados por cada árbitro y cálculo automático de liquidación para pagar a final de temporada. Solo visible para el administrador.">
          ⚖️ Árbitros y Liquidación de Pagos
        </PageTitle>
      </div>

      <Flash searchParams={sp} />

      <AdminArbitrosPanel
        matches={db.matches}
        teams={teamsObj}
        settings={db.settings}
      />
    </div>
  );
}
