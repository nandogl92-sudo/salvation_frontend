# MILESTONE_14 - No volver a cobrar si la suscripción ya está pagada

## Objective

Quien ya tiene la suscripción de este mes entra directo a jugar. La ventana de pago solo vuelve si ese mes no está pagado.

## Key Concepts

Pagar una vez al mes basta. Si la suscripción de este mes ya está hecha, entrar no debe abrir otra vez la ventana ni pedir otros 10 €. Si no está pagada, o ha dejado de estarlo, la ventana de la misma página vuelve a aparecer. El estado sale de la cuenta, no de haber cerrado la ventana antes. Así los puntos del milestone anterior no se suman dos veces por el mismo mes, y quien no ha pagado sigue viendo por qué no puede competir por el premio.

## Checklist

- [x] No abrir la ventana de pago si la suscripción de este mes ya está pagada
- [x] Abrirla de nuevo si este mes no está pagada
- [x] No sumar otros 10 puntos por un mes que ya se cobró
- [x] Seguir permitiendo cerrar la ventana sin pagar cuando sí hace falta mostrarla
- [x] Mantener este comportamiento al salir y volver a entrar

## Acceptance Criteria

- Entrar con la suscripción de este mes pagada no muestra la ventana ni suma puntos otra vez.
- Entrar sin esa suscripción muestra la ventana en la misma página.
- Cerrar la ventana sin pagar no la convierte en pagada.
