# Integración del frontend con el backend

Guía para sustituir `localStorage` por las llamadas de `docs/backend/salvation.postman_collection.json`. El detalle de cada error está en `docs/backend/API.md`.

## Arranque

1. En este repo: `npm run dev`. El API escucha en `http://localhost:4444`.
2. En el frontend, `VITE_API_URL` debe ser `http://localhost:4444`. El valor `4000` de `docs/frontend/MILESTONE_5.md` no es el puerto de este backend.
3. En Postman: Import → File → `docs/backend/salvation.postman_collection.json`. La variable `baseUrl` ya vale `http://localhost:4444`.

Todas las peticiones con cuerpo envían `Content-Type: application/json`. Las que piden sesión envían:

```http
Authorization: Bearer <token>
```

El token sale de `POST /users` o de `POST /auth/sessions`. No se guarda en MongoDB: allí solo está su hash SHA-256.

El perfil público es siempre `{ id, username, email, balance }`. Nunca incluye `passwordHash`.

Usuarios de ejemplo, contraseña `password123`:

| Email | Username | Saldo inicial |
|---|---|---|
| `ana@salvation.dev` | ana | 100 |
| `ben@salvation.dev` | ben | 100 |
| `carla@salvation.dev` | carla | 100 |

## Variables de la colección

| Variable | La rellena | Sirve para |
|---|---|---|
| `baseUrl` | ya viene puesta | origen del API |
| `tokenAna`, `tokenBen` | login | cabecera `Authorization` |
| `userIdAna`, `userIdBen` | login | rutas de usuario, historial y `winnerUserId` |
| `ticketIdAna`, `ticketIdBen` | entrar en la cola | consultar, cancelar o pedir el bot |
| `matchId` | consultar el ticket cuando hay rival | resultado o reembolso |

Ejecuta la carpeta **Flujo** de arriba a abajo. Los scripts de Postman guardan esas variables.

## Carpetas de Postman

### Flujo

Orden real de una partida. Con apuesta 10 y saldo 100, Ana gana y queda en 109; Ben queda en 90.

| Petición Postman | Método y ruta | Cuerpo | Éxito |
|---|---|---|---|
| Login Ana | `POST /auth/sessions` | `{ "email": "ana@salvation.dev", "password": "password123" }` | 201 `{ token, user }` |
| Login Ben | `POST /auth/sessions` | `{ "email": "ben@salvation.dev", "password": "password123" }` | 201 `{ token, user }` |
| Sesión actual de Ana | `GET /auth/sessions/current` | — | 200 `{ user }` |
| Ana entra en la cola | `POST /matchmaking/tickets` | `{ "gameId": "pong", "betAmount": 10 }` | 201 ticket `waiting` |
| Ben entra en la cola | `POST /matchmaking/tickets` | `{ "gameId": "pong", "betAmount": 10 }` | 201 ticket `waiting` |
| Ben consulta y se empareja | `GET /matchmaking/tickets/{{ticketIdBen}}` | — | 200 `status: matched` |
| Ana gana la partida | `POST /matches/{{matchId}}/results` | `{ "winnerUserId": "{{userIdAna}}" }` | 200 `{ players }` |
| Historial de Ana | `GET /users/{{userIdAna}}/history` | — | 200 estadísticas e `history` |

El emparejamiento ocurre al consultar el ticket, no al crearlo. Hace falta el mismo `gameId` y el mismo `betAmount`, y dos usuarios distintos.

### Users

| Petición Postman | Método y ruta | Sesión | Éxito |
|---|---|---|---|
| Crear usuario | `POST /users` | No | 201 `{ token, user }`, saldo 100 |
| Listar usuarios | `GET /users` | Sí | 200 lista de perfiles |
| Ver un usuario | `GET /users/{{userIdBen}}` | Sí | 200 un perfil |
| Actualizar mi usuario | `PATCH /users/{{userIdAna}}` | Sí | 200 perfil. Solo `username`, `email` o `password` |
| Borrar mi usuario | `DELETE /users/{{userIdAna}}` | Sí | 204 sin cuerpo |

El registro del frontend es `POST /users`, no `POST /auth/users`. Borrar la cuenta cierra sus sesiones y cancela sus búsquedas en espera. No ejecutes ese DELETE si después vas a seguir el Flujo con Ana.

### Auth

| Petición Postman | Método y ruta | Éxito |
|---|---|---|
| Cerrar sesión de Ana | `DELETE /auth/sessions/current` | 204. Ese token pasa a responder 401 |

El login está en la carpeta Flujo: `POST /auth/sessions`.

### Matchmaking

