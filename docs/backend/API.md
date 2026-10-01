# API Salvation

Guía de los 14 endpoints que el backend tiene implementados. Con `DATA_STORE=mock` (el valor por defecto) los datos viven en memoria y se pierden al reiniciar. Con `DATA_STORE=mongo` se guardan en MongoDB. En ambos casos, al arrancar se crean los tres usuarios de ejemplo solo si su email todavía no existe.

Base: `http://localhost:4444`

Cabecera de sesión, cuando la ruta la pide:

```http
Authorization: Bearer <token>
Content-Type: application/json
```

El token sale de `POST /users` o de `POST /auth/sessions`.

## Usuarios de ejemplo

Contraseña de los tres: `password123`

| Email | Username | Saldo inicial |
|---|---|---|
| `ana@salvation.dev` | ana | 100 |
| `ben@salvation.dev` | ben | 100 |
| `carla@salvation.dev` | carla | 100 |

## Cómo probar el flujo completo

1. Inicia sesión con Ana y con Ben. Guarda cada `token` y cada `user.id`.
2. Ana entra en la cola con `{ "gameId": "pong", "betAmount": 10 }`. Su saldo pasa a 90.
3. Ben entra con el mismo juego y la misma apuesta. Al consultar su ticket, el estado es `matched`.
4. Ana envía el resultado con el `winnerUserId` de Ana. Ana queda en 109 y Ben en 90.
5. Ana consulta `GET /users/{id de Ana}/history` y ve un registro `win`.

La colección de Postman hace este orden y guarda token, ids y `matchId` sola. Está en `docs/backend/salvation.postman_collection.json`.

Importarla: Postman → Import → File → ese JSON. Arranca antes el backend con `npm run dev`.

## Perfil público

Todas las respuestas de usuario usan esta forma. Nunca incluyen `passwordHash`.

```json
{
  "id": "uuid",
  "username": "ana",
  "email": "ana@salvation.dev",
  "balance": 100
}
```

## Errores habituales

| Código | Cuándo |
|---|---|
| 400 | Faltan campos, la contraseña tiene menos de 8 caracteres, la apuesta no es válida o el saldo no alcanza |
| 401 | No hay token, el token no existe o la sesión ya se cerró. Mensaje: `Sesión no válida o expirada.` |
| 403 | Intentas editar, borrar o leer el historial de otra cuenta |
| 404 | El usuario, el ticket o la partida no existen, o el ticket es de otro usuario |
| 409 | Email duplicado, partida ya resuelta, o bot pedido antes de los 60 segundos |

---

## Usuarios

### POST /users

Crea una cuenta y abre sesión. No pide token. El saldo inicial es 100.

```http
POST /users
Content-Type: application/json

{
  "username": "dani",
  "email": "dani@salvation.dev",
  "password": "secreta123"
}
```

`201`

```json
{
  "token": "hex-de-64-caracteres",
  "user": {
    "id": "uuid",
    "username": "dani",
    "email": "dani@salvation.dev",
    "balance": 100
  }
}
```

| Código | Cuerpo | Mensaje |
|---|---|---|
| 400 | Falta username, email o password | `Username, email y contraseña son obligatorios.` |
| 400 | Password de menos de 8 caracteres | `La contraseña debe tener al menos 8 caracteres.` |
| 409 | El email ya existe | `Ya existe una cuenta registrada con ese email.` |

### GET /users

Lista los perfiles públicos. Pide sesión.

```http
GET /users
Authorization: Bearer {{token}}
```

`200`

```json
[
  {
    "id": "uuid",
    "username": "ana",
    "email": "ana@salvation.dev",
    "balance": 100
  }
]
```

### GET /users/:id

Devuelve un perfil. Cualquier usuario con sesión puede ver el de otro. Pide sesión.

```http
GET /users/{{userId}}
Authorization: Bearer {{token}}
```

`200` con un perfil público. `404` si el id no existe: `No existe ese usuario.`

### GET /users/:id/history

Estadísticas e historial de la propia cuenta. Otra cuenta responde 403. Pide sesión.

```http
GET /users/{{userId}}/history
Authorization: Bearer {{token}}
```

