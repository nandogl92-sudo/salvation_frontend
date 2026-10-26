# MILESTONE_21 - La ranqueada abre en los dos terminales

## Objective
Cuando el ranking empareja a dos personas, las dos entran a la misma partida. No basta con que solo quien buscó vea el juego.

## Key Concepts
Hoy el que elige ranking puede entrar a jugar y el otro seguir en el inicio. Eso no es un duelo. Los dos terminales tienen que pasar a la arena con el mismo rival, el mismo juego y la misma apuesta. El developer aprende que “partida encontrada” es un evento para los dos, no un clic local. Sin esta puerta común, no se pueden sincronizar controles ni el resultado.

## Checklist

- [x] Al emparejar una ranqueada, el buscador entra a jugar
- [x] Al emparejar una ranqueada, el rival también entra a jugar en su terminal
- [x] Ambos ven el mismo juego, el mismo rival y que es ranqueada
- [x] Nadie entra a una ranqueada si el otro no está listo (espera visible)
- [x] El amistoso contra bot no cambia: sigue empezando solo en el terminal local

## Acceptance Criteria

- Dos cuentas inscritas, en dos navegadores, pulsan ranking del mismo juego y las dos ven la arena.
- Si una aún no ha entrado, la otra ve que espera al rival, no un bot.
- Un amistoso vs bot se juega en un solo terminal, como ahora.
