# Matches — Reporte de Integración

## Resumen

Al terminar una partida real, el frontend ya no calcula el pozo ni escribe el historial en `localStorage`. Envía el ganador al backend y muestra el saldo que devuelve el servidor. Una partida contra bot no llama a estos endpoints: el API no mueve saldo en ese caso. El historial en pantalla sigue leyendo el mock hasta el siguiente módulo.

## Endpoints

Ambos piden `Authorization: Bearer <token>` y `Content-Type: application/json`.

| Función | Método y ruta | Cuerpo | Éxito |
|---|---|---|---|
| `submitMatchResult` | `POST /matches/:matchId/results` | `{ winnerUserId }` | 200 `{ players }` |
| `cancelMatch` | `POST /matches/:matchId/cancellations` | `{ reason: "platform_error" }` | 200 `{ players }` |

Errores que se muestran en la partida: 400 ganador inválido, 401 sesión, 403 si no juegas esa partida, 404 partida inexistente, 409 ya resuelta o partida contra bot.

## Cambios en Frontend

- `src/api/matchesApi.ts`: nuevas llamadas, validación del array `players` y log de latencia.
- `src/App.tsx`: guarda `activeMatch.id` al emparejar. `handleGameEnd` envía el resultado o el reembolso. El saldo sale del jugador de la respuesta. La ganancia neta es `saldoNuevo - (saldoReservado + apuesta)`. Se dejó de llamar a `appendRecord`.
- Una partida con `isBot` muestra victoria o derrota con profit 0 y no toca el saldo.

## Tipos/Validaciones

Cada jugador de la respuesta debe traer `id`, `username`, `email` y `balance` numérico. Si falta el usuario de la sesión, no se pinta un resultado falso.

## Estados y Errores

- Éxito: pantalla de resultado con el saldo del servidor.
- Error: mensaje del API y botón para volver al inicio. No se altera el saldo local.
- Bot: resultado local, sin POST.
- Reembolso (`platform_error`): profit 0 y saldo restaurado por el servidor.
- Un segundo fin de partida en la misma partida no dispara otra petición.

## Observabilidad

Cada POST escribe en consola `[matches]` con `endpoint`, `status` y `latencyMs`.

## Riesgos y Next Steps

- El perfil sigue leyendo `GET` local (`src/api/historyApi.ts`). El servidor ya guarda el historial al resolver; hay que conectarlo en el módulo de historial.
- El navegador sigue bloqueado por CORS.
- La verificación anterior dejó una partida de Snake a 5 USD entre Ana y Ben sin `matchId` guardado. Esta fase no pudo cerrarla. La partida nueva de Pong sí quedó resuelta.

## Verificación

Contra `http://localhost:4444`, Ana y Ben se emparejan en Pong a 10 USD. Ana envía su `userId` como ganadora: 200. Su saldo pasa de 94 (con la reserva) a 113. Ben queda en 75. Un segundo resultado y un reembolso sobre esa misma partida responden 409 `Esta partida ya está resuelta o reembolsada.`
