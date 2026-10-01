| Ruta | Elemento | Selector | Estado | Observaciones |
|---|---|---|---|---|
| `/` sin sesión | Iniciar sesión | `button[aria-label="Iniciar sesión"]` | Visible | Abre el formulario en la barra |
| `/` login | Email y contraseña | `input[type="email"]`, `input[type="password"]` | Visible | Error accesible si la clave no vale |
| `/` sin suscripción | Ventana de pago | `#subscription-pay-title` | Visible | Titular, tarjeta, caducidad y CVC en la misma página |
| `/` ventana | Pagar suscripción | `button[aria-label="Pagar la suscripción de 10 euros"]` | Visible | No cobra si la tarjeta no es válida |
| `/` ventana | Ahora no | `button[aria-label="Cerrar sin pagar la suscripción"]` | Visible | Cierra sin marcar el mes como pagado |
| `/` ya pagado | Barra de puntos | `[aria-label$="puntos"]` | Visible | La ventana no vuelve a abrirse |
