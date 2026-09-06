# MILESTONE_4 - Perfil del Jugador e Historial de Partidas (Mock)

## Objective

Que cada jugador pueda ver su perfil personal con estadísticas acumuladas (partidas jugadas, victorias, derrotas, dinero ganado/perdido) y el historial detallado de sus últimas partidas, todo persistido en `localStorage`.

---

## Key Concepts

Ahora mismo el juego actualiza el saldo al terminar una partida, pero ese resultado desaparece: no queda rastro de lo que pasó. En este milestone se introduce un **historial de partidas**: cada vez que una partida termina, se guarda un registro pequeño con el juego, el resultado y el dinero movido. Con esos registros se puede construir una pantalla de perfil que muestre estadísticas acumuladas. Esto enseña a persistir datos secundarios (no solo el saldo) y a calcular métricas derivadas a partir de una lista de registros. Además prepara el terreno para el backend: cuando llegue, solo habrá que reemplazar el almacén de `localStorage` por una llamada a la API, sin tocar la UI del perfil.

---

## Checklist

- [ ] **Paso 1 — Tipo `MatchHistoryRecord` y almacén** (`src/types.ts`, `src/history/historyStorage.ts`)
  Añadir el tipo `MatchHistoryRecord` con: `id`, `userId`, `gameId`, `gameName`, `betAmount`, `result: 'win' | 'loss' | 'refund'`, `profit`, `playedAt`. Crear `historyStorage.ts` con clave `betplay.mock.history`, funciones `loadHistory()` y `saveHistory()`, idénticas en forma a `src/auth/storage.ts`.

- [ ] **Paso 2 — Guardar el resultado tras cada partida** (`src/App.tsx`)
  Al final de `handleGameEnd`, antes de llamar a `setGameResult`, guardar un `MatchHistoryRecord` con los datos de la partida. Solo guardar si `currentUser` existe. No guardar partidas de bot en el historial oficial (marcarlas o filtrarlas).

- [ ] **Paso 3 — Hook `usePlayerStats`** (`src/profile/usePlayerStats.ts`)
  Hook simple que lee el historial del jugador actual y devuelve: `{ totalGames, wins, losses, totalProfit, history }`. La lógica de cálculo vive aquí, no en el componente.

- [ ] **Paso 4 — Componente `ProfilePanel`** (`src/profile/ProfilePanel.tsx`)
  Pantalla con dos secciones: tarjetas de estadísticas (partidas, victorias, derrotas, profit total) y una lista de las últimas 10 partidas (juego, resultado, cantidad). Debe ser un componente presentacional simple — recibe los datos del hook.

- [ ] **Paso 5 — Integrar el perfil en la navegación** (`src/App.tsx`)
  Añadir una nueva vista `'profile'` al estado `view`. En el navbar, el nombre de usuario pasa a ser un botón que lleva al perfil. Desde el perfil, un botón "Volver" regresa al home.

---

## Acceptance Criteria

- Al terminar una partida (victoria o derrota, no bot), el registro aparece en el historial al visitar el perfil.
- Las estadísticas (victorias, derrotas, profit) son coherentes con los registros del historial.
- La pantalla de perfil es accesible desde el navbar haciendo clic en el nombre de usuario.
- Las partidas contra bot no aparecen en el historial oficial.
- `npm run lint` (`tsc --noEmit`) no reporta errores.