`200`

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

`result` puede ser `win`, `loss` o `refund`. Con apuesta 10, una victoria tiene profit 9 y una derrota profit -10. Un reembolso tiene profit 0 y no suma a `wins` ni a `losses`. Las partidas contra bot no aparecen.

| Código | Mensaje |
|---|---|
| 403 | `Solo puedes consultar tu propio historial.` |
| 404 | `No existe ese usuario.` |

Sin partidas, los números son 0 y `history` es `[]`.

### PATCH /users/:id

Cambia `username`, `email` o `password` de tu cuenta. Hay que enviar al menos uno. El `balance` se ignora. Pide sesión.

```http
PATCH /users/{{userId}}
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "username": "ana-nueva"
}
```

`200` con el perfil actualizado.

| Código | Mensaje |
|---|---|
| 400 | `Envía al menos uno de estos campos: username, email o password.` |
| 400 | `Los campos enviados no pueden estar vacíos.` |
| 400 | `La contraseña debe tener al menos 8 caracteres.` |
| 403 | `Solo puedes modificar o borrar tu propia cuenta.` |
| 404 | `No existe ese usuario.` |
| 409 | `Ya existe una cuenta registrada con ese email.` |

### DELETE /users/:id

Borra tu cuenta, cierra tus sesiones y cancela tus búsquedas en espera. Pide sesión.

```http
DELETE /users/{{userId}}
Authorization: Bearer {{token}}
```

`204` sin cuerpo. Después ese token responde 401. El email se puede volver a registrar.

| Código | Mensaje |
|---|---|
| 403 | `Solo puedes modificar o borrar tu propia cuenta.` |
| 404 | `No existe ese usuario.` |

---

## Sesiones

### POST /auth/sessions

Inicia sesión. No pide token.

```http
POST /auth/sessions
Content-Type: application/json

{
  "email": "ana@salvation.dev",
  "password": "password123"
}
```

`201` con `{ token, user }`, igual que el registro. El saldo es el que tenga la cuenta en ese momento.

`401` si el email no existe o la contraseña no coincide. El mensaje es el mismo en los dos casos: `Email o contraseña incorrectos.`

### GET /auth/sessions/current

Devuelve el perfil de la sesión. Sirve para comprobar el saldo después de apostar. Pide sesión.

```http
GET /auth/sessions/current
Authorization: Bearer {{token}}
```

`200`

```json
{
  "user": {
    "id": "uuid",
    "username": "ana",
    "email": "ana@salvation.dev",
    "balance": 90
  }
}
```

### DELETE /auth/sessions/current

Cierra la sesión. No borra el usuario. Pide sesión.

```http
DELETE /auth/sessions/current
Authorization: Bearer {{token}}
```

`204` sin cuerpo. Ese token pasa a responder 401. Se puede volver a iniciar sesión.

---

## Cola

Todas piden sesión. Al entrar se descuenta `betAmount` del saldo. Si cancelas o pasan 60 segundos sin rival, el saldo vuelve. Si hay partida, el descuento se queda hasta resolver o reembolsar.

### POST /matchmaking/tickets

```http
POST /matchmaking/tickets
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "gameId": "pong",
  "betAmount": 10
}
```

`201`

```json
{
  "id": "uuid-del-ticket",
  "userId": "uuid",
  "username": "ana",
  "gameId": "pong",
  "betAmount": 10,
  "status": "waiting",
  "matchId": null,
  "reserveHeld": true,
  "createdAt": "2026-09-30T09:00:00.000Z"
}
```

| Código | Mensaje |
|---|---|
| 400 | `gameId es obligatorio y betAmount debe ser un número positivo.` |
| 400 | `Saldo insuficiente para esa apuesta.` |

### GET /matchmaking/tickets/:ticketId

Consulta la búsqueda. Si hay otro jugador con el mismo `gameId` y el mismo `betAmount`, esta llamada los empareja.

```http
GET /matchmaking/tickets/{{ticketId}}
Authorization: Bearer {{token}}
```

Esperando, `200`:

