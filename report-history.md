# History — Reporte de Integración

## Resumen

El perfil deja de leer `localStorage`. Las estadísticas y las últimas partidas salen de `GET /users/:id/history`. El servidor ya calculó victorias, derrotas y profit. El cliente solo muestra los datos y se queda con las 10 partidas más recientes.

## Endpoints

| Función | Método y ruta | Auth | Éxito |
|---|---|---|---|
| `fetchPlayerHistory` | `GET /users/:id/history` | `Authorization: Bearer <token>` | 200 con totales e `history` |

`403` si el id no es el de la sesión: `Solo puedes consultar tu propio historial.` `404` si el usuario no existe. Sin partidas, los totales son 0 y `history` es `[]`. Las partidas contra bot no vienen en la lista.

## Cambios en Frontend

- `src/api/historyApi.ts`: ya no reexporta el mock. Traduce `playedAt` de ISO a número y `gameId` al nombre visible (`pong` → Paddle Duel).
- `src/profile/usePlayerStats.ts`: pide el historial al montar el perfil y al pulsar reintentar.
- `src/profile/ProfilePanel.tsx`: estados de carga, error con reintento, vacío y lista.

`src/history/historyStorage.ts` sigue en el repo y la pantalla ya no lo usa.

## Tipos/Validaciones

La respuesta debe traer `totalGames`, `wins`, `losses` y `totalProfit` numéricos, y un array cuyos registros tengan `id`, `userId`, `gameId`, `betAmount`, `profit`, `playedAt` y `result` (`win`, `loss` o `refund`). Si falta algo, se muestra error y no una lista a medias.

## Estados y Errores

- Cargando: texto "Cargando historial...".
- Error: el `message` del API y un botón Reintentar.
- Vacío: el perfil lo dice y recuerda que el bot no entra en el historial.
- Éxito: tarjetas con las cifras del servidor y hasta 10 filas.

## Observabilidad

Cada GET escribe en consola `[history]` con `endpoint`, `status` y `latencyMs`.

## Riesgos y Next Steps

- El navegador sigue bloqueado por CORS hasta que el backend envíe `Access-Control-Allow-Origin`.
- Auth, cola, resultado e historial ya usan el API. No queda otro módulo de `docs/backend/FRONTEND_INTEGRATION.md` pendiente de conectar.
- La partida de Snake a 5 USD que quedó abierta en la verificación de matchmaking no aparece aquí porque nunca se resolvió.

## Verificación

Contra `http://localhost:4444`, el historial de Ana responde 200: 3 partidas, 3 victorias, profit 27. La más reciente es Pong, `win`, profit 9. Pedir el historial de Ben con el token de Ana responde 403 `Solo puedes consultar tu propio historial.`
