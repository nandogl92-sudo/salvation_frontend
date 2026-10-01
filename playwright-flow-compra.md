# playwright-flow-compra

## Resumen ejecutivo

Estado: **Pass**. Entorno: local, frontend `http://localhost:4000`, API en el puerto 4444. La compra de la suscripción mensual funciona con la API real.

## Escenario

Flujo de compra de la suscripción de 10 €. Usuarios del conjunto de prueba: Fernando (`nando@gmail.com`) y Marcos (`marcos@gmail.com`). La página es una sola; no hay redirección a otra web de pago.

## Cobertura

Rutas enlazadas desde el inicio: 0 (la app no tiene enlaces internos). Vistas del flujo cubiertas: inicio sin sesión, login inválido, ventana de pago, pago rechazado, pago aceptado, nueva entrada ya pagada. Elementos críticos de la ventana de pago: 6.

## Qué ocurrió

- Una contraseña incorrecta no entra y muestra el error. La consola registra el 401 de esa petición.
- Fernando empezó la prueba con 99 puntos y el mes sin pagar. Al terminar el primer inicio de sesión ya tenía 109 puntos y octubre pagado, y la ventana no seguía abierta. Un segundo cobro responde 400 y el saldo se queda en 109. Al salir y volver a entrar no aparece la ventana.
- Marcos entró con 108 puntos. La ventana pidió la tarjeta en la misma página. Sin titular, avisa y no cobra. Con una tarjeta caducada, avisa «La tarjeta está caducada» y sigue en 108. Con una caducidad válida, el saldo pasa a 118, la ventana se cierra y la clasificación muestra Marcos 118 pts. Al salir y entrar otra vez no hay ventana y siguen 118. Un segundo cobro responde 400.

## Hallazgos

| ID | Severidad | Tipo | Descripción | Impacto |
|---|---|---|---|---|
| C1 | S3 | Contrato | `/sitemap.xml` y `/robots.txt` devuelven el HTML de la app, no un sitemap ni un robots | No afecta a la compra |
| C2 | S3 | Auth | El login inválido deja un 401 en la consola del navegador | El mensaje en pantalla es claro |

## Evidencias

Capturas en `artifacts/compra/screenshots/`: inicio sin sesión, Fernando ya pagado, ventana de Marcos, compra hecha. También `routes-discovered.json`, `routes-summary.md`, `element-inventory-compra.md`, `network.log` y `console.log`.
