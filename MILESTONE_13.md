# MILESTONE_13 - Recibir los puntos al completar el pago

## Objective

Si el pago de la ventana termina bien, la misma cuenta recibe 10 puntos y la ventana se cierra. Si no termina, los puntos no cambian.

## Key Concepts

Los 10 puntos solo aparecen cuando el pago de esta página se ha completado. No se suman al abrir la ventana ni al cerrarla. El nuevo total se ve en la barra y en la clasificación, y sigue ahí al salir y volver a entrar. Un pago rechazado o interrumpido explica el motivo y deja la ventana abierta para intentarlo otra vez. Con el milestone anterior ya se puede escribir el pago en la página; aquí ese pago se convierte en puntos de la cuenta.

## Checklist

- [x] Sumar 10 puntos a la cuenta solo cuando el pago de la ventana se completa
- [x] Cerrar la ventana al completarse y mostrar el nuevo total en la barra
- [x] Mantener esos puntos al salir y volver a entrar
- [x] Si el pago no se completa, no cambiar los puntos y mostrar el motivo
- [x] Dejar la ventana abierta para reintentar cuando el pago falla

## Acceptance Criteria

- Un pago completado deja la cuenta con 10 puntos más y cierra la ventana.
- Al volver a entrar, esos puntos siguen en la cuenta y en la clasificación.
- Un pago que no se completa no modifica los puntos, explica qué pasó y permite intentarlo de nuevo.
