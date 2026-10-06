import type { Metadata } from "next";
import { updateSettings } from "@/app/actions";
import { getDB } from "@/lib/db";
import { Card, Flash, PageTitle } from "@/components/ui";

import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Ajustes" };

export default async function AdminAjustes({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  await requireAdmin();
  const [{ settings }, sp] = await Promise.all([getDB(), searchParams]);
  return (
    <>
      <PageTitle>Ajustes del campeonato</PageTitle>
      <Flash searchParams={sp} />
      <Card className="max-w-xl">
        <form action={updateSettings} className="space-y-4">
          <div>
            <label className="label" htmlFor="name">Nombre del campeonato</label>
            <input id="name" name="name" defaultValue={settings.name} required className="input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="season">Temporada</label>
              <input id="season" name="season" defaultValue={settings.season} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="location">Localidad</label>
              <input id="location" name="location" defaultValue={settings.location} className="input" />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="defaultVenue">Pabellón por defecto</label>
            <input id="defaultVenue" name="defaultVenue" defaultValue={settings.defaultVenue} className="input" />
          </div>
          <button className="btn">Guardar</button>
        </form>
      </Card>
    </>
  );
}
