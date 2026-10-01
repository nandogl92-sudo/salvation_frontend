# Objetivo

Conectar el resultado de cada partida con el saldo de los jugadores, usando **mocks en memoria**: reservar la apuesta al entrar en la cola, devolverla si se cancela o vence el tiempo, pagar al ganador con comisión de plataforma y reembolsar si hay error de plataforma.

Fuentes: `docs/frontend/MILESTONE_3.md` (reserva, comisión del 5 %, resolución y reembolso) y `docs/frontend/MILESTONE_5.md` (el frontend llamará a `updateUserBalance` y a `POST /match/result`).

# Funcionalidades

- [x] Al entrar en la cola se descuenta `betAmount` del saldo como reserva.
- [x] Si el saldo no cubre la apuesta, no se entra en la cola.
- [x] Cancelar la búsqueda o el timeout de 60 s devuelve la reserva.
- [x] Al terminar una partida real, el ganador recibe `betAmount * 2 - comisión (5 %)`. El perdedor no cambia: ya apostó al entrar en la cola.
- [x] Un error de plataforma (`platform_error`) reembolsa la reserva a ambos jugadores.

# Tareas

- [x] **Tarea 1 — Ajuste de saldo en el modelo mock de usuario**
  - **Objetivo:** poder sumar o restar saldo sin pasar por el `PATCH` de perfil.
  - **Descripción:** añadir `adjustBalance(userId, delta)` en `user.model.ts`. Solo cambia el número; no calcula comisiones ni reservas. El `PATCH /users/:id` sigue sin aceptar `balance`.
  - **Archivos afectados:** `src/models/user.model.ts`.
  - **Criterios de aceptación:**
    - `adjustBalance` actualiza el saldo en memoria y devuelve el usuario, o `null` si no existe.
    - `updateUser` del CRUD no acepta `balance`.
  - **Dependencias necesarias:** ninguna.

- [x] **Tarea 2 — Reserva al entrar en la cola y devolución al cancelar o vencer**
  - **Objetivo:** que `joinQueue` reserve el dinero, como el Paso 5 del frontend Milestone 3.
  - **Descripción:** en `matchmaking.service.ts`, antes de crear el ticket, comprobar que `user.balance >= betAmount` y restar esa cantidad. Si se cancela un ticket `waiting`, devolver la reserva. Si `tryMatch` marca el ticket como `expired`, devolverla también. Si hay emparejamiento real, la reserva se queda retenida hasta resolver la partida.
  - **Archivos afectados:** `src/services/matchmaking.service.ts`.
  - **Criterios de aceptación:**
    - `POST /matchmaking/tickets` con saldo insuficiente responde `400` y no crea ticket.
    - Tras entrar en la cola, `GET /auth/sessions/current` muestra el saldo menos `betAmount`.
    - `DELETE /matchmaking/tickets/:ticketId` en un ticket `waiting` restaura el saldo.
    - Un ticket `expired` restaura el saldo una sola vez (no se reembolsa dos veces).
  - **Dependencias necesarias:** ninguna.

- [x] **Tarea 3 — Servicio de resolución de partidas**
  - **Objetivo:** calcular el pozo y mover el saldo cuando termina una partida real.
  - **Descripción:** crear `match.service.ts` con constante `PLATFORM_FEE_PERCENT = 5`. Funciones:
    - `resolveMatch(user, matchId, winnerUserId)`: el ganador recibe `betAmount * 2 - comisión`; el perdedor no cambia. Marca la partida como resuelta para no pagarla dos veces.
    - `refundMatch(user, matchId)`: si `reason === 'platform_error'`, devuelve `betAmount` a cada jugador humano y marca la partida como reembolsada.
    No aplica economía a partidas `isBotMatch: true` (el frontend las trata como modo prueba y las excluye del historial oficial).
  - **Archivos afectados:** `src/services/match.service.ts`, `src/models/matchmaking.model.ts`.
  - **Criterios de aceptación:**
    - Con `betAmount = 10`, el ganador gana `19` (pozo 20 menos 5 %) y el perdedor se queda con el saldo ya descontado.
    - Resolver o reembolsar dos veces la misma partida da error de conflicto.
    - Una partida de bot da error: no mueve saldo.
  - **Dependencias necesarias:** ninguna.

