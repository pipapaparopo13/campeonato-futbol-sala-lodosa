import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-20 text-center">
      <div className="text-6xl">🥅</div>
      <h1 className="mt-4 text-2xl font-extrabold">Página no encontrada</h1>
      <p className="mt-2 text-slate-500">Puede que el partido, equipo o jugador ya no exista.</p>
      <Link href="/" className="btn mt-6">Volver al inicio</Link>
    </div>
  );
}
