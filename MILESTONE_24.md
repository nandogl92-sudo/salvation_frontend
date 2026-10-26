# MILESTONE_24 - Un solo final de ranqueada, amistoso intacto

## Objective
La ranqueada termina igual en los dos terminales: mismo ganador, mismas fichas, +1 punto del mes si aplica. Cerrar o cortar cuenta como derrota. El amistoso vs bot no suma al premio.

## Key Concepts
Si cada pantalla declara un ganador distinto, el pozo y el ranking se rompen. Tiene que haber un único cierre: choque con el aro, explosión, abandono o desconexión. Las dos UIs muestran el mismo resultado y vuelven al inicio. El developer aprende que el resultado de ranking es compartido, y que el bot de amistoso no entra en esa cuenta. Cierra el bloque: ya se puede jugar ranking de persona a persona y seguir probando con el bot.

## Checklist

- [ ] Al terminar una ranqueada, las dos pantallas muestran el mismo ganador y el mismo marcador
- [ ] Solo esa ranqueada suma (o no) el punto del mes, una vez
- [ ] Salir, recargar o perder la conexión cuenta como derrota para quien se fue
- [ ] El rival ve que ganó por abandono, no una partida colgada
- [ ] El amistoso vs bot sigue sin cambiar puntos del mes ni exigir un segundo terminal

## Acceptance Criteria

- Dos personas terminan una ranqueada y ven el mismo resultado; el historial y las fichas coinciden.
- Quien cierra la pestaña pierde; el otro gana esa ranqueada.
- Se puede seguir abriendo un amistoso contra el bot para probar un juego sin afectar el premio.