```json
{
  "status": "waiting",
  "ticket": { "id": "uuid", "status": "waiting", "matchId": null },
  "match": null,
  "rival": null
}
```

Emparejados, `200`:

```json
{
  "status": "matched",
  "ticket": { "id": "uuid", "status": "matched", "matchId": "uuid-de-la-partida" },
  "match": {
    "id": "uuid-de-la-partida",
    "gameId": "pong",
    "betAmount": 10,
    "players": [
      { "userId": "uuid-ben", "username": "ben" },
      { "userId": "uuid-ana", "username": "ana" }
    ],
    "isBotMatch": false,
    "settlement": "pending",
    "createdAt": "2026-09-30T09:00:00.000Z"
  },
  "rival": { "userId": "uuid-ana", "username": "ana" }
}
```

`status` también puede ser `expired` o `cancelled`. Un ticket de otro usuario, o uno que no existe, responde `404`: `No existe esa búsqueda.`

No se emparejan apuestas distintas, ni el mismo usuario consigo mismo, ni un ticket ya cancelado.

### DELETE /matchmaking/tickets/:ticketId

Cancela una búsqueda que sigue en `waiting` y devuelve la apuesta.

```http
DELETE /matchmaking/tickets/{{ticketId}}
Authorization: Bearer {{token}}
```

`204` sin cuerpo. `404` si el ticket no es tuyo o no existe.

### POST /matchmaking/tickets/:ticketId/bot-match

Crea una partida contra el bot. Solo después de que el ticket lleve 60 segundos en espera y haya pasado a `expired`.

```http
POST /matchmaking/tickets/{{ticketId}}/bot-match
Authorization: Bearer {{token}}
```

`201` con la misma forma que la consulta de ticket. `match.isBotMatch` es `true` y el rival es `Bot de prueba (modo prueba)`.

`409` si todavía está en espera: `El bot de prueba solo está disponible cuando la búsqueda ha superado el tiempo de espera.`

Esta partida no mueve el saldo oficial ni entra en el historial. El saldo ya se devolvió al marcar el ticket como `expired`.

---

## Partidas

Piden sesión. Solo puede llamarlas un jugador de esa partida.

Con apuesta 10, el ganador cobra 19 (pozo 20 menos el 5 %). Si ambos partían de 100, el ganador termina en 109 y el perdedor en 90.

### POST /matches/:matchId/results

```http
POST /matches/{{matchId}}/results
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "winnerUserId": "uuid-del-ganador"
}
```

`200`

```json
{
  "players": [
    { "id": "uuid-ben", "username": "ben", "email": "ben@salvation.dev", "balance": 90 },
    { "id": "uuid-ana", "username": "ana", "email": "ana@salvation.dev", "balance": 109 }
  ]
}
```

| Código | Mensaje |
|---|---|
| 400 | `winnerUserId es obligatorio.` |
| 400 | `winnerUserId debe ser un jugador humano de esta partida.` |
| 403 | `Solo un jugador de esta partida puede resolverla o cancelarla.` |
| 404 | `No existe esa partida.` |
| 409 | `Esta partida ya está resuelta o reembolsada.` |
| 409 | `Las partidas contra bot no mueven saldo.` |

### POST /matches/:matchId/cancellations

Reembolsa la apuesta a los dos jugadores. El saldo vuelve al valor anterior a la cola.

```http
POST /matches/{{matchId}}/cancellations
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "reason": "platform_error"
}
```

`200` con `{ "players": [ ... ] }`. Cada jugador gana un registro `refund` en el historial.

| Código | Mensaje |
|---|---|
| 400 | `reason debe ser platform_error.` |
| 403 | `Solo un jugador de esta partida puede resolverla o cancelarla.` |
| 404 | `No existe esa partida.` |
| 409 | `Esta partida ya está resuelta o reembolsada.` |

---

## Nombres que el frontend aún no usa

El frontend documenta otras rutas. Este backend no las expone:

| En el frontend | En este backend |
|---|---|
| `POST /match/result` | `POST /matches/:matchId/results` |
| `GET /players/:id/history` | `GET /users/:id/history` |
| `http://localhost:4000` | `http://localhost:4444` |
