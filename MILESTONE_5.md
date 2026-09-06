# MILESTONE_5 - Preparación para Backend (Contratos y Adaptadores de API)

## Objective

Aislar todo el código que hoy depende del mock (localStorage) detrás de una capa de adaptadores en `src/api/`, de modo que cuando llegue el backend real solo haya que editar esos adaptadores sin tocar la UI ni la lógica de negocio.

---

## Key Concepts

El frontend tiene tres zonas que hoy hablan directamente con mocks de `localStorage`: autenticación (`authService`), matchmaking (`matchmakingService`) e historial de partidas (`historyStorage`). Si el backend llega y el código de la UI importa directamente de esos archivos, habrá que buscar y cambiar cada importación en decenas de sitios. La solución es crear una **capa de adaptadores** (`src/api/`): cada módulo tiene su propio archivo que hoy reexporta el mock, y mañana llamará a `fetch`. Solo hay que cambiar ese archivo, y el resto del código no se toca. Además se documenta el **contrato de la API** (los tipos exactos que devolverá el backend) para que el equipo de backend y frontend hablen el mismo idioma desde el principio.

---

## Checklist

- [ ] **Paso 1 — Contratos de API** (`src/api/contracts.ts`)
  Definir los tipos que reflejan exactamente las respuestas que tendrá el backend: `ApiAuthResponse`, `ApiMatchTicket`, `ApiMatchRecord`, `ApiGameResult`, `ApiHistoryRecord`. No es código de negocio — es solo documentación tipada del contrato entre frontend y backend.

- [ ] **Paso 2 — Adaptador de autenticación** (`src/api/authApi.ts`)
  Reexportar las funciones de `authService.ts` (`register`, `login`, `logout`, `getCurrentSession`, `updateUserBalance`). Añadir un comentario `// FUTURE: reemplazar con fetch(${VITE_API_URL}/auth/...)` en cada función. `AuthContext.tsx` pasa a importar desde `authApi` en vez de `authService`.

- [ ] **Paso 3 — Adaptador de matchmaking** (`src/api/matchmakingApi.ts`)
  Reexportar las funciones de `matchmakingService.ts` (`joinQueue`, `cancelQueue`, `tryMatch`, `createBotMatch`). Añadir comentarios `// FUTURE` con los endpoints WebSocket o HTTP equivalentes. `App.tsx` pasa a importar desde `matchmakingApi`.

- [ ] **Paso 4 — Adaptador de historial** (`src/api/historyApi.ts`)
  Reexportar `appendRecord` y `loadHistory` desde `historyStorage.ts`. Añadir comentarios `// FUTURE: POST /match/result` y `// FUTURE: GET /players/:id/history`. `App.tsx` y `usePlayerStats.ts` pasan a importar desde `historyApi`.

- [ ] **Paso 5 — Variable de entorno `VITE_API_URL`** (`.env.example`, `src/api/config.ts`)
  Añadir `VITE_API_URL=http://localhost:4000` al `.env.example`. Crear `src/api/config.ts` que exporta `API_URL = import.meta.env.VITE_API_URL ?? ''`. Los adaptadores importarán `API_URL` de aquí cuando lleguen las llamadas reales.

---

## Acceptance Criteria

- La carpeta `src/api/` existe con los cuatro adaptadores y `config.ts`.
- `AuthContext.tsx` importa desde `src/api/authApi.ts`, no desde `authService.ts` directamente.
- `App.tsx` importa matchmaking e historial desde `src/api/`, no desde sus módulos mock directamente.
- `usePlayerStats.ts` importa el historial desde `src/api/historyApi.ts`.
- El comportamiento de la app es idéntico al anterior (ningún test visual rompe).
- `npm run lint` (`tsc --noEmit`) no reporta errores.
