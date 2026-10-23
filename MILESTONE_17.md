# MILESTONE_17 - Ranqueada: humano vs humano con inscripción

## Objective
El jugador distingue una partida que suma al premio de una que no. Solo humano vs humano, ambos inscritos. El bot no suma.

## Key Concepts
No toda partida vale para el premio. Ranqueada = los dos pagaron el mes y no hay bot. Amistosa o bot = se juega, no sube al 1.º. El developer aprende a etiquetar el tipo de partida antes de empezar, para que el jugador no crea que un bot o un amigo “de trampa” le da el premio.

## Checklist

- [x] En el lobby, separar “Ranking” y “Amistoso” (o equivalente muy claro)
- [x] La ranqueada solo se ofrece si el usuario tiene inscripción de este mes
- [x] El bot nunca se ofrece como partida de ranking
- [x] Tras una ranqueada ganada, los puntos del mes suben 1 en la UI
- [x] Tras perder, los puntos del mes no bajan

## Acceptance Criteria

- No se puede lanzar una ranqueada contra el bot.
- Una victoria ranqueada suma 1 punto del mes; una derrota no lo resta.
- Una amistosa o un bot no cambian el puesto del premio.
