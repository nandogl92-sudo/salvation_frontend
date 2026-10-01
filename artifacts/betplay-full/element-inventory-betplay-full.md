# Inventario de elementos — betplay-full

| Ruta / vista | Elemento | Selector | Estado | Observaciones |
|---|---|---|---|---|
| home | Logo | `button[aria-label="Ir al inicio de BetPlay"]` | visible, clicable | Vuelve al inicio |
| home | Pestaña Registrarse | `div.flex.gap-2.mb-6 button:first-child` | visible | Sin aria-label propio |
| home | Pestaña Iniciar sesión | `div.flex.gap-2.mb-6 button:nth-child(2)` | visible | Sin aria-label propio |
| home | Email | `input[name="email"]` | visible, requerido | |
| home | Contraseña | `input[name="password"]` | visible, requerido | Mínimo 8 en registro |
| home | Usuario | `input[name="username"]` | visible en registro | Mínimo 3 |
| home | Confirmar contraseña | `input[name="confirmPassword"]` | visible en registro | |
| home | Enviar auth | `form button[type="submit"]` | visible | |
| home | Jugar Paddle Duel | `button[aria-label="Jugar Paddle Duel"]` | visible | Sin sesión abre el login |
| home | Resto de juegos | `button[aria-label^="Jugar "]` | visibles | 5 juegos |
| lobby | Apuesta | `#bet-amount` | visible | Label "Cantidad a apostar (USD)" |
| lobby | Saldo insuficiente | `role=alert` | visible si apuesta > saldo | Probado con 500 |
| lobby | Buscar rival | `button[aria-label="Buscar rival real"]` | visible | Pasa a "Buscando oponente" |
| playing | Resultado | heading Perdiste / Ganaste | visible al terminar | |
| playing | Volver al inicio | botón con ese texto | visible | |
| navbar | Perfil | `button[aria-label^="Ver perfil de "]` | visible con sesión | |
| navbar | Cerrar sesión | `button[aria-label="Cerrar sesión"]` | visible con sesión | |
| profile | Reintentar | `button[aria-label="Reintentar cargar el historial"]` | solo en error | No se disparó |
| profile | Volver | botón "← Volver al inicio" | visible | Sin aria-label |
