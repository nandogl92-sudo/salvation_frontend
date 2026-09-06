# Milestone 2 — Gate de Auth + Módulo de Búsqueda (Matchmaking) · Mock

**Épicas:** cierre de Auth (AUTH-04) + Épica B — Búsqueda (ver backlog de Producto en el brief de PO).
**Alcance:** igual que el Milestone 1 — 100% mock, **sin backend real y sin instalar dependencias nuevas**. Todo con React 19, `localStorage` y APIs nativas del navegador.

**Objetivo del milestone:** que solo usuarios autenticados puedan apostar, y que "Buscar oponente" deje de ser un `setTimeout` de attrezzo: pasa a ser una **cola real basada en `localStorage`, compartida entre pestañas del mismo navegador**. Si dos pestañas abren sesión con dos cuentas distintas, eligen el mismo juego y la misma apuesta, **se emparejan de verdad** entre sí. Se agrega cancelar, timeout de 60s, y un modo de prueba explícito (bot) para cuando no hay un segundo jugador disponible.

---

## Por qué una cola cross-tab y no un `setTimeout`

El mock de Auth (Milestone 1) demostró que `localStorage` puede hacer de "backend" para una sola pestaña. Para Búsqueda necesitamos que **dos sesiones distintas se vean entre sí**. `localStorage` es compartido por todas las pestañas del mismo origen (`http://localhost:3001`), así que se usa como cola compartida: cada pestaña escribe su "ticket" de búsqueda y hace polling corto (cada ~1s) para ver si otra pestaña con el mismo juego y la misma apuesta ya está esperando. Si la hay, ambas pestañas quedan emparejadas sin que ninguna de las dos necesite un servidor.

Esto no es producción (no hay WebSockets, no hay servidor, no funciona entre navegadores distintos), pero es un mock honesto: dos usuarios reales, en dos pestañas reales, se encuentran de verdad — no es una animación.

---

## Alcance NO cubierto en este milestone

- WebSockets / servidor real de matchmaking.
- Validación de resultados por "autoridad del servidor" (anti-cheat) — sigue igual que antes.
- Reembolso real ante caída de servidor (sigue como TODO/FIXME existente).
- Comisión de plataforma sobre el pozo.
- Emparejamiento entre navegadores/dispositivos distintos (requiere backend real).
- Reserva de saldo a nivel multi-pestaña de la **misma** cuenta (double-spend) — mock de una sola cuenta por pestaña, documentado como limitación conocida.

---

## To-do list — 5 pasos

- [ ] **Paso 1 — AUTH-04: Gate de juego** (`App.tsx`)
  Quitar el `alert('Por favor, inicia sesión primero.')`. Sin sesión, el click en un juego lleva al panel de Auth (pestaña login) en vez de abrir el lobby. Guard adicional: si por algún motivo se pierde la sesión estando en `lobby` o `playing`, se vuelve a `home`.

- [ ] **Paso 2 — Tipos + almacén de cola** (`src/types.ts`, `src/matchmaking/queueStorage.ts`)
  `MatchTicket`, `MatchRecord`, `QueueStatus`. Wrapper sobre `localStorage` con dos claves nuevas: `betplay.mock.queue` (tickets esperando) y `betplay.mock.matches` (emparejamientos resueltos).

- [ ] **Paso 3 — Servicio de matchmaking** (`src/matchmaking/matchmakingService.ts`)
  `joinQueue(ticket)`, `cancelQueue(ticketId)`, `pollQueue(ticketId)` (busca match compatible: mismo `gameId` + misma `betAmount` + `userId` distinto; si lo encuentra, crea un `MatchRecord` y limpia ambos tickets de la cola), `getMatch(ticketId)`.

- [ ] **Paso 4 — Integrar la cola real en `App.tsx`**
  Sustituir el `setTimeout` de 3s: `startMatchmaking` ahora hace `joinQueue` y arranca un polling (~1s). Si hay match → `playing` con los datos reales del rival. Si pasan 60s sin match → estado de timeout con **"Seguir buscando"** o **"Cambiar apuesta"**. **Cancelar** ahora sí llama a `cancelQueue` (antes solo cambiaba de vista).

- [ ] **Paso 5 — UI del rival real (o modo prueba)**
  En la cabecera de `playing`, mostrar el username real del rival (ya no `Player_2_Random` hardcodeado). Si tras el timeout no hay nadie en cola, ofrecer explícitamente **"Jugar contra bot de prueba"**, etiquetado como modo prueba (no como rival real) — cumple la respuesta abierta del PO brief ("sí, etiquetado 'Modo prueba'").

---

## Historias cubiertas

| Historia | Cómo se cubre en este milestone |
|---|---|
| AUTH-04 (gate de juego) | Paso 1 |
| SRC-05 (búsqueda solo autenticada) | Consecuencia directa del Paso 1: sin `currentUser` no hay `joinQueue` posible |
| SRC-01 (entrar a cola) | Paso 3 + 4 |
| SRC-02 (cancelar búsqueda) | Paso 3 + 4 |
| SRC-03 (emparejar por juego + apuesta) | Paso 3 (cola cross-tab real) + Paso 5 (UI) |
| SRC-04 (timeout de cola, 60s) | Paso 4 + 5 |

