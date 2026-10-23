# MILESTONE_16 - Clasificación mensual: solo gana el 1.º

## Objective
La clasificación del premio ordena por puntos del mes. Solo el primero gana. Al cambiar el mes, esa lista empieza de cero.

## Key Concepts
El premio es de un ganador al mes. La lista debe mostrar puntos del mes, no fichas. Hace falta inscripción de ese mes para aparecer como competidor. El developer aprende que “quién va primero” es una temporada con fecha de caducidad, no el historial de la cuenta. Sirve para el resto de reglas (límites y remontada).

## Checklist

- [x] La clasificación lista puntos del mes, de más a menos
- [x] Destacar solo el 1.º como quien elige el premio
- [x] Quien no tiene inscripción de este mes no compite en esa lista (o se ve que no opta)
- [x] Indicar el mes en curso (por ejemplo octubre 2026)
- [x] Texto de que el mes siguiente la lista vuelve a 0

## Acceptance Criteria

- El 1.º de la lista es quien más puntos del mes tiene, no quien más fichas tiene.
- Se entiende que solo el primero gana y que el mes se reinicia.
