# Matchmaking — Reporte de Integración

## Resumen

La cola deja de usar `localStorage`. Entrar, consultar, cancelar y pedir el bot pasan por el backend en `http://localhost:4444`, con el JWT de la sesión. El saldo de la apuesta lo reserva y lo devuelve el servidor. El resultado de la partida y el historial siguen sin conectar.

## Endpoints

Todas piden `Authorization: Bearer <token>` y `Content-Type: application/json` cuando hay cuerpo.

| Función | Método y ruta | Cuerpo | Éxito |
|---|---|---|---|
| `joinQueue` | `POST /matchmaking/tickets` | `{ gameId, betAmount }` | 201 ticket `waiting` |
| `tryMatch` | `GET /matchmaking/tickets/:ticketId` | — | 200 `waiting`, `matched`, `expired` o `cancelled` |
| `cancelQueue` | `DELETE /matchmaking/tickets/:ticketId` | — | 204 |
| `createBotMatch` | `POST /matchmaking/tickets/:ticketId/bot-match` | — | 201 solo si el ticket está `expired` |

Errores que la UI muestra tal cual: 400 saldo o apuesta inválida, 401 sesión, 404 búsqueda ajena, 409 bot antes de los 60 segundos.

## Cambios en Frontend

- `src/api/matchmakingApi.ts`: deja de reexportar el mock y llama al API. Traduce el JSON a `MatchTicket`, `MatchRecord` y `MatchPlayer`.
- `src/api/authApi.ts`: exporta `getAccessToken` para la cabecera. No cambia el login.
- `src/App.tsx`: la búsqueda es async. Tras unir, cancelar o expirar, lee `GET /auth/sessions/current` y actualiza el saldo. El bot inmediato desaparece.
- `src/components/lobby/LobbyPanel.tsx`: muestra el error de la cola. El botón "Jugar ahora vs Bot" se quitó porque el backend solo acepta el bot cuando el ticket ya expiró.

`src/matchmaking/matchmakingService.ts` sigue en el repo y ya no lo importa la app.

## Tipos/Validaciones

No se añadió Zod. El proyecto no lo tiene. `matchmakingApi.ts` comprueba en runtime que el ticket tenga `id`, `userId`, `username`, `gameId`, `betAmount` y `createdAt`, y que un match traiga dos jugadores. `createdAt` ISO pasa a número. El rival del bot lleva `isBot: true`.

## Estados y Errores

- Buscando: spinner mientras `queueStatus` es `searching`. Un fallo de red no saca de la cola; el siguiente tick reintenta.
- Sin rival: el poll responde `waiting` y la UI sigue buscando.
- Timeout: el servidor responde `expired`, se muestra "Seguir buscando", "Cambiar apuesta" y el bot de prueba, y se refresca el saldo devuelto.
- Error: el `message` del API se pinta en el lobby.
- Emparejado: pasa a la partida con el username real del rival.

## Observabilidad

Cada llamada escribe en consola `[matchmaking]` con `endpoint`, `status` y `latencyMs`.

## Riesgos y Next Steps

- Resolver la partida (`POST /matches/:matchId/results`) y el reembolso (`POST /matches/:matchId/cancellations`) siguen en local. El saldo de una victoria todavía no es el del servidor.
- El historial (`GET /users/:id/history`) sigue en `localStorage`.
- El navegador sigue bloqueado por CORS hasta que el backend envíe `Access-Control-Allow-Origin`.
- La verificación dejó una partida de Snake a 5 USD entre Ana y Ben pendiente de resolver. Hay que cerrarla en el módulo de partidas.

## Verificación

Contra `http://localhost:4444`:

- Ana entra a Pong por 10: 201, saldo 109 → 99. Consulta `waiting`. Cancelar: 204 y saldo otra vez 109.
- Ana y Ben entran a Snake por 5. Al consultar el ticket de Ben el estado es `matched` y el rival es `ana`, con `isBotMatch: false`.
