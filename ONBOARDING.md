# BetPlay — Guía de onboarding

Guía para entender qué hace esta aplicación, cómo está construida y por dónde empezar.

| | |
|---|---|
| **Producto** | BetPlay |
| **Carpeta del repo** | `Salvation_frontend` (el `package.json` se llama `react-example`) |
| **Idioma de la UI** | Español (`lang="es"`) |
| **Madurez** | Prototipo / scaffold |
| **Origen** | Generado o maquetado desde [Google AI Studio](https://ai.studio/apps/72106870-1f1a-464c-9109-0059ddcf2d5a) |

La UI vende dinero real, matchmaking y servidor justo. El código simula el login, una cola de 3 segundos y un rival llamado `Player_2_Random`. Las partidas se juegan en el mismo teclado (P1 vs P2).

---

## 1. Qué es BetPlay

BetPlay es una plataforma de navegador para **enfrentamientos 1v1 en juegos clásicos con apuestas**. El jugador elige un juego, apuesta saldo de su billetera, espera un oponente y el ganador se lleva el pozo.

Copy de producto:

- `index.html`: *«Plataforma minimalista para jugar Pong, Snake, Tetris y más con apuestas reales 1v1.»*
- Hero: *«Demuestra tu habilidad. Gana dinero real.»*
- `metadata.json`: *«Plataforma de juegos 1v1 con apuestas en tiempo real»*

**Usuarios previstos:** jugadores casuales que quieren partidas rápidas sin instalar nada.

**No hay** roles, panel de admin, moderación ni autenticación real. El “registro” es solo un nombre de usuario.

### Visión vs. estado actual

| Planeado (comentarios / UI) | Estado actual |
|---|---|
| WebSockets / Socket.io para matchmaking | `setTimeout` de 3 segundos |
| Resultados con autoridad de servidor (anti-cheat) | El cliente suma o resta el saldo |
| Pagos Stripe / PayPal | $100 de saldo de prueba al “registrarse” |
| Reembolso si falla la plataforma | `alert` + lógica de reembolso incompleta |
| Rival remoto real | Placeholder `Player_2_Random`; hot-seat local |

---

## 2. Qué puede hacer el usuario

La app es una SPA con **tres vistas** controladas por estado React (`view: 'home' | 'lobby' | 'playing'`). No hay React Router.

### Navbar (siempre visible)

- Logo **BetPlay**: vuelve a home.
- Con sesión: saldo (`$XX.XX`), nombre de usuario, logout.
- Sin sesión: *«Inicia sesión para jugar»*.

### Home (`view === 'home'`)

Hero, formulario de registro (si no hay usuario) y catálogo de juegos.

Registro:

- Campo: *«Tu nombre de usuario»*
- Botón: *«Registrarse y Jugar»*
- Al registrarte recibes **$100 USD** de saldo de prueba.
- Se genera un `id` aleatorio en el cliente. No hay email, contraseña ni persistencia (recargar la página pierde la sesión).

Reglas mostradas en tres tarjetas:

1. **1 vs 1 Puro** — el ganador se lleva el pozo (menos comisión).
2. **Desconexión = Derrota** — si fallas o abandonas, pierdes automáticamente.
3. **Juego Justo** — si el servidor de BetPlay falla, se reembolsa a ambos.

### Lobby de apuestas (`view === 'lobby'`)

- Muestra el juego elegido.
- Input de apuesta en USD (mínimo 1, máximo = saldo). Default: **$10**.
- Si la apuesta supera el saldo: aviso rojo y botón deshabilitado.
- **Confirmar Apuesta y Buscar** → spinner *«Buscando oponente...»* (~3 s).
- **Cancelar** → vuelve a home.

### Partida (`view === 'playing'`)

- Cabecera: usuario local vs `Player_2_Random`.
- **Pozo total** = `betAmount * 2`.
- Badge decorativo: *«Ping: 24ms»*.
- Controles: *«P1: WASD / Espacio | P2: Flechas / Enter»*.
- Se renderiza uno de los cinco juegos en HTML5 Canvas.

Debajo hay un **simulador de prototipo** para probar el flujo de dinero sin terminar la partida:

- Ganar partida (`+apuesta`)
- Perder / abandonar (`-apuesta`)
- Simular caída de servidor (reembolso)

El botón de caída llama `handleGameEnd(false, 'platform_error')`: muestra un alert de reembolso, pero **igual resta la apuesta**. Hay un `FIXME` en `App.tsx`.

---

## 3. Recorridos

### Flujo feliz

```
Llegar a home
  → Leer hero y reglas
  → Escribir usuario → "Registrarse y Jugar"
  → Recibir $100
  → Clic en un juego → Lobby
  → Fijar apuesta (default $10) → "Confirmar Apuesta y Buscar"
  → Esperar ~3 s
  → Jugar en canvas (o usar el simulador)
  → Ganar: saldo += apuesta | Perder: saldo -= apuesta
  → Volver a home
```

### Otros caminos

| Camino | Qué ocurre |
|---|---|
| Click en un juego sin sesión | `alert('Por favor, inicia sesión primero.')` |
| Apuesta > saldo | Aviso rojo; el botón de búsqueda se deshabilita |
| Apuesta ≤ 0 | El botón de búsqueda se deshabilita |
| Caída de servidor (simulada) | Alert de reembolso; el saldo se resta igual (bug de prototipo) |

### Roles y permisos

No hay. Un solo tipo de usuario: nombre + `id` aleatorio + saldo. Sin JWT, cookies, API ni admin.

---

## 4. Juegos

Cinco duelos en `src/games/`. Todos son **hot-seat local** (dos jugadores, un teclado). P1 es coral (`#FF5A5F`), P2 es teal (`#00A699`). Al terminar llaman `onGameEnd('p1' | 'p2')` y `App.tsx` actualiza el saldo.

| ID | Nombre en UI | Descripción | Cómo se gana | Controles |
|---|---|---|---|---|
| `pong` | Paddle Duel | Reflejos rápidos. El primero en llegar a 10 puntos gana. | Primero en 10 puntos | P1 W/S — P2 flechas |
| `snake` | Worm Clash | Sobrevive más tiempo que tu oponente o haz que choque. | El rival choca (muro o cuerpo) | P1 WASD — P2 flechas |
| `tetris` | Block Battle | Limpia líneas para enviar basura a tu rival. | El rival se queda sin espacio | P1 A/D/W/S — P2 flechas |
| `combat` | Arena Clash | Lucha cuerpo a cuerpo. Reduce la vida del rival a cero. | HP del rival a 0 (melee) | P1 WASD + Espacio — P2 flechas + Enter |
| `shooter` | Laser Duel | Disparos en arena cerrada. Precisión y velocidad. | HP del rival a 0 (láseres) | P1 WASD + Espacio — P2 flechas + Enter |

---

## 5. Glosario

| Término | Significado en BetPlay |
|---|---|
| **Apuesta / bet** | USD que el jugador pone antes de buscar rival. Default `$10`, mínimo `$1`. |
| **Saldo / balance** | Billetera en memoria. Empieza en `$100`. Se pierde al recargar. |
| **Pozo** | Premio mostrado = apuesta × 2. Asume que el rival apostó lo mismo. |
| **Comisión** | Fee de plataforma citado en las reglas. **No hay fórmula en el código.** |
| **Matchmaking / cola** | Búsqueda de oponente. Hoy es un `setTimeout` de 3 s. |
| **P1 / P2** | P1 = usuario local (coral). P2 = rival (teal), en el mismo teclado. |
| **Desconexión** | Política de la UI: desconectar = derrota. No hay sesión online que cortar. |
| **Reembolso / refund** | Si falla la plataforma, se debería devolver el dinero a ambos. |
| **Autoridad del servidor** | El backend debería validar el resultado (anti-cheat). Hoy lo decide el cliente. |
| **Saldo de prueba** | Crédito de demo, no dinero real. |

---

## 6. Arquitectura

### Estructura

```
Salvation_frontend/
├── index.html              # Shell HTML, SEO en español, título BetPlay
├── metadata.json           # Metadata de AI Studio
├── package.json
├── vite.config.ts
├── tsconfig.json
├── .env.example            # GEMINI_API_KEY, APP_URL (no se usan en src/)
├── README.md               # Instrucciones del scaffold de AI Studio
├── ONBOARDING.md           # Este documento
└── src/
    ├── main.tsx            # Entrada React (StrictMode)
    ├── App.tsx             # Producto entero: auth, vistas, apuestas, saldo
    ├── index.css           # Tokens Tailwind v4 (paleta BetPlay)
    └── games/
        ├── Pong.tsx
        ├── Snake.tsx
        ├── Tetris.tsx
        ├── Combat.tsx
        └── Shooter.tsx
```

**No existen:** `components/`, `pages/`, `services/`, `api/`, `types/`, `hooks/`, `context/`, ni `server.js`.

### Routing y estado

- Sin React Router. Navegación = `useState` en `App.tsx`.
- Estado local: `currentUser`, `view`, `selectedGame`, `betAmount`, `isSearching`.
- Sin Redux, Zustand, Context ni persistencia.

### Backend, auth e IA

No hay llamadas HTTP en el código actual.

Dependencias instaladas pero **sin uso** en `src/`:

- `express` — el script `clean` menciona `server.js`, que no existe.
- `@google/genai` — `metadata.json` declara capacidad Gemini; cero imports.
- `motion` — instalado, no se usa.

Auth mock: el formulario crea `{ id, username, balance: 100 }`. TODO en el código: email, contraseña y pasarela real.

Variables de `.env.example`:

| Variable | Propósito del scaffold | ¿La usa el código? |
|---|---|---|
| `GEMINI_API_KEY` | API de Gemini / AI Studio | No |
| `APP_URL` | URL de hosting / OAuth | No |
| `DISABLE_HMR` | Modo agente de AI Studio (`vite.config.ts`) | Solo en build/dev |

### Stack

| Capa | Tecnología | Uso hoy |
|---|---|---|
| UI | React 19 + TypeScript | Toda la pantalla y el navbar |
| Iconos | lucide-react | Navbar, reglas, cartas de juego |
| Estilos | Tailwind CSS 4, fuente DM Sans | Paleta coral / teal |
| Juegos | HTML5 Canvas + `requestAnimationFrame` | Cinco componentes en `src/games` |
| Build | Vite 6 | `npm run dev` en puerto 3001, host `0.0.0.0` |
| Deploy | Netlify (`npm run build` → `dist/`) | Config en `.netlify/` |
| Backend planeado | Express | Sin servidor |
| IA planeada | `@google/genai` | Sin cablear |

Tokens en `src/index.css`:

- Primario (coral): `#FF5A5F`
- Acento (teal): `#00A699`
- Fondo: blanco / `#f5f5f5`
- Texto: `#484848` / `#737373`

### Entidades

Definidas inline en `App.tsx` (TODO: extraer a `src/types.ts`):

```ts
type UserProfile = {
  id: string;        // aleatorio en el cliente
  username: string;
  balance: number;   // USD; se modifica al ganar/perder
};

type Game = {
  id: string;        // 'pong' | 'snake' | 'tetris' | 'combat' | 'shooter'
  name: string;
  description: string;
  icon: React.ReactNode;
};
```

Conceptos implícitos (no tipados):

- **Match** — `{ gameId, betAmount, opponent }` vive solo como estado del componente.
- **Resultado** — `'p1' | 'p2'` vía callback `onGameEnd`.
- **Error de plataforma** — string `'platform_error'` para el flujo de reembolso.

---

## 7. Archivos clave

| Archivo | Rol |
|---|---|
| `src/App.tsx` | Producto entero: auth mock, 3 vistas, apuestas, matchmaking, saldo, copy |
| `src/games/Pong.tsx` | Pong a 10 puntos. Patrón de referencia de un juego |
| `src/games/Snake.tsx` | Dos serpientes, ~10 fps |
| `src/games/Tetris.tsx` | Bloques competitivos simplificados |
| `src/games/Combat.tsx` | Pelea con barras de HP |
| `src/games/Shooter.tsx` | Duelo con láseres |
| `src/index.css` | Tokens de color y fuente |
| `src/main.tsx` | Bootstrap React |
| `index.html` | Título, meta SEO, OG tags |
| `metadata.json` | Nombre BetPlay y capability Gemini de AI Studio |
| `vite.config.ts` | Plugins React + Tailwind, alias `@/`, `DISABLE_HMR` |
| `.env.example` | Plantilla de secretos del scaffold |
| `README.md` | Cómo correr el app (template AI Studio) |

---

## 8. Cómo levantarlo

Prerrequisito: Node.js.

```bash
cd "c:\Users\PEBETERO RRHH\Downloads\Proyecto Salvación\Salvation_frontend"
npm install
npm run dev
```

Vite queda en **http://localhost:3001** (`--host=0.0.0.0`). El puerto 3000 se deja libre para Sunset.

Otros scripts:

| Script | Qué hace |
|---|---|
| `npm run build` | Bundle de producción en `dist/` |
| `npm run preview` | Previsualiza el build |
| `npm run lint` | `tsc --noEmit` (solo types) |
| `npm run clean` | Borra `dist/` y `server.js` |

No hace falta `.env` para el prototipo. El README pide `GEMINI_API_KEY` en `.env.local`: es leftover del template; ignorarlo no rompe la app.

---

## 9. Mapa para el primer día

1. **`src/App.tsx`** — toda la historia de producto y el flujo de dinero.
2. **`src/games/Pong.tsx`** — patrón de un juego: canvas, teclado, `onGameEnd`.
3. **`src/index.css`** — tokens visuales que reutilizan los juegos.
4. **`index.html` + `metadata.json`** — nombre público y origen AI Studio.

### Dónde no buscar

No hay `src/components`, `pages`, `services`, `api`, `hooks` ni `context`. Tampoco hay autenticación real, persistencia ni tests.

---

## 10. Huecos marcados en el código

Pendiente, explícito en comentarios de `App.tsx`:

- [ ] Mover tipos a `src/types.ts`
- [ ] Matchmaking real con WebSockets (Socket.io / WebRTC)
- [ ] Email, contraseña y pasarela Stripe/PayPal
- [ ] Validar resultados en backend (anti-cheat / autoridad del servidor)
- [ ] Escuchar evento `refund` y restaurar el saldo de verdad

No forma parte del producto actual (scaffold):

- [ ] `GEMINI_API_KEY` / `@google/genai` — declarado, no cableado

---

## Resumen

BetPlay es un **prototipo en español** de una plataforma de apuestas por habilidad. La historia de producto está completa en la UI (landing, reglas, billetera, lobby, cinco juegos), pero **la infraestructura no**: no hay auth real, backend, WebSockets, pagos, anti-cheat ni Gemini.

El código es pequeño (~10 archivos de fuente). Casi toda la lógica vive en **`App.tsx`**. El siguiente trabajo de ingeniería está marcado en comentarios: extraer tipos, cola real, resultados en servidor, pagos y reembolsos.
