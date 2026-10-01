# Objetivo

Llevar al backend la búsqueda de oponente (matchmaking) del frontend: un usuario con sesión entra en una cola, se empareja con otro usuario que eligió el mismo juego y la misma apuesta, puede cancelar la búsqueda y, si nadie aparece en 60 segundos, jugar contra un bot de prueba.

Todo se guarda en **mocks en memoria**, sin MongoDB ni otras conexiones externas.

Fuentes: `docs/frontend/MILESTONE_2.md` (reglas de la cola y del bot) y `docs/frontend/MILESTONE_5.md` (el frontend llamará a `joinQueue`, `cancelQueue`, `tryMatch` y `createBotMatch`).

# Funcionalidades

- [x] Registro, inicio de sesión y sesión actual funcionan sin MongoDB (mocks en memoria).
- [x] Solo un usuario con sesión válida puede entrar en la cola (SRC-05).
- [x] Entrar en la cola con un juego y una apuesta (SRC-01).
- [x] Emparejar a dos usuarios distintos con el mismo juego y la misma apuesta (SRC-03).
- [x] Cancelar una búsqueda y sacar el ticket de la cola (SRC-02).
- [x] Dar por vencida una búsqueda tras 60 segundos sin rival (SRC-04).
- [x] Crear una partida contra un bot de prueba, marcada como modo prueba.

# Tareas

- [x] **Tarea 1 — Usuarios y sesiones en mocks en memoria**
  - **Objetivo:** que la autenticación del Milestone 1 funcione sin MongoDB, porque la búsqueda exige sesión.
  - **Descripción:** reescribir `user.model.ts` y `session.model.ts` como almacenes en memoria (un `Map` por modelo), con un comentario de cabecera que los declare mocks temporales. Expondrán funciones simples, como `findUserByEmail`, `createUser`, `findUserById`, `createSession`, `findSessionByTokenHash` y `deleteSession`. `auth.service.ts` pasa a usar esas funciones. Los endpoints `/auth/...` no cambian.
  - **Archivos afectados:** `src/models/user.model.ts`, `src/models/session.model.ts`, `src/services/auth.service.ts`, `src/config/env.ts`, `src/server.ts`, `.env.example`.
  - **Criterios de aceptación:**
    - `npm run dev` arranca sin MongoDB y sin `MONGODB_URI`.
    - Los endpoints `/auth/...` responden igual que en el Milestone 1: `201`, `400`, `401`, `409` y `204` en los mismos casos.
    - Al reiniciar el servidor, los datos se pierden. Es el comportamiento esperado de un mock.
  - **Dependencias necesarias:** ninguna. Se deja de usar `mongoose`; ver la nota sobre su retirada.

- [x] **Tarea 2 — Modelo mock de la cola y de las partidas**
  - **Objetivo:** definir qué es un ticket de búsqueda y qué es una partida emparejada.
  - **Descripción:** crear `matchmaking.model.ts` con dos almacenes en memoria, declarados como mock: tickets en espera y partidas resueltas. Tipos:
    - `MatchTicket`: `id`, `userId`, `username`, `gameId`, `betAmount`, `createdAt`.
    - `MatchRecord`: `id`, `gameId`, `betAmount`, `players` y `isBotMatch`.
    - `QueueStatus`: `waiting`, `matched`, `expired` y `cancelled`.
  - **Archivos afectados:** `src/models/matchmaking.model.ts`.
  - **Criterios de aceptación:**
    - Las funciones del modelo solo guardan, leen y borran datos. No contienen reglas de emparejamiento.
    - Los tipos coinciden con los nombres del frontend (`MatchTicket`, `MatchRecord`, `QueueStatus`).
  - **Dependencias necesarias:** ninguna.

- [x] **Tarea 3 — Servicio de matchmaking**
  - **Objetivo:** concentrar en un único sitio las reglas de la cola.
  - **Descripción:** crear `matchmaking.service.ts` con cuatro funciones:
    - `joinQueue(user, input)`: valida `gameId` y `betAmount` y crea el ticket.
    - `cancelQueue(user, ticketId)`: retira el ticket de la cola.
    - `tryMatch(user, ticketId)`: busca otro ticket con el mismo `gameId`, el mismo `betAmount` y distinto `userId`. Si lo encuentra, crea un `MatchRecord` y retira los dos tickets. Si el ticket tiene más de 60 segundos, lo marca como `expired`.
    - `createBotMatch(user, ticketId)`: crea una partida contra el bot solo si el ticket ya venció.
    La duración de la espera se define como constante con nombre (`QUEUE_TIMEOUT_MS = 60_000`).
  - **Archivos afectados:** `src/services/matchmaking.service.ts`.
  - **Criterios de aceptación:**
    - Dos usuarios distintos con el mismo juego y la misma apuesta quedan emparejados en la misma partida.
    - Apuestas distintas, o el mismo usuario dos veces, no se emparejan.
    - Un ticket cancelado no se empareja con nadie.
    - Pasados 60 segundos, el ticket queda `expired` y sale de la cola.
    - Un usuario solo puede consultar o cancelar sus propios tickets.
  - **Dependencias necesarias:** ninguna (`crypto.randomUUID()` de Node para los `id`).

