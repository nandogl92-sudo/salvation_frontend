# MILESTONE_8 - Elegir rival o uno al azar

## Objective

Al querer jugar, el jugador ve a los registrados, elige a uno, y si no elige, le toca uno al azar. La partida es contra esa persona.

## Key Concepts

Hoy la búsqueda espera a que otra persona entre sola en la misma cola, y por eso se queda buscando. Aquí el rival se decide antes de empezar: la lista son las cuentas registradas, sin incluirse a uno mismo. Elegir a alguien significa jugar contra esa persona. No elegir significa que la app sortea un nombre de esa misma lista y empieza igual. Los puntos de la partida siguen siendo los del milestone de puntos. Este paso enseña a cerrar el “contra quién” antes de entrar al juego, en lugar de dejar la espera abierta.

## Checklist

- [x] Al elegir un juego, mostrar los jugadores registrados antes de empezar
- [x] Permitir elegir a uno de esa lista
- [x] Si no se elige ninguno, sortear uno de la lista
- [x] Empezar la partida contra esa persona
- [x] No ofrecer al propio jugador como rival

## Acceptance Criteria

- La lista muestra cuentas registradas de verdad.
- Elegir a una persona abre la partida contra ella, no una búsqueda sin rival.
- Pulsar jugar sin elegir abre la partida contra otra cuenta de la lista, distinta en intentos sucesivos cuando hay más de una.
- El jugador no aparece como su propio rival.