---

## Cómo probar este milestone

Necesitas **dos pestañas** del mismo navegador en `http://localhost:3001`, con **dos cuentas distintas** (regístralas si no existen).

1. **Gate:** cerrando sesión, click en cualquier juego del catálogo → debe abrir el panel de login, no un `alert()`.
2. **Cola real (dos pestañas):**
   - Pestaña A: login cuenta 1 → elegir "Paddle Duel" → apuesta `$10` → Confirmar y Buscar.
   - Pestaña B: login cuenta 2 → elegir "Paddle Duel" → apuesta `$10` → Confirmar y Buscar.
   - Ambas pestañas deben pasar a `playing` casi al mismo tiempo, cada una mostrando el username real de la otra como rival.
3. **Apuestas distintas no emparejan:** repetir con apuestas diferentes (`$10` vs `$15`) → ninguna encuentra rival hasta que cambien la apuesta o pase el timeout.
4. **Cancelar:** entrar a la cola y pulsar Cancelar → vuelve a home; abrir otra pestaña con otra cuenta y la misma apuesta → no debe encontrar a la que canceló.
5. **Timeout:** entrar a la cola sin nadie más esperando y dejar pasar 60s → aparece el estado de timeout con las opciones de reintentar o cambiar apuesta, y la opción de bot de prueba.
6. **Bot de prueba:** desde el estado de timeout, "Jugar contra bot de prueba" → entra a `playing` con el rival claramente etiquetado como modo prueba (no dice ser un jugador real).

## Reset manual del mock (cola)

En la consola del navegador:

```js
localStorage.removeItem('betplay.mock.queue');
localStorage.removeItem('betplay.mock.matches');
```

(Las claves de Auth — `betplay.mock.users`, `betplay.mock.session` — no se tocan.)

---

## Resultado de la verificación (5 sep 2026, `http://localhost:3001`)

Verificado end-to-end con navegador automatizado (una pestaña real + un ticket rival inyectado directamente en `betplay.mock.queue` para simular la segunda pestaña, exactamente como lo haría otro navegador):

| Prueba | Resultado |
|---|---|
| `npm run lint` (`tsc --noEmit`) | ✅ Sin errores |
| Gate (AUTH-04): click en un juego sin sesión | ✅ Muestra el panel de login con aviso "Inicia sesión para jugar `<juego>`.", ya no `alert()` |
| Tras registrarse/loguearse con un juego pendiente | ✅ Entra directo al lobby de ese juego |
| Cola real: ticket rival ya esperando (mismo juego + misma apuesta) | ✅ Emparejamiento real vía `localStorage`; UI muestra el username real del rival y el pozo correcto |
| `betplay.mock.queue` / `betplay.mock.matches` tras el match | ✅ Cola vacía, `MatchRecord` con ambos jugadores persistido |
| Cancelar búsqueda | ✅ El ticket se elimina de verdad de `betplay.mock.queue` (antes solo cambiaba de vista) |
| Timeout de 60s (simulado adelantando `Date.now`) | ✅ Aparece el estado con "Seguir buscando" / "Cambiar apuesta" / "Jugar contra bot de prueba"; ticket retirado de la cola |
| Bot de prueba | ✅ Entra a `playing` etiquetado como "Bot de prueba (modo prueba)", nunca como rival real |
| Logout durante una búsqueda activa | ✅ (tras fix) cancela el ticket de la cola y vuelve a home |

### Bugs encontrados y corregidos durante la verificación

1. **`AuthPanel` no cambiaba de pestaña con el gate.** `initialMode` solo se usaba como valor inicial de `useState`, y `AuthPanel` no se desmonta cuando `App.tsx` pasa de "sin juego pendiente" a "con juego pendiente" (sigue siendo la misma instancia del componente). Se agregó un `useEffect` en `AuthPanel.tsx` que sincroniza `mode` cuando cambia `initialMode`.
2. **Ticket huérfano en la cola al cerrar sesión.** `handleLogout` llamaba a `setView('home')` de forma síncrona justo después de disparar `logout()` (asíncrono). Esto hacía que, cuando el guard de sesión reaccionaba a `currentUser === null`, `view` ya fuera `'home'` y su condición (`view === 'lobby' || 'playing'`) nunca se cumpliera — el ticket quedaba en `betplay.mock.queue` para siempre. Se corrigió haciendo que `handleLogout` cancele la búsqueda (`cancelQueue`) y limpie el estado de matchmaking directamente, antes de cambiar de vista.

## Siguiente milestone (fuera de alcance aquí)

- Persistir/reservar saldo formalmente al entrar a la cola (evitar doble gasto).
- Autoridad del servidor sobre el resultado del juego.
- Comisión de plataforma sobre el pozo.
- Reembolso real ante "caída de servidor".
