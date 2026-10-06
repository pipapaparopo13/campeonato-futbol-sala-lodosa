import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { login } from "@/app/actions";
import { isEditorOrReferee } from "@/lib/auth";
import { Flash } from "@/components/ui";

export const metadata: Metadata = { title: "Acceso al panel", robots: { index: false } };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  if (await isEditorOrReferee()) redirect("/admin");
  const sp = await searchParams;

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-xl font-extrabold text-slate-900">
          Acceso al Panel de Gestión
        </h1>
        <p className="mb-5 text-xs text-slate-500">
          Acceso para el <strong>Organizador</strong> y para <strong>Árbitros / Mesa</strong> de Lodosa.
        </p>

        <Flash searchParams={sp} />

        <form action={login} className="space-y-4">
          <div>
            <label htmlFor="username" className="label">
              Tipo de Usuario
            </label>
            <select id="username" name="username" className="input">
              <option value="organizador">Organizador (Admin)</option>
              <option value="mesa">Mesa (Javi Mesa)</option>
            </select>
          </div>

          <div>
            <label htmlFor="password" className="label">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoFocus
              className="input"
              autoComplete="current-password"
              placeholder="Introduce tu contraseña"
            />
          </div>

          <button className="btn w-full">Entrar al panel</button>
        </form>
      </div>
    </div>
  );
}