- [x] **Tarea 4 — Endpoints REST de la cola**
  - **Objetivo:** exponer la cola al frontend.
  - **Descripción:** crear el controlador y las rutas, todas protegidas con el middleware `requireSession` del Milestone 1:
    - `POST /matchmaking/tickets` entra en la cola y responde `201` con el ticket.
    - `GET /matchmaking/tickets/:ticketId` consulta el estado. Es la llamada de polling de `tryMatch`. Devuelve `waiting`, `matched` con la partida y el rival, o `expired`.
    - `DELETE /matchmaking/tickets/:ticketId` cancela la búsqueda y responde `204`.
  - **Archivos afectados:** `src/controllers/matchmaking.controller.ts`, `src/routes/matchmaking.routes.ts`, `src/app.ts`.
  - **Criterios de aceptación:**
    - Sin sesión, las tres rutas responden `401`.
    - Un `betAmount` que no sea un número positivo, o un `gameId` vacío, dan `400`.
    - Un ticket que no existe, o de otro usuario, da `404`.
    - La respuesta de `matched` incluye el `username` real del rival.
  - **Dependencias necesarias:** ninguna.

- [x] **Tarea 5 — Partida contra bot de prueba**
  - **Objetivo:** ofrecer una partida cuando nadie aparece en la cola.
  - **Descripción:** añadir `POST /matchmaking/tickets/:ticketId/bot-match`, que llama a `createBotMatch`. El rival se identifica como "Bot de prueba (modo prueba)" y la partida lleva `isBotMatch: true`.
  - **Archivos afectados:** `src/controllers/matchmaking.controller.ts`, `src/routes/matchmaking.routes.ts`.
  - **Criterios de aceptación:**
    - Con un ticket vencido, responde `201` con una partida `isBotMatch: true`.
    - Con un ticket todavía en espera, responde `409`: el bot solo se ofrece tras el timeout.
    - El bot nunca aparece como un rival real.
  - **Dependencias necesarias:** ninguna.

# Fuera del alcance

- Conexión a MongoDB o a cualquier otra base de datos.
- WebSockets, o emparejamiento en tiempo real sin polling.
- El gate de juego del frontend (AUTH-04): es una pantalla; el backend solo cubre SRC-05 exigiendo sesión.
- Reserva o descuento de saldo al entrar en la cola, y protección contra doble gasto (frontend Milestone 3).
- Resolver partidas, validar ganadores, comisión de plataforma y reembolsos (frontend Milestone 3).
- Historial de partidas y estadísticas (frontend Milestone 4).
- Persistencia de datos entre reinicios del servidor.
- Nuevas dependencias en `package.json`.

## Notas de incertidumbre

- **Retirada de `mongoose`:** al pasar los modelos a mocks, `mongoose` y `src/config/database.ts` quedan sin uso. El equipo decidió conservarlos para volver a MongoDB más adelante. No se importan ni se conectan.
- **Identificador de juego:** el frontend nombra los juegos ("Paddle Duel", Pong, Snake, Tetris, Combat, Shooter), pero no define el formato de `gameId` ni un catálogo cerrado. Se acepta cualquier texto no vacío.
- **Apuestas permitidas:** los ejemplos usan `$10` y `$15`, pero no hay una lista de valores válidos ni un máximo. Se acepta cualquier número positivo.
- **Saldo suficiente:** la documentación no dice si hay que comprobar que la apuesta no supere el saldo al entrar en la cola. No se comprueba, porque la gestión del saldo pertenece al Milestone 3.
- **Varios tickets por usuario:** el frontend documenta como limitación que la misma cuenta pueda buscar en varias pestañas. No se define si el backend debe impedirlo, así que no se bloquea.
- **Nombres de las rutas:** el frontend solo menciona "endpoints WebSocket o HTTP equivalentes". Las rutas `/matchmaking/tickets/...` son una propuesta que hay que acordar con el frontend.
- **Momento del bot:** el frontend ofrece el bot solo tras el timeout. No está claro si el backend debe exigirlo o solo el frontend; se exige en el backend (`409`).
