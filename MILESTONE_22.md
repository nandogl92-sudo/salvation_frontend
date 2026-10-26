# MILESTONE_22 - Los dos ven el mismo mundo en ranqueada

## Objective
En una ranqueada, los dos jugadores miran la misma partida: mismos aros o circuito, mismo tiempo, mismos marcadores. No son dos partidas sueltas.

## Key Concepts
Si cada terminal inventa el recinto por su cuenta, uno esquiva un aro que el otro no tiene. El duelo deja de ser justo. Hay que compartir el arranque (quién es tú y quién es el rival, cuándo empieza el 3-2-1) y lo que ocurre en el campo. El developer aprende que “la misma partida” es lo que ven los dos, no dos canvas parecidos. El amistoso con bot puede seguir generando el mundo solo en local.

## Checklist

- [x] En ranqueada, los dos ven el mismo campo y los mismos obstáculos
- [x] Cada uno se ve como “tú” a su lado y al otro como rival
- [x] La cuenta atrás y el inicio coinciden en ambos terminales
- [x] Puntuación y tamaño (o vueltas/vidas, según el juego) coinciden al mirar las dos pantallas
- [x] El amistoso vs bot sigue generando el mundo solo en esa máquina

## Acceptance Criteria

- Grabando las dos pantallas a la vez, aros, tiempos y marcadores coinciden.
- Nadie ve un recinto distinto al del rival en la misma ranqueada.
- El bot en amistoso no exige esa copia en un segundo terminal.
