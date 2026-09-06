# Auth (mock) — `src/auth/`

Este módulo implementa la Épica 1 (Auth) de `MILESTONE_1.md` como un **mock de frontend puro**. No hay backend, no hay red real, y no se instaló ninguna dependencia nueva: todo se construye con React 19 y APIs nativas del navegador (`localStorage`, `crypto.subtle`, `crypto.randomUUID`).

## Qué NO es

- No es autenticación de producción.
- No hay expiración de token, ni refresh tokens, ni invalidación server-side.
- No hay rate limiting ni protección contra fuerza bruta.
- Los datos son visibles en las DevTools del navegador (Application → Local Storage).
- Solo funciona en la máquina/navegador donde te registraste (no hay sincronización entre dispositivos).

Es un **contrato de API simulado**: la forma de las funciones (`register`, `login`, `logout`, `getCurrentSession`) es la misma que tendría un cliente hablando con un backend real, para poder reemplazar la implementación sin tocar la UI.

## Archivos

| Archivo | Responsabilidad |
|---|---|
| `storage.ts` | Wrapper de bajo nivel sobre `localStorage`. Lee/escribe usuarios y sesión. No valida nada de negocio. |
| `authService.ts` | "Backend" falso: valida inputs, hashea contraseñas, genera ids/tokens, decide éxito/error. Es la única pieza que sabe que existe `localStorage`. |
| `AuthContext.tsx` | Contexto de React (`AuthProvider` + `useAuth()`). Hidrata la sesión al montar, expone `user`, `register`, `login`, `logout`, `setBalance`. |
| `AuthPanel.tsx` | UI con pestañas Registrarse / Iniciar sesión. Consume `useAuth()`. Reemplaza al formulario original de un solo campo en `App.tsx`. |

## Claves de `localStorage`

| Clave | Forma | Contenido |
|---|---|---|
| `betplay.mock.users` | `StoredUser[]` | `{ id, username, email, passwordHash, balance }` — todas las cuentas creadas. |
| `betplay.mock.session` | `StoredSession \| null` | `{ token, userId }` — sesión activa, si hay alguna. |

`passwordHash` es un `SHA-256` (hex) calculado con `crypto.subtle.digest`. La contraseña en texto plano nunca se guarda ni viaja fuera del formulario.

## Flujo de cada operación

- **`register(input)`**
  1. Valida username (≥ 3), email (`contiene @ y .`), password (≥ 8), `password === confirmPassword`.
  2. Rechaza si el username o el email ya existen (case-insensitive).
  3. Crea el usuario con `id = crypto.randomUUID()` y `balance = 100` (una sola vez).
  4. Genera una sesión (`token = mock_<uuid>`) y la persiste.

- **`login(input)`**
  1. Busca por email normalizado.
  2. Compara el hash de la contraseña ingresada contra el guardado.
  3. Si falla cualquiera de los dos pasos, devuelve **el mismo mensaje genérico** (`"Email o contraseña incorrectos."`) — no revela cuál de los dos fue.
  4. Si es correcto, persiste una nueva sesión con el saldo actual del usuario (no reinicia a $100).

- **`logout()`** — borra solo `betplay.mock.session`. Las cuentas (`betplay.mock.users`) no se tocan.

- **`getCurrentSession()`** — se llama una vez al montar la app (`AuthProvider`). Si hay una sesión guardada pero el usuario ya no existe, limpia la sesión huérfana y devuelve `null` en vez de fallar.

- **`updateUserBalance(userId, balance)`** — usada por `App.tsx` tras `handleGameEnd` para persistir el saldo ganado/perdido. Sin esto, el saldo se "olvidaría" al recargar.

Todas las funciones son `async` y usan un retraso artificial (~350 ms) solo para simular latencia de red; es cosmético y no afecta la lógica.

## Manejo de errores

Ninguna función lanza excepciones por errores de negocio. `register` y `login` devuelven:

```ts
type AuthResult =
  | { ok: true; session: AuthSession }
  | { ok: false; message: string };
```

`AuthPanel.tsx` muestra `message` directamente en la UI. No hay `alert()` en ningún punto del flujo de Auth.

> Nota de implementación: en `AuthContext.tsx` la comprobación se escribe como `if (result.ok === true)` en vez de `if (result.ok)`. El `tsconfig.json` de este proyecto no tiene `strictNullChecks` activado, y sin él TypeScript no aplica narrowing de discriminated unions por truthiness sobre un booleano. La comparación explícita evita el error de tipos sin tener que tocar la configuración global del proyecto (fuera de alcance de este milestone).

## Cómo probar manualmente

Ver la sección "Cómo probar este milestone" en `MILESTONE_1.md` (raíz del repo).

## Cómo resetear el mock

En la consola del navegador (DevTools):

```js
localStorage.removeItem('betplay.mock.users');
localStorage.removeItem('betplay.mock.session');
```

## Equivalentes de API futuros (cuando exista backend real)

| Función mock | Endpoint futuro sugerido |
|---|---|
| `register` | `POST /auth/register` |
| `login` | `POST /auth/login` |
| `logout` | `POST /auth/logout` |
| `getCurrentSession` | `GET /auth/session` (o validar JWT guardado en cookie/localStorage) |
| `updateUserBalance` | `PATCH /users/:id/balance` (probablemente vía el módulo de partidas, no expuesto directo) |

El día que esto exista, solo `authService.ts` cambia. `AuthContext.tsx`, `AuthPanel.tsx` y `App.tsx` no deberían necesitar tocarse.

## Fuera de alcance de este módulo (Milestone 1)

- ~~Gate de juego (AUTH-04)~~ — implementado en `MILESTONE_2.md` (`App.tsx`: `requestJoinGame` + panel de login con aviso contextual, ya no usa `alert()`).
- Recuperación de contraseña, verificación de email, OAuth, 2FA.
- Roles / admin.
- Rate limiting o protección contra registro masivo.
