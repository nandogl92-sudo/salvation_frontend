# element-inventory-salvation-qa

| Ruta | Elemento | Selector | Estado | Observaciones |
|---|---|---|---|---|
| `/` | Logo | `button[aria-label='Ir al inicio de Retro Hub']` | visible, clicable | Vuelve a home |
| `/` | Inicio | `button[aria-label='Inicio']` | visible | |
| `/` | Juegos | `button[aria-label='Juegos']` | visible | Scroll a catálogo |
| `/` | Ranking | `button[aria-label='Ranking']` | visible | |
| `/` | Info | `button[aria-label='Info']` | visible | |
| `/` | Crear usuario | `button[aria-label='Crear usuario']` | visible sin sesión | |
| `/` | Iniciar sesión (nav) | `button[aria-label='Iniciar sesión']` | visible sin sesión | Abre/cierra panel; no envía el form |
| `/` | Email | `input[aria-label='Email']` | visible con panel | Añadido en este ciclo |
| `/` | Contraseña | `input[aria-label='Contraseña']` | visible con panel | Añadido en este ciclo |
| `/` | Enviar login | `button[aria-label='Enviar inicio de sesión']` | visible con panel | Distinto del botón de la barra |
| `/` | Empezar a jugar | `button[aria-label='Empezar a jugar']` | visible | Scroll a juegos |
| `/` | Jugar Paddle Duel | `button[aria-label='Jugar Paddle Duel']` | visible | Abre lobby si hay sesión |
| `/` | Tema | `button[aria-label='Cambiar entre tema oscuro y claro']` | visible | |
| lobby | Cancelar | `button[aria-label='Cancelar y volver al inicio']` | visible | No inicia partida |
| lobby | Bot | `button[aria-label='Jugar contra bot de prueba']` | oculto con 0.80 pts | No clicado |
| suscripción | Cerrar | `button[aria-label='Cerrar sin pagar la suscripción']` | no apareció | nando y marcos tienen `subscriptionMonth` 2026-10 |
| perfil | Ver perfil | `button[aria-label^='Ver perfil']` | visible con sesión | |
| perfil | Cerrar sesión | `button[aria-label='Cerrar sesión']` | visible con sesión | |
