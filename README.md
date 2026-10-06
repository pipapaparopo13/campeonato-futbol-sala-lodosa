# Campeonato de Fútbol Sala de Lodosa

Web para el seguimiento y gestión del torneo de fútbol sala en Lodosa (Navarra). Diseñada para 10 equipos, con acceso público para consultar resultados, actas y estadísticas, y un panel de administración protegido para que únicamente el organizador (editor) pueda modificar datos.

## Características

- **Vista pública**:
  - **Inicio**: Últimos resultados, próximos encuentros, clasificación rápida y máximos goleadores.
  - **Clasificación**: Tabla detallada (PJ, PG, PE, PP, GF, GC, DG, Puntos y racha reciente de últimos partidos).
  - **Calendario**: Vista por jornadas (Jornada 1, 2, ...). Acceso directo al acta de cada partido.
  - **Actas oficiales**: Detalle de cada partido con resultado, goleadores y minutos, tarjetas amarillas/rojas, árbitro, incidencias y notas arbitrales.
  - **Equipos y Plantillas**: Vista de cada equipo con colores, delegados, dorsales y plantilla con estadísticas individuales.
  - **Estadísticas**: Tabla de pichichis (goleadores), ranking de tarjetas y desglose de tarjetas por jugador indicando en qué partido ocurrieron.
- **Panel del Editor (Protegido)**:
  - Acceso mediante contraseña (`/admin/login`).
  - Edición de los 10 equipos (nombre, abreviatura, color de camiseta, delegado).
  - Gestión de jugadores (nombre, dorsal, equipo).
  - Generador automático de calendario (liga regular todos contra todos a 1 o 2 vueltas) o creación manual de partidos con fecha, hora y pabellón.
  - Editor interactivo de actas: anotar marcador, agregar/eliminar goles y tarjetas vinculadas a jugadores y minutos, y notas del partido.
  - Ajustes generales del campeonato (nombre, temporada, pabellón municipal).

## Puesta en marcha

1. **Instalar dependencias**:
   ```bash
   npm install
   ```

2. **Configuración (`.env.local`)**:
   El proyecto ya incluye un archivo `.env.local` configurado con valores iniciales:
   ```env
   ADMIN_PASSWORD=lodosa2026
   SESSION_SECRET=clave-secreta-de-sesion
   ```
   *(Puedes cambiar `ADMIN_PASSWORD` por la contraseña que prefieras para el editor)*.

3. **Iniciar en desarrollo**:
   ```bash
   npm run dev
   ```
   Abre [http://localhost:3000](http://localhost:3000) en el navegador.

4. **Acceso al Panel del Editor**:
   - Entra en [http://localhost:3000/admin/login](http://localhost:3000/admin/login)
   - Contraseña por defecto: `lodosa2026`
   - Los datos se guardan de forma persistente y atómica en `data/db.json`.
