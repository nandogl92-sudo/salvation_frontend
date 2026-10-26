# MILESTONE_23 - En ranqueada, cada persona mueve solo su lado

## Objective
El espacio, el toque o las teclas de un terminal mueven a ese jugador en las dos pantallas. El rival se mueve porque la otra persona pulsa, no porque una IA lo simule.

## Key Concepts
Este es el duelo de verdad. Tú impulsas tu avión (o tu pala, tu coche) y eso se ve en el otro monitor. El otro hace lo mismo. Nadie controla a los dos con un solo teclado. El developer aprende a tratar la entrada del rival como la de otra persona, no como un bot. En amistoso, el segundo lado sigue siendo el bot de prueba.

## Checklist

- [x] En ranqueada, las teclas/toques locales solo mueven al jugador local
- [x] Ese movimiento se ve también en el terminal del rival
- [x] El movimiento del rival en tu pantalla sale de su teclado o toque, no de un bot
- [x] Un retraso corto no rompe la partida: se entiende quién va en cada lado
- [x] En amistoso, el segundo jugador sigue siendo el bot

## Acceptance Criteria

- En dos terminales, cada uno mueve solo su personaje y el otro lo ve.
- En ranqueada no hay “el rival juega solo” como el bot.
- Un amistoso contra el bot se controla igual que antes en un solo teclado.
