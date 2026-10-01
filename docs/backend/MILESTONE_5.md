# Objetivo

Guardar el resultado de cada partida oficial y exponer el historial y las estadísticas del jugador, con **mocks en memoria**. Así el perfil del frontend puede dejar de leer `localStorage` y pedir esos datos a la API.

Fuentes: `docs/frontend/MILESTONE_4.md` (registro de historial, sin partidas de bot, y estadísticas `totalGames`, `wins`, `losses`, `totalProfit`, `history`) y `docs/frontend/MILESTONE_5.md` (el frontend prevé `GET /players/:id/history`).

# Funcionalidades

- [x] Tras resolver una partida real, cada jugador humano queda con un registro `win` o `loss`.
- [x] Tras un `platform_error`, cada jugador humano queda con un registro `refund`.
- [x] Las partidas contra bot no entran en el historial oficial.
- [x] El jugador autenticado puede consultar sus estadísticas y su historial.
- [x] Las estadísticas salen de esos registros: partidas, victorias, derrotas y profit total.

# Tareas

- [x] **Tarea 1 — Modelo mock del historial**
  - **Objetivo:** guardar `MatchHistoryRecord` en memoria.
  - **Descripción:** crear `history.model.ts`, declarado como mock. Tipo con `id`, `userId`, `gameId`, `gameName`, `betAmount`, `result` (`win` | `loss` | `refund`), `profit` y `playedAt`. Funciones `appendRecord` y `findHistoryByUserId` (de más reciente a más antiguo).
  - **Archivos afectados:** `src/models/history.model.ts`.
  - **Criterios de aceptación:**
    - El modelo solo guarda y lee. No calcula estadísticas.
    - Un registro no incluye `passwordHash` ni el saldo.
  - **Dependencias necesarias:** ninguna (`crypto.randomUUID()` para el `id`).

- [x] **Tarea 2 — Escribir el historial al cerrar una partida**
  - **Objetivo:** que el resultado no desaparezca al terminar la partida.
  - **Descripción:** desde `match.service.ts`, después de un `resolveMatch` correcto, guardar un registro por jugador humano (`win` para `winnerUserId`, `loss` para el otro). Después de un `refundMatch` correcto, guardar `refund` para cada humano. No escribir si `isBotMatch` es true. `gameName` se rellena con `gameId`: el backend no tiene catálogo de nombres.
  - **Archivos afectados:** `src/services/match.service.ts`.
  - **Criterios de aceptación:**
    - Una partida real resuelta deja dos registros, uno por jugador.
    - Un reembolso deja dos registros `refund`.
    - Una partida de bot no deja registros.
    - Resolver o reembolsar dos veces no duplica el historial (el `409` actual lo impide).
  - **Dependencias necesarias:** ninguna.

- [x] **Tarea 3 — Estadísticas a partir del historial**
  - **Objetivo:** calcular `{ totalGames, wins, losses, totalProfit, history }` en un solo sitio.
  - **Descripción:** crear `history.service.ts` con `getPlayerStats(userId)`. `totalGames` cuenta todos los registros. `wins` y `losses` cuentan esos resultados. `refund` suma a `totalGames` y su `profit` entra en `totalProfit`, pero no cuenta como victoria ni derrota. `history` es la lista completa, de más reciente a más antiguo.
  - **Archivos afectados:** `src/services/history.service.ts`.
  - **Criterios de aceptación:**
    - Con una victoria de profit `9` y una derrota de profit `-10`, `totalProfit` es `-1`, `wins` es `1` y `losses` es `1`.
    - Sin partidas, todos los números son `0` y `history` es `[]`.
  - **Dependencias necesarias:** ninguna.

- [x] **Tarea 4 — Endpoint del historial propio**
  - **Objetivo:** que el perfil pida sus datos sin leer el almacén del otro jugador.
  - **Descripción:** `GET /users/:id/history`, con `requireSession`. Si `:id` no es el usuario de la sesión, `403`. Si no existe, `404`. Si es el propio, `200` con las estadísticas y el historial. La ruta vive en `user.routes.ts`; el controlador solo traduce el resultado HTTP.
  - **Archivos afectados:** `src/controllers/user.controller.ts`, `src/routes/user.routes.ts`, `src/services/user.service.ts`.
  - **Criterios de aceptación:**
    - Sin sesión: `401`.
    - Historial de otra cuenta: `403`.
    - Id inexistente: `404`.
    - El propio usuario recibe `200` y no aparece `passwordHash`.
  - **Dependencias necesarias:** ninguna.

- [x] **Tarea 5 — Verificación**
  - **Objetivo:** comprobar el flujo contra el servidor, sin MongoDB.
  - **Descripción:** resolver una partida, reembolsar otra y crear un bot-match. Actualizar `README.md` con `GET /users/:id/history`.
  - **Archivos afectados:** `README.md`.
  - **Criterios de aceptación:**
    - `npx tsc --noEmit` y `npm run build` terminan sin errores.
    - Tras una victoria con apuesta `10`, el ganador ve `result: "win"` y el perdedor `result: "loss"`.
    - Un `platform_error` añade `result: "refund"` y no cambia `wins` ni `losses`.
    - El bot-match no aparece en `history`.
  - **Dependencias necesarias:** ninguna.

# Fuera del alcance

- Conexión a MongoDB o a cualquier otra base de datos.
- Pantalla de perfil, navbar y “Volver al inicio”: son la UI del frontend Milestone 4.
- Recortar el historial a 10 partidas en el servidor: el frontend ya muestra las últimas 10 en `ProfilePanel`.
- Catálogo de nombres de juego (“Paddle Duel”, Pong, Snake…).
- Historial público o ranking de otros jugadores.
- Nuevas dependencias en `package.json`.

## Notas de incertidumbre

- **Ruta:** el frontend Milestone 5 escribe `GET /players/:id/history`. Aquí se propone `GET /users/:id/history`, junto al recurso de usuarios que ya existe. Hay que acordarlo.
- **`gameName`:** el tipo del frontend lo separa de `gameId`, pero la API de cola solo recibe `gameId`. Se copia `gameId` en `gameName` hasta que exista un catálogo.
- **`profit`:** el frontend no define la fórmula. Se propone, con la comisión del 5 % ya implementada: victoria `betAmount * 0.9` (con apuesta `10`, profit `9`), derrota `-betAmount`, reembolso `0`.
- **`refund` en las estadísticas:** no se dice si un reembolso cuenta como partida jugada. Se cuenta en `totalGames` y no en `wins` ni `losses`.
- **Quién puede leer el historial:** el perfil del frontend es el del jugador actual. Por eso otra cuenta recibe `403`.
