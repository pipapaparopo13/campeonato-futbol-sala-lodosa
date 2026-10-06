import type { Metadata } from "next";
import { getDB } from "@/lib/db";
import { computeStandings } from "@/lib/stats";
import { Card, PageTitle, StandingsTable } from "@/components/ui";

export const metadata: Metadata = { title: "Clasificación" };

export default async function ClasificacionPage() {
  const db = await getDB();
  const ligaRows = computeStandings(db, { competition: "liga" });

  const hasCopa = db.matches.some((m) => m.competition === "copa");
  const copaGroupARows = hasCopa
    ? computeStandings(db, { competition: "copa", stage: "Grupo A" })
    : [];
  const copaGroupBRows = hasCopa
    ? computeStandings(db, { competition: "copa", stage: "Grupo B" })
    : [];

  return (
    <div className="space-y-8">
      <div>
        <PageTitle subtitle="Victoria 3 puntos · Empate 1 punto · Desempate por diferencia de goles y goles a favor">
          Clasificación de Liga Regular
        </PageTitle>
        <Card>
          <StandingsTable rows={ligaRows} />
        </Card>
      </div>

      {hasCopa && (
        <section className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Clasificación de Copa (2 Grupos de 5)
            </h2>
            <p className="text-xs text-slate-500">
              Los mejores clasificados acceden a la fase final (semifinales y final).
            </p>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Grupo A">
              <StandingsTable rows={copaGroupARows} compact />
            </Card>
            <Card title="Grupo B">
              <StandingsTable rows={copaGroupBRows} compact />
            </Card>
          </div>
        </section>
      )}
    </div>
  );
}