| Petición Postman | Método y ruta | Éxito |
|---|---|---|
| Cancelar búsqueda de Ana | `DELETE /matchmaking/tickets/{{ticketIdAna}}` | 204. Si seguía en `waiting`, devuelve la apuesta |
| Partida contra bot | `POST /matchmaking/tickets/{{ticketIdAna}}/bot-match` | 201 solo cuando el ticket lleva 60 s y está `expired` |

El rival del bot se llama `Bot de prueba (modo prueba)` e `isBotMatch` es `true`. Esa partida no mueve el saldo oficial ni escribe historial.

### Matches

| Petición Postman | Método y ruta | Cuerpo | Éxito |
|---|---|---|---|
| Reembolsar partida | `POST /matches/{{matchId}}/cancellations` | `{ "reason": "platform_error" }` | 200 `{ players }` |

El reembolso devuelve las dos reservas, escribe `result: "refund"` con `profit: 0` y no suma victorias ni derrotas.

## Qué debe llamar cada adaptador del frontend

Los comentarios de `docs/frontend/MILESTONE_5.md` nombran rutas que este backend no tiene. El `fetch` debe usar la columna de Postman.

| Función del frontend | Ruta que hay que llamar |
|---|---|
| `register` | `POST /users` |
| `login` | `POST /auth/sessions` |
| `logout` | `DELETE /auth/sessions/current` |
| `getCurrentSession` | `GET /auth/sessions/current` |
| `joinQueue` | `POST /matchmaking/tickets` |
| `tryMatch` | `GET /matchmaking/tickets/:ticketId` |
| `cancelQueue` | `DELETE /matchmaking/tickets/:ticketId` |
| `createBotMatch` | `POST /matchmaking/tickets/:ticketId/bot-match` |
| guardar resultado | `POST /matches/:matchId/results` |
| error de plataforma | `POST /matches/:matchId/cancellations` |
| historial y estadísticas | `GET /users/:id/history` |

No existen `POST /match/result` ni `GET /players/:id/history`.

`GET /users/:id/history` solo responde 200 si el `id` es el de la sesión. Otra cuenta responde 403. El historial llega del más reciente al más antiguo, sin corte a las últimas 10: ese corte, si se quiere, lo hace el frontend.

Consulta de ticket emparejado:

```json
{
  "status": "matched",
  "ticket": { "id": "uuid", "status": "matched", "matchId": "uuid-de-la-partida" },
  "match": {
    "id": "uuid-de-la-partida",
    "gameId": "pong",
    "betAmount": 10,
    "players": [
      { "userId": "uuid", "username": "ben" },
      { "userId": "uuid", "username": "ana" }
    ],
    "isBotMatch": false,
    "settlement": "pending"
  },
  "rival": { "userId": "uuid", "username": "ana" }
}
```

Historial:

```json
{
  "totalGames": 1,
  "wins": 1,
  "losses": 0,
  "totalProfit": 9,
  "history": [
    {
      "id": "uuid",
      "userId": "uuid",
      "gameId": "pong",
      "gameName": "pong",
      "betAmount": 10,
      "result": "win",
      "profit": 9,
      "playedAt": "2026-09-30T09:00:00.000Z"
    }
  ]
}
```

`result` vale `win`, `loss` o `refund`. `gameName` es una copia de `gameId`.

## Errores que el frontend ya puede mostrar

El cuerpo de error es `{ "message": "..." }`.

| Código | Cuándo | Mensaje |
|---|---|---|
| 400 | Registro incompleto | `Username, email y contraseña son obligatorios.` |
| 400 | Contraseña de menos de 8 caracteres | `La contraseña debe tener al menos 8 caracteres.` |
| 400 | Apuesta inválida | `gameId es obligatorio y betAmount debe ser un número positivo.` |
| 400 | Saldo insuficiente | `Saldo insuficiente para esa apuesta.` |
| 400 | Reembolso con otro motivo | `reason debe ser platform_error.` |
| 401 | Login | `Email o contraseña incorrectos.` |
| 401 | Sesión ausente o cerrada | `Sesión no válida o expirada.` |
| 403 | Historial de otra cuenta | `Solo puedes consultar tu propio historial.` |
| 404 | Ticket ajeno o inexistente | `No existe esa búsqueda.` |
| 409 | Email repetido | `Ya existe una cuenta registrada con ese email.` |
| 409 | Bot antes de 60 s | `El bot de prueba solo está disponible cuando la búsqueda ha superado el tiempo de espera.` |
| 409 | Resultado repetido | `Esta partida ya está resuelta o reembolsada.` |

## Antes de probar desde el navegador

Este backend todavía no envía cabeceras CORS. Postman no las necesita. El navegador, al llamar desde el origen de Vite a `http://localhost:4444`, sí las exige. Hasta que el backend las añada, la colección de Postman es la forma de comprobar el contrato.
