# playwright-flow-salvation-qa

## 1. Resumen ejecutivo

- **Estado:** Pass (tras fixes)
- **Entorno:** local staging — Vite `http://localhost:4000/`, API vía proxy a `localhost:4444`
- **FLOW_NAME:** Salvation frontend QA (landing, auth, ranking, lobby, perfil)
- **Restricciones cumplidas:** sin `*.spec.ts`, sin `npm run dev`/`build`, sin partidas reales, sin pagar suscripción

## 2. Escenario probado

- Rutas/vistas: `/`, secciones Inicio/Juegos/Ranking/Info, lobby Paddle Duel, perfil
- Usuarios: `nando@gmail.com` (Fernando, 0.80 pts) y `marcos@gmail.com` (Marcos, 99 pts)
- Viewports: iPhone 13 portrait 390×664, landscape 664×390, desktop 1280×800

## 3. Cobertura

- Rutas inventariadas: 2 SPA (`/`, `/restablecer`) + 4 secciones + lobby/perfil
- Cubiertas en vivo: `/`, secciones, lobby (sin start), perfil
- Elementos críticos validados: login (labels + submit), nav, ranking, 5 CTAs Jugar (uno abre lobby), cancelar, perfil, logout
- No cubierto en vivo: pad táctil (solo en partida) y pago de suscripción (dialog no apareció)

## 4. Hallazgos

| ID | Sev | Tipo | Descripción | Repro | Logs | Impacto | Estado |
|---|---|---|---|---|---|---|---|
| H1 | S2 | UI/UX | Navbar overflowX en 390px (scrollWidth 485) | iPhone 13 portrait, Crear/Entrar | — | Barra horizontal | **Fixed** wrap + clip |
| H2 | S2 | UI/UX | Panel auth recortado (`right-4` + ancho fijo) | Portrait con login abierto | — | Formulario fuera de viewport | **Fixed** `left-3 right-3` |
| H3 | S2 | A11y | Inputs de login sin `aria-label` | fill por label fallaba | — | QA y lectores de pantalla | **Fixed** |
| H4 | S2 | Auth | Nav y submit decían «Iniciar sesión»; el click cerraba el panel y no hacía POST | Landscape ≥640px | wait `/auth/sessions` timeout | Login UI fallaba | **Fixed** `Enviar inicio de sesión` |
| H5 | S3 | Network | Copy genérico en 5xx | proxy ECONNRESET | console 500 | Mensaje poco claro | **Fixed** |
| H6 | S2 | UI/UX | Hero pedía crear cuenta con sesión abierta | Tras login | — | Copy mentiroso | **Fixed** saludo con username |
| H7 | S3 | UI/UX | Pad táctil en fila wrap, no cruz | código `TouchControls` | — | Dificulta WASD en móvil | **Fixed** grid 3×3 |
| H8 | S3 | Network | `/robots.txt` y `/sitemap.xml` sirven HTML SPA | GET directo | 200 HTML | SEO, no bloquea juego | Abierto (Vite) |

## 5. Recomendaciones

- **Inmediatas:** ya aplicadas (navbar, panel, labels, submit, copy, pad, mensaje 5xx).
- **Medio plazo:** no iniciar espera de red hasta que el form haga submit; documentar que el botón de nav no autentica.
- **Largo plazo:** smoke Playwright MCP por release; robots/sitemap reales si hay SEO.

## Contraste API (docs/backend/API.md)

| Endpoint | Esperado | Observado |
|---|---|---|
| POST /auth/sessions | 201 `{ token, user }` | 201 Fernando y Marcos |
| GET /users | 200 array perfiles, Bearer | 200, 17 usuarios |
| GET /auth/sessions/current | 200 | 200 |
| GET /users/:id/history | 200 | 200 Fernando |

## Evidencias

Screenshots MCP en Downloads: `landing-portrait-fixed-*`, `login-form-ready-*`, `login-ok-nando-*`, `ranking-scrolled-*`, `info-section-*`, `juegos-section-*`, `lobby-paddle-no-match-*`, `perfil-fernando-*`, `iphone-landscape-logged-in-*`, `desktop-logged-in-*`, `login-ok-marcos-greeting-*`.
