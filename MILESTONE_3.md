# MILESTONE_3 - Resolución de Partidas y Economía de Apuestas

## Objective

Conectar el resultado real de cada juego con el sistema de saldo: cuando un juego termina, el balance del ganador sube y el del perdedor baja de forma correcta y trazable. Eliminar el panel "Simulador de Resultados" del prototipo y cubrir el flujo de error de plataforma (reembolso).

---

## Key Concepts

En este milestone el juego deja de ser un prototipo con botones manuales y pasa a ser funcional: cada juego ya llama a `onGameEnd('p1' | 'p2')` cuando detecta un ganador. Lo que falta es que `App.tsx` escuche ese resultado, calcule el pozo correctamente (apuesta × 2, menos comisión) y actualice el saldo de ambos jugadores en `localStorage`. También se resuelve el caso de error de plataforma: en vez de un `alert()`, se descuenta la apuesta al perdedor y se devuelve al ganador, o se reembolsa a ambos. Esto enseña a conectar la lógica de negocio (dinero) con el resultado de un componente hijo (el juego), un patrón que se repetirá cuando haya backend real.

---

## Checklist

- [ ] **Paso 1 — Verificar que todos los juegos llaman a `onGameEnd`**
  Revisar `Pong.tsx`, `Snake.tsx`, `Tetris.tsx`, `Combat.tsx` y `Shooter.tsx`. Cada uno debe llamar a `onGameEnd('p1')` o `onGameEnd('p2')` cuando la partida termina de forma legítima. Documentar con un comentario qué evento dispara el fin de partida en cada juego.

- [ ] **Paso 2 — Definir la lógica de resolución de saldo en `App.tsx`**
  Reemplazar el `handleGameEnd` actual por una función que calcule el nuevo balance correctamente: el ganador recibe `betAmount * 2 - comisión` y el perdedor no cambia (ya apostó). Definir la comisión como constante visible (`PLATFORM_FEE_PERCENT = 5`). Usar `setBalance` del contexto de auth para persistir el saldo actualizado en `localStorage`.

- [ ] **Paso 3 — Resolver el flujo de "error de plataforma" sin `alert()`**
  Sustituir el `alert("Error de la plataforma...")` del `FIXME` por un estado de UI: una pantalla de resultado que muestre "Partida cancelada — saldo reembolsado" cuando `reason === 'platform_error'`. El saldo no cambia (se reembolsa el `betAmount` que se descontó al entrar a la cola, cuando esa reserva exista).

- [ ] **Paso 4 — Pantalla de resultado post-partida**
  Después de `onGameEnd`, en vez de volver directamente a `home`, mostrar una pantalla de resultado (misma vista `playing`, sección inferior) con: ¿ganaste o perdiste?, cuánto sumaste o restaste, y el nuevo saldo. Un botón "Volver al inicio" cierra la pantalla. Eliminar el panel "Simulador de Resultados (Solo Prototipo)" del JSX.

- [ ] **Paso 5 — Reserva de saldo al entrar a la cola**
  Al hacer `joinQueue`, descontar `betAmount` del saldo del jugador local como reserva. Si cancela la búsqueda o hay timeout, devolver el importe. Si hay match, la reserva ya está hecha y no se vuelve a descontar al resolver la partida. Esto evita el double-spend documentado como limitación conocida en el Milestone 2.

---

## Acceptance Criteria

- Ganar una partida en cualquiera de los 5 juegos actualiza el saldo automáticamente (sin pulsar botones del simulador).
- El panel "Simulador de Resultados (Solo Prototipo)" ya no aparece en la vista `playing`.
- Cancelar la búsqueda después de entrar a la cola devuelve el `betAmount` al saldo del jugador.
- Un error de plataforma (`reason === 'platform_error'`) muestra una pantalla de reembolso, sin `alert()`.
- `npm run lint` (`tsc --noEmit`) no reporta errores tras los cambios.
