# Objetivo

Dejar por escrito, en tipos de TypeScript, el contrato que el frontend espera del backend. No añade pantallas, rutas ni reglas de negocio: las respuestas que ya existen pasan a tener los nombres `ApiAuthResponse`, `ApiMatchTicket`, `ApiMatchRecord`, `ApiGameResult` y `ApiHistoryRecord`.

Los datos siguen en **mocks en memoria**. No hay conexión a MongoDB.

Fuente: `docs/frontend/MILESTONE_5.md`, paso 1 (contratos de API). Los pasos 2 a 5 de ese documento son trabajo del frontend.

# Funcionalidades

- [x] `ApiAuthResponse` describe el `{ token, user }` que ya devuelven el registro y el inicio de sesión.
- [x] `ApiMatchTicket` y `ApiMatchRecord` describen el ticket de cola y la partida que ya devuelve el matchmaking.
- [x] `ApiGameResult` describe los jugadores y saldos que ya devuelven el resultado y el reembolso.
- [x] `ApiHistoryRecord` describe cada línea del historial que ya devuelve `GET /users/:id/history`.
- [x] Esos tipos viven en un solo archivo y los controladores los usan como forma de la respuesta. El JSON no cambia.

# Tareas

- [x] **Tarea 1 — Contrato de autenticación**
  - **Objetivo:** nombrar la respuesta de registro e inicio de sesión.
  - **Descripción:** crear `src/contracts/api.ts` con `ApiAuthResponse`: `{ token: string, user: { id, username, email, balance } }`. El perfil público reutiliza el tipo que ya existe; no se duplican campos.
  - **Archivos afectados:** `src/contracts/api.ts`, `src/controllers/auth.controller.ts`, `src/controllers/user.controller.ts`.
  - **Criterios de aceptación:**
    - `POST /users` y `POST /auth/sessions` siguen respondiendo `201` con `token` y `user`.
    - `user` no incluye `passwordHash`.
  - **Dependencias necesarias:** ninguna.

- [x] **Tarea 2 — Contrato de cola y partida**
  - **Objetivo:** nombrar el ticket y la partida que ya devuelve el matchmaking.
  - **Descripción:** añadir `ApiMatchTicket` y `ApiMatchRecord` en `src/contracts/api.ts`, con los mismos campos que los modelos mock actuales (`id`, `userId`, `username`, `gameId`, `betAmount`, `status`, `players`, `isBotMatch`, y el resto que ya sale en el JSON).
  - **Archivos afectados:** `src/contracts/api.ts`, `src/controllers/matchmaking.controller.ts`.
  - **Criterios de aceptación:**
    - `POST /matchmaking/tickets` y `GET /matchmaking/tickets/:ticketId` responden con la misma forma que ahora.
    - Una partida de bot sigue llevando `isBotMatch: true`.
  - **Dependencias necesarias:** ninguna.

- [x] **Tarea 3 — Contrato del resultado de partida**
  - **Objetivo:** nombrar lo que ya devuelven la resolución y el reembolso.
  - **Descripción:** añadir `ApiGameResult` con la lista de perfiles públicos (`id`, `username`, `email`, `balance`) que hoy responde `{ players }`.
  - **Archivos afectados:** `src/contracts/api.ts`, `src/controllers/match.controller.ts`.
  - **Criterios de aceptación:**
    - `POST /matches/:matchId/results` y `POST /matches/:matchId/cancellations` siguen respondiendo `200` con `{ players }`.
    - No se añade ningún campo nuevo.
  - **Dependencias necesarias:** ninguna.

- [x] **Tarea 4 — Contrato del historial**
  - **Objetivo:** nombrar cada registro del historial.
  - **Descripción:** añadir `ApiHistoryRecord` con `id`, `userId`, `gameId`, `gameName`, `betAmount`, `result`, `profit` y `playedAt`. La respuesta de estadísticas no cambia de forma: solo el registro interno usa este nombre.
  - **Archivos afectados:** `src/contracts/api.ts`, `src/models/history.model.ts`.
  - **Criterios de aceptación:**
    - `GET /users/:id/history` sigue devolviendo `totalGames`, `wins`, `losses`, `totalProfit` e `history`.
    - Cada elemento de `history` coincide con `ApiHistoryRecord`.
  - **Dependencias necesarias:** ninguna.

- [x] **Tarea 5 — Comprobar que el JSON no cambió**
  - **Objetivo:** asegurar que el contrato es solo un nombre para respuestas que ya existen.
  - **Descripción:** `npx tsc --noEmit` y una petición de cada recurso (registro, cola, resultado, historial) contra el servidor en marcha. Anotar en `README.md` el archivo de contratos.
  - **Archivos afectados:** `README.md`.
  - **Criterios de aceptación:**
    - `npx tsc --noEmit` y `npm run build` terminan sin errores.
    - Las respuestas HTTP comparadas con el Milestone 5 del backend no ganan ni pierden campos.
  - **Dependencias necesarias:** ninguna.

# Fuera del alcance

- Adaptadores del frontend (`src/api/authApi.ts`, `matchmakingApi.ts`, `historyApi.ts`) y cambios en `AuthContext.tsx` o `App.tsx`: son el Milestone 5 del frontend.
- `VITE_API_URL` y `src/api/config.ts`: viven en el proyecto frontend.
- Conexión a MongoDB o a cualquier otra base de datos.
- Renombrar rutas a `POST /match/result` o `GET /players/:id/history`.
- WebSockets.
- Nuevas dependencias en `package.json`.
- Nuevas reglas de saldo, cola o historial.

## Notas de incertidumbre

- **Campos de los tipos:** `docs/frontend/MILESTONE_5.md` da los nombres (`ApiAuthResponse`, `ApiMatchTicket`, `ApiMatchRecord`, `ApiGameResult`, `ApiHistoryRecord`) y no los campos. Este milestone usa la forma que el backend ya responde. Si el frontend define otros campos, hay que ajustarlos antes de implementar.
- **Nombres de ruta:** el frontend anota `POST /match/result` y `GET /players/:id/history`. El backend ya usa `POST /matches/:matchId/results` y `GET /users/:id/history`. Este milestone no las cambia.
- **Puerto:** el frontend de ejemplo usa `http://localhost:4000`. El backend escucha en `4444`.