- [x] **Tarea 4 — Endpoints REST de resultado y reembolso**
  - **Objetivo:** que el frontend pueda informar el fin de partida sin un simulador en el servidor.
  - **Descripción:** crear controlador y rutas protegidas con `requireSession`:
    - `POST /matches/:matchId/results` con `{ winnerUserId }` llama a `resolveMatch`.
    - `POST /matches/:matchId/cancellations` con `{ reason: 'platform_error' }` llama a `refundMatch`.
    Solo un jugador de esa partida puede llamar. Montar el router en `app.ts`.
  - **Archivos afectados:** `src/controllers/match.controller.ts`, `src/routes/match.routes.ts`, `src/app.ts`.
  - **Criterios de aceptación:**
    - Sin sesión: `401`.
    - Quien no es jugador de esa partida: `403`.
    - Partida inexistente: `404`.
    - `winnerUserId` que no está en la partida, o `reason` distinto de `platform_error`: `400`.
    - Resultado o reembolso ya aplicado: `409`.
    - Éxito: `200` con los perfiles públicos y saldos de los jugadores humanos.
  - **Dependencias necesarias:** ninguna.

- [x] **Tarea 5 — Verificación**
  - **Objetivo:** probar el flujo completo contra el servidor en marcha, sin MongoDB.
  - **Descripción:** comprobar reserva, cancelación, timeout, victoria y `platform_error` con peticiones reales. Actualizar `README.md` con las dos rutas nuevas.
  - **Archivos afectados:** `README.md`.
  - **Criterios de aceptación:**
    - `npx tsc --noEmit` y `npm run build` terminan sin errores.
    - Dos usuarios con saldo `100` y apuesta `10`: tras el match y un `results`, el ganador tiene `109` y el perdedor `90`.
    - `platform_error` deja a ambos con `100` otra vez.
    - Cancelar la cola restaura el saldo antes del match.
  - **Dependencias necesarias:** ninguna.

# Fuera del alcance

- Conexión a MongoDB o a cualquier otra base de datos.
- Historial de partidas, estadísticas y pantalla de perfil (frontend Milestone 4): eso será el siguiente milestone del backend.
- Validar el ganador como autoridad anti-cheat (el frontend Milestone 2 lo deja fuera).
- Comisión distinta del 5 % o pozo con más de dos jugadores.
- Mover saldo con `PATCH /users/:id`.
- WebSockets.
- Nuevas dependencias en `package.json`.
- Partidas contra bot: no cambian el saldo oficial.

## Notas de incertidumbre

- **Quién informa el resultado:** el frontend usa `onGameEnd('p1' | 'p2')` en el cliente. No hay servidor de juego. Se asume que un jugador de la partida envía `winnerUserId`. Eso es trampeable; el frontend lo documenta como limitación.
- **Nombre de la ruta:** el frontend Milestone 5 apunta a `POST /match/result`. Se proponen recursos REST `/matches/:matchId/results` y `/matches/:matchId/cancellations`. Hay que acordarlos con el frontend.
- **`p1` / `p2` frente a `userId`:** el frontend habla de jugadores locales. El backend identifica por `userId`. El adaptador del frontend debe traducir `p1`/`p2` al `userId` de `MatchRecord.players`.
- **Reserva en partidas de bot:** el frontend no dice si al elegir el bot se descuenta saldo. Este milestone no reserva ni paga partidas `isBotMatch`. Si `joinQueue` ya descontó y luego se elige bot, hay que devolver esa reserva al crear el bot-match. Confirmar con el frontend.
- **Saldo insuficiente:** el frontend Milestone 3 no lo escribe como regla, pero la reserva no puede dejar el saldo negativo. Se rechaza el `joinQueue` con `400`.
- **Formato del saldo:** se sigue usando número (`100`, `19`), no céntimos. `10 * 2 * 0.95 = 19` cierra sin decimales; otras apuestas pueden dejar decimales. No está definido el redondeo.
