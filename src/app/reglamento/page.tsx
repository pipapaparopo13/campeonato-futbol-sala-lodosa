import type { Metadata } from "next";
import { getDB } from "@/lib/db";
import { PageTitle } from "@/components/ui";
import { ReglamentoPdfButton } from "@/components/reglamento-pdf-button";

export const metadata: Metadata = {
  title: "Reglamento oficial y Código de Sanciones",
  description: "Reglamento oficial y código disciplinario del Campeonato Local de Fútbol Sala de Lodosa 2026/27.",
};

const ARTICLES = [
  "La duración de los partidos será de 25 minutos cada tiempo.",
  "Los saques de banda y los saques de esquina se lanzarán con EL PIE.",
  "En el saque de puerta, SÍ podrá el balón traspasar la línea de centro. Se sacará con la mano.",
  "El portero PUEDE salir del área para jugar el balón o intentar hacerlo. Las faltas serán como las de un jugador de campo.",
  "Si el portero durante una acción de juego retiene el balón con las manos, podrá sacar a bote-pronto siempre y cuando el bote sea dentro de su área. En ningún caso podrá salir con el balón jugado. Los saques de portería no podrán realizarse a bote-pronto.",
  "Cuando dos equipos coincidan en el color de las camisetas, cambiará el que figure en segundo lugar (visitante). La organización dispondrá de petos para esta ocasión.",
  "Cuando un equipo se retire de la competición, o es sancionado por el Comité con la retirada, además de perder la fianza, se les descontará a los demás equipos los puntos conseguidos ante este equipo, SALVO LAS CUATRO ÚLTIMAS JORNADAS.",
  "Todas las faltas son directas. Se podrá meter gol directamente desde cualquier punto de la pista, excepto en los saques de puerta o banda, si no es tocada antes por algún jugador. Es válido el gol en saque de esquina directo.",
  "Las faltas son acumulables por tiempo: con la 3ª falta de equipo se avisará y la 4ª falta (y sucesivas) de cada parte se sancionará con doble penalti sin barrera (DISTANCIA: 9 METROS).",
  "El número de jugadores en pista será de 5, incluido el portero.",
  "Las distancias en faltas serán de 5 metros; las de saques de esquina y saques de banda, de 2 metros.",
  "Si hubiera empate entre dos o más equipos al final de la liga, quedaría por delante el que mejor golaveraje tuviera, sacado de las confrontaciones entre ellos. En caso de igualdad: A) Por diferencia de goles general, B) El que más goles tuviera a favor, C) Coeficiente de goles, D) Partido de desempate.",
  "Si hubiera partidos de Copa, en la tanda de penaltis primero lanzarán los que han acabado el partido, a continuación los reservas. Durante la tanda de penaltis no se podrá cambiar el portero, antes sí.",
  "La Copa tendrá fase de grupos (2 grupos de 5) mediante sorteo público. Al terminar la liguilla, se disputarán las eliminatorias: 1º clasificado del Grupo A vs 2º clasificado del Grupo B (Semifinal 1) y 1º clasificado del Grupo B vs 2º clasificado del Grupo A (Semifinal 2). Los ganadores de ambas semifinales jugarán la Gran Final de Copa.",
  "Los partidos serán correctísimos. Se sancionarán con faltas, expulsiones o tarjetas: empujones leves o fuertes, roces, zancadillas, planchas, cargas, obstrucciones, manos, entradas por detrás, observaciones al árbitro con protestas, etc.",
  "Antes de 4 segundos se ejecutarán los saques de banda, de esquina y de puerta.",
  "Solo se le podrá ceder una vez al portero en campo propio y esta no podrá ser recibida con las manos. En caso de ceder dos veces antes de que la toque un rival o que salga de banda, será falta libre directa con barrera no acumulable. La falta se lanzará desde el lugar donde el portero la toque por segunda vez. En caso de ser dentro del área, la falta se sacará al borde del área donde el lanzador desee.",
  "El Comité tiene autoridad, una vez designados los encuentros y horarios, para cambiarlos o aplazarlos.",
  "Los partidos no se podrán aplazar. Si no se puede jugar el fin de semana, solo se podrá adelantar esa misma semana si el otro equipo está de acuerdo en jugarlo. Si no se puede jugar, el equipo que ha pedido el cambio perderá el partido.",
  "Es obligatorio estar presente en el recinto deportivo un cuarto de hora antes de comenzar el partido, uniformados y con las fichas en la mesa de control.",
  "Si algún equipo o miembro del equipo no respetara las instalaciones deportivas, se le sancionará económicamente y, si llegara el caso grave, con la expulsión.",
  "Todos los equipos deberán ir bien uniformados, con el mismo color en las camisetas y diseño, no pudiendo entrar ningún jugador en la pista sin este requisito. Si un equipo no estuviera bien equipado y por este motivo no pudiera comenzar el partido a la hora fijada, se le dará por perdido (2 - 0). Si volviera a reiterar en la misma acción, se le expulsará del campeonato.",
  "El partido no podrá comenzar con menos de 4 jugadores. Si no se llegara a este número, se le dará el partido por perdido (2 - 0) y se le descontarán 3 puntos.",
  "La Organización no se hace responsable de las lesiones de los jugadores durante los partidos del campeonato. Jugar es responsabilidad que adquiere cada participante libremente.",
  "Este Comité tiene autoridad para cambiar las normas o imponer otras durante el desarrollo del campeonato.",
  "En el último minuto, se parará el tiempo cada vez que el balón no esté en juego.",
  "Las faltas cometidas por lanzar el balón sobre el techo serán todas SAQUE DE BANDA.",
  "Si un jugador recibe dos tarjetas amarillas en un mismo partido, será expulsado, pero podrá entrar otro jugador en su lugar inmediatamente. Si un jugador es expulsado con tarjeta roja (directa), el equipo se quedará con un jugador menos durante 3 minutos o hasta que el equipo contrario marque un gol (momento en el cual podrá entrar un sustituto).",
  "Se podrán cambiar jugadores de la plantilla solamente en las DOS PRIMERAS JORNADAS y en la PRIMERA de la Segunda Vuelta.",
  "Si un jugador sancionado juega un partido (alineación indebida), se le dará el partido por perdido (2 - 0), se comunicará al equipo contrario que ha ganado el encuentro y no se arbitrará el partido.",
  "El equipo que no se presente a la hora señalada para jugar, se le dará el partido por perdido la 1ª vez (2 - 0). Si no se presentara por segunda vez en el mismo campeonato, automáticamente se le excluirá de la competición. El equipo que se retire o se le excluya del campeonato no podrá participar en la temporada siguiente.",
  "Los petos solamente se usarán cuando los dos equipos coincidan en el color de la camiseta, nunca para solucionar la falta de equipación de un jugador.",
  "Se sancionarán con falta las entradas a ras de suelo (segadas) para la disputa del balón.",
  "Se aplicará Ley de la Ventaja y se contará la falta acumulativa cuando un jugador tenga ocasión de gol o vaya en dirección a la meta contraria.",
  "Se podrán cambiar jugadores de la lista por lesión grave debidamente justificada. El jugador que se incorpora no podrá jugar el partido siguiente. Tampoco se podrán realizar cambios por lesión para las últimas dos jornadas.",
  "Cuando se realicen los cambios de jugadores, saldrá primero el jugador de campo antes de entrar el relevo. En caso de que entrase antes y hubiera más de 5 jugadores en pista, se sancionará al jugador entrante con falta y tarjeta amarilla. El portero realizará el cambio por la misma zona delimitada.",
  "Todo jugador expulsado no podrá permanecer en el banquillo ni en el área técnica.",
  "Se premiará al mejor jugador (MVP), al mejor portero y al mejor árbitro por votación del Comité al finalizar el campeonato.",
  "Las clasificaciones y actas estarán disponibles en esta web oficial y colocadas en el Polideportivo Municipal de Lodosa. Las sanciones también serán comunicadas a mitad de semana al responsable de cada equipo.",
  "Toda la información actualizada de partidos, actas oficiales, sanciones y clasificaciones se publicará en esta plataforma web oficial del campeonato.",
];

