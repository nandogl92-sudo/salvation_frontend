# Búsqueda / Matchmaking (mock) — `src/matchmaking/`

Este módulo implementa la Épica B (Búsqueda) de `MILESTONE_2.md` como un **mock de frontend puro**. No hay backend, no hay WebSockets, y no se instaló ninguna dependencia nueva.

## La idea central: `localStorage` como "cola compartida"

`localStorage` es compartido por **todas las pestañas del mismo origen** (`http://localhost:3001`). Este módulo lo aprovecha como si fuera una tabla de base de datos compartida: cada pestaña que busca rival escribe un "ticket" ahí, y todas las pestañas hacen polling (cada 1s) para ver si apareció un rival compatible.

Esto significa que **dos pestañas reales, con dos cuentas reales, en el mismo navegador, se emparejan de verdad** — no es una animación ni un `setTimeout`. Es el mock más honesto posible sin escribir un servidor.

## Qué NO es

- No es matchmaking de producción (sin colas por región, sin ELO/skill rating, sin balanceo de carga).
- No funciona entre navegadores distintos ni entre dispositivos distintos (localStorage es local a cada navegador).
- No hay autoridad de servidor sobre quién empieza, ping real, ni anti-cheat.
- La "reserva" de saldo al entrar a la cola no está implementada formalmente (ver limitaciones abajo).

## Archivos

| Archivo | Responsabilidad |
|---|---|
| `queueStorage.ts` | Wrapper de bajo nivel sobre `localStorage`. Lee/escribe la cola de tickets y los matches resueltos. No decide nada de negocio. |
| `matchmakingService.ts` | "Backend" falso de matchmaking: `joinQueue`, `cancelQueue`, `tryMatch`, `getMatchForTicket`, `createBotMatch`. Es la única pieza que sabe que existe `localStorage`. |

La integración con la UI (polling, timeout, botones) vive en `App.tsx`, igual que Auth vive en `AuthContext.tsx` + `AuthPanel.tsx`.

## Claves de `localStorage`

| Clave | Forma | Contenido |
|---|---|---|
| `betplay.mock.queue` | `MatchTicket[]` | Tickets esperando rival: `{ id, userId, username, gameId, betAmount, createdAt }`. |
| `betplay.mock.matches` | `MatchRecord[]` | Emparejamientos ya resueltos: `{ id, gameId, betAmount, createdAt, players: [MatchPlayer, MatchPlayer] }`. Se podan solos tras 5 minutos. |

## Flujo de cada operación

- **`joinQueue(input)`** — crea un `MatchTicket` con `id = crypto.randomUUID()` y lo agrega a la cola. Devuelve el ticket para que `App.tsx` empiece el polling.

- **`tryMatch(ticket)`** — un "paso" de matchmaking, llamado cada 1s desde `App.tsx` mientras se busca:
  1. Si ya existe un `MatchRecord` con este `ticketId` (porque el rival lo creó en un tick anterior), lo devuelve.
  2. Si no, busca en la cola un ticket compatible: mismo `gameId`, misma `betAmount`, `userId` distinto.
  3. Si lo encuentra, **solo uno de los dos crea el match** (ver "Liderazgo determinista" abajo). El otro simplemente sigue esperando a que aparezca en `betplay.mock.matches`.
  4. Si no hay nadie compatible, devuelve `null` (sigue buscando).

- **`cancelQueue(ticketId)`** — saca el ticket de la cola. Se usa tanto en el botón "Cancelar" como internamente al llegar al timeout de 60s.

- **`getMatchForTicket(ticketId)`** — lectura pura, sin intentar emparejar. Se usa para no crear un match "de rebote" justo después de un timeout.

- **`createBotMatch(ticket)`** — modo prueba explícito: crea un `MatchRecord` contra un jugador sintético (`userId: 'bot'`, `isBot: true`). Se usa solo cuando el usuario lo pide explícitamente desde el estado de timeout ("Jugar contra bot de prueba"); nunca se ofrece automáticamente ni se presenta como jugador real en la UI.

### Liderazgo determinista (por qué no se duplican los matches)

Cuando dos pestañas están buscando la misma apuesta en el mismo juego, **ambas** llaman a `tryMatch` cada segundo y ambas ven al rival en la cola al mismo tiempo. Si las dos intentaran crear el `MatchRecord`, se pisarían la escritura en `localStorage` y podrían acabar generando dos matches distintos para el mismo par de jugadores.

Para evitarlo, `tryMatch` decide de forma determinista quién es el "líder" comparando los `id` (UUID) de los dos tickets: **solo el ticket con el id menor (comparación de string) escribe la cola y crea el match**. El otro ticket, en su propio polling, ve que ya no está en la cola y empieza a leer `betplay.mock.matches` hasta encontrar el registro que el líder publicó.

## Limitaciones conocidas (documentadas, no resueltas — es un mock)

- **No hay reserva formal de saldo** al entrar a la cola. Si la misma cuenta abre dos pestañas y entra a la cola en ambas, podría (en teoría) terminar en dos matches distintos sin que se le bloquee el saldo. Para un mock de frontend esto se acepta como limitación conocida; en producción esto lo resolvería el backend con una transacción real.
- El liderazgo determinista resuelve el caso normal de 2 tickets compatibles. Con 3+ tickets esperando exactamente la misma combinación de juego + apuesta al mismo tiempo, el emparejamiento podría no ser perfectamente estable entre ticks, pero converge en pocas iteraciones de polling.
- El polling de 1s implica hasta ~1s de latencia percibida para detectar un match o un timeout; no es tiempo real.

## Cómo probar manualmente

Ver la sección "Cómo probar este milestone" en `MILESTONE_2.md` (raíz del repo) — requiere dos pestañas con dos cuentas distintas.

## Cómo resetear el mock

En la consola del navegador (DevTools):

```js
localStorage.removeItem('betplay.mock.queue');
localStorage.removeItem('betplay.mock.matches');
```

## Equivalentes de API futuros (cuando exista backend real)

| Función mock | Evento/endpoint futuro sugerido |
|---|---|
| `joinQueue` | `socket.emit('join_queue', { gameId, betAmount })` |
| `cancelQueue` | `socket.emit('cancel_queue')` |
| `tryMatch` (polling) | `socket.on('match_found', ...)` — push del servidor, sin polling |
| timeout de 60s | `socket.on('queue_timeout', ...)` — decidido por el servidor, no por el cliente |
| `createBotMatch` | Un endpoint de "modo prueba" separado, claramente marcado como no productivo, o simplemente removido. |

El día que esto exista, solo `matchmakingService.ts` cambiaría de "leer/escribir localStorage" a "hablar con sockets/HTTP". `App.tsx` debería necesitar cambios mínimos porque ya consume una interfaz de ticket/match, no `localStorage` directamente.

## Fuera de alcance de este módulo (Milestone 2)

- Autoridad de servidor sobre el resultado del juego.
- Comisión de plataforma sobre el pozo.
- Reembolso real ante "caída de servidor" (sigue siendo un `alert()` + TODO en `App.tsx`, sin tocar en este milestone).
- Reserva/bloqueo formal de saldo al entrar a la cola.
