# MILESTONE_20 - Amistoso con bot, ranqueada sin bot

## Objective
El modo amistoso sigue sirviendo para probar contra el bot. Una ranqueada no usa IA: el rival tiene que ser otra persona.

## Key Concepts
Hay dos formas de jugar. Amistoso es práctica: el bot está, las fichas se usan, los puntos del mes no cambian. Ranqueada es el premio: humano vs humano, inscritos, y el bot no se ofrece. El developer aprende a no mezclar “hay oponente en pantalla” con “ese oponente es un bot”. Este corte es la base de los siguientes milestones: si la ranqueada aún mueve al rival con IA, el resto no vale.

## Checklist

- [x] En amistoso, el bot de prueba sigue disponible
- [x] En ranqueada, no aparece “jugar contra el bot”
- [x] Si la cola ranqueada no encuentra persona, no rellenar el hueco con un bot
- [x] Una partida ranqueada no mueve al rival con inteligencia local
- [x] Textos cortos: amistoso = bot o persona de prueba; ranking = otra persona

## Acceptance Criteria

- Se puede terminar un amistoso contra el bot como hasta ahora.
- Una ranqueada no se juega nunca contra el bot.
- En ranking, el segundo jugador no se mueve solo: espera a la otra persona (aunque aún no reciba sus teclas).