export default async function ReglamentoPage() {
  const { settings } = await getDB();

  return (
    <div className="space-y-8">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <PageTitle subtitle="Normativa oficial aprobada para el Campeonato de Fútbol Sala de Lodosa · Temporada 2026/2027">
            Reglamento Oficial y Código de Sanciones
          </PageTitle>
          <div className="shrink-0 mb-3 sm:mb-0">
            <ReglamentoPdfButton articles={ARTICLES} settings={settings} />
          </div>
        </div>

        {/* Resumen rápido de reglas clave */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <span className="text-2xl">⏱️</span>
            <div className="mt-2 text-sm font-bold text-slate-900">2 tiempos de 25 min</div>
            <div className="text-xs text-slate-500">Último minuto a reloj parado.</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <span className="text-2xl">⚠️</span>
            <div className="mt-2 text-sm font-bold text-slate-900">Aviso a la 3ª · Doble Penalti a la 4ª</div>
            <div className="text-xs text-slate-500">Acumulables por tiempo. Sin barrera (9 m).</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <span className="text-2xl">🟨</span>
            <div className="mt-2 text-sm font-bold text-slate-900">Ciclo de 3 Amarillas = Sanción</div>
            <div className="text-xs text-slate-500">1 partido de sanción automática.</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <span className="text-2xl">📍</span>
            <div className="mt-2 text-sm font-bold text-slate-900">Pabellón Municipal de Lodosa</div>
            <div className="text-xs text-slate-500">Sábados tardes según calendario.</div>
          </div>
        </div>
      </div>

      {/* Código de Sanciones del Comité */}
      <section className="space-y-4">
        <div className="rounded-2xl border-2 border-red-200 bg-red-50/70 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚖️</span>
            <div>
              <h2 className="text-xl font-black text-red-950 uppercase tracking-tight">
                Código de Sanciones del Comité
              </h2>
              <p className="text-xs font-semibold text-red-800">
                Normas disciplinarias de obligado cumplimiento
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-6 md:grid-cols-2">
            <div className="space-y-3 rounded-xl bg-white p-4 shadow-xs">
              <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
                👥 Hacia jugadores o contrarios
              </h3>
              <ul className="space-y-1.5 text-xs text-slate-700">
                <li className="flex justify-between">
                  <span>Menosprecio a un contrario:</span>
                  <strong className="text-red-700">1 a 3 partidos</strong>
                </li>
                <li className="flex justify-between">
                  <span>Insultos a un contrario:</span>
                  <strong className="text-red-700">1 a 3 partidos</strong>
                </li>
                <li className="flex justify-between">
                  <span>Insultos graves a un contrario:</span>
                  <strong className="text-red-700">5 a 10 partidos</strong>
                </li>
                <li className="flex justify-between">
                  <span>Intento de agresión a un contrario:</span>
                  <strong className="text-red-700">5 a 10 partidos</strong>
                </li>
                <li className="flex justify-between">
                  <span>Agresión física a un contrario:</span>
                  <strong className="text-red-700">10 a 15 partidos</strong>
                </li>
              </ul>
            </div>

            <div className="space-y-3 rounded-xl bg-white p-4 shadow-xs">
              <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
                🧑‍⚖️ Hacia el Árbitro o Mesa
              </h3>
              <ul className="space-y-1.5 text-xs text-slate-700">
                <li className="flex justify-between">
                  <span>Protestas airadas al árbitro:</span>
                  <strong className="text-red-700">1 a 3 partidos</strong>
                </li>
                <li className="flex justify-between">
                  <span>Menosprecio al árbitro:</span>
                  <strong className="text-red-700">3 a 6 partidos</strong>
                </li>
                <li className="flex justify-between">
                  <span>Insultos al árbitro:</span>
                  <strong className="text-red-700">3 a 6 partidos</strong>
                </li>
                <li className="flex justify-between">
                  <span>Insultos graves o amenazas:</span>
                  <strong className="text-red-700">6 a 12 partidos</strong>
                </li>
                <li className="flex justify-between">
                  <span>Intento de agresión al árbitro:</span>
                  <strong className="text-red-700">10 a 20 partidos</strong>
                </li>
                <li className="flex justify-between font-bold text-red-900 bg-red-50 p-1.5 rounded">
                  <span>Agresión física al árbitro:</span>
                  <span className="text-red-700 uppercase">A PERPETUIDAD</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-5 rounded-xl bg-amber-100/80 p-4 text-xs text-amber-950 ring-1 ring-amber-300">
            <h4 className="font-bold uppercase tracking-wider text-amber-900">
              📌 Régimen de Tarjetas y Acumulación
            </h4>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg bg-white/80 p-2.5">
                <div className="font-bold text-slate-900">2 Amarillas en 1 partido</div>
                <div className="text-red-700 font-semibold">1 partido de sanción</div>
              </div>
              <div className="rounded-lg bg-white/80 p-2.5">
                <div className="font-bold text-slate-900">Tarjeta Roja Directa</div>
                <div className="text-red-700 font-semibold">1 partido mínimo</div>
                <div className="text-[11px] text-slate-600 mt-0.5">3 min con uno menos o hasta encajar gol</div>
              </div>
              <div className="rounded-lg bg-white/80 p-2.5">
                <div className="font-bold text-slate-900">3 Tarjetas Amarillas (1er ciclo)</div>
                <div className="text-red-700 font-semibold">1 partido de sanción</div>
              </div>
              <div className="rounded-lg bg-white/80 p-2.5">
                <div className="font-bold text-slate-900">3 Amarillas (2º y 3er ciclo)</div>
                <div className="text-red-700 font-semibold">2 y 3 partidos resp.</div>
              </div>
            </div>
            <p className="mt-3 font-semibold text-amber-900">
              ⚠️ <strong>Importante:</strong> Las tarjetas en Liga contabilizan también para la Copa y viceversa. Si un jugador acumula 3 tarjetas amarillas y el siguiente partido programado es de Copa, no podrá jugarlo.
            </p>
          </div>
        </div>
      </section>

      {/* Artículos completos del Reglamento */}
      <section className="space-y-4">
        <h2 className="border-b border-slate-200 pb-2 text-xl font-bold text-slate-900">
          Artículos del Reglamento Oficial (1 al 40)
        </h2>

        <div className="space-y-3">
          {ARTICLES.map((art, index) => (
            <div
              key={index}
              className="flex gap-4 rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-xs transition hover:border-emerald-300"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 font-bold text-xs text-emerald-800">
                {index + 1}
              </span>
              <p className="flex-1 text-slate-700 leading-relaxed">{art}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
