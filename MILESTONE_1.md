# Milestone 1 — Módulo de Autenticación (Auth) · Mock

**Épica:** Auth (ver `ONBOARDING.md` / backlog de Producto)
**Alcance:** Autenticación 100% mock, sin backend real y **sin instalar dependencias nuevas**.
Todo se construye con lo que ya trae el proyecto: React 19, `localStorage` y la Web Crypto API nativa del navegador.

**Objetivo del milestone:** que un usuario pueda registrarse, iniciar sesión, mantener la sesión al recargar la página, y cerrar sesión — todo persistido en el navegador, con el mismo contrato que tendría una API real (para poder reemplazar el mock después sin tocar la UI).

---

## Alcance NO cubierto en este milestone

- Gate de juego (bloquear el catálogo sin sesión) — se hace en el paso 6, fuera de este documento.
- Persistir el balance actualizado tras ganar/perder una partida.
- Backend real, JWT real, OAuth, recuperación de contraseña, roles.
- Cualquier dependencia nueva en `package.json`.

---

## To-do list — primeros 5 pasos

- [x] **Paso 1 — Contrato de tipos** (`src/types.ts`)
  Definir `UserProfile`, `RegisterInput`, `LoginInput`, `AuthSession`, `AuthResult`. Sacar `UserProfile` de `App.tsx`.

- [x] **Paso 2 — Almacén mock** (`src/auth/storage.ts`)
  Wrapper sobre `localStorage` con dos claves: `betplay.mock.users` y `betplay.mock.session`. Funciones puras de lectura/escritura, documentadas como mock.

- [x] **Paso 3 — Servicio de autenticación** (`src/auth/authService.ts`)
  `register`, `login`, `logout`, `getCurrentSession`, `updateUserBalance`. Password nunca en texto plano (hash con `crypto.subtle` / fallback nativo). `id` con `crypto.randomUUID()`. Mensajes de error de negocio sin `throw` genérico.

- [x] **Paso 4 — Contexto de React** (`src/auth/AuthContext.tsx`)
  `AuthProvider` + hook `useAuth()`. Hidrata la sesión al montar (`getCurrentSession`). Se envuelve `<App />` en `src/main.tsx`.

- [x] **Paso 5 — UI de registro / login** (`src/auth/AuthPanel.tsx` + cambios en `App.tsx`)
  Sustituir el formulario de un solo campo ("Únete ahora") por un panel con pestañas **Iniciar sesión / Registrarse** (username, email, password, confirmar password). Errores de negocio se muestran en la UI, no con `alert()`. Navbar y logout pasan a usar `useAuth()`.

---

## Cómo probar este milestone

1. `npm run dev` → abrir `http://localhost:3001`.
2. **Registro:** completar username, email, password (≥ 8) y confirmación → debe crear la cuenta, dar `$100.00` de saldo y dejarte logueado.
3. **Duplicado:** registrar el mismo email otra vez → error en el panel, no `alert()`.
4. **Refresh:** recargar la página → sigues logueado, mismo saldo.
5. **Logout:** cerrar sesión → vuelve el panel de auth; el usuario sigue existiendo (no se borra).
6. **Login correcto:** iniciar sesión con la cuenta creada → mismo saldo de antes.
7. **Login incorrecto:** password equivocada → un solo mensaje genérico ("Email o contraseña incorrectos").
8. **DevTools → Application → Local Storage:** revisar `betplay.mock.users` — la contraseña no debe verse en texto plano.

### Resultado de la verificación (5 sep 2026, `http://localhost:3001`)

Verificado end-to-end con navegador automatizado:

| Prueba | Resultado |
|---|---|
| `npm run lint` (`tsc --noEmit`) | ✅ Sin errores |
| Registro (username + email + password + confirm) | ✅ Navbar muestra `$100.00` y el username |
| Refresh de página | ✅ Sesión y saldo se mantienen |
| Logout | ✅ Vuelve el panel de auth; la cuenta sigue existiendo |
| Login con password incorrecta | ✅ Mensaje único "Email o contraseña incorrectos." en la UI, sin `alert()` |
| Login correcto | ✅ Recupera el mismo saldo (`$100.00`) |
| Registro con email duplicado | ✅ "Ya existe una cuenta registrada con ese email." en la UI |
| `localStorage` → `betplay.mock.users` | ✅ Solo `passwordHash` (SHA-256), nunca la contraseña en texto plano |

Hallazgo durante la implementación: el `tsconfig.json` del proyecto no tiene `strictNullChecks`, lo que impide que TypeScript narrowee un discriminated union booleano vía truthiness (`if (result.ok)`). Se resolvió usando comparación explícita (`if (result.ok === true)`) en `AuthContext.tsx`, sin tocar la configuración global del proyecto. Detalle en `src/auth/README.md`.

## Reset manual del mock

En la consola del navegador:

```js
localStorage.removeItem('betplay.mock.users');
localStorage.removeItem('betplay.mock.session');
```

---

## Siguiente milestone (fuera de alcance aquí)

- Paso 6: Gate de juego — bloquear clic en el catálogo sin sesión (AUTH-04).
- Persistir balance real tras `handleGameEnd`.
- Épica de Búsqueda (matchmaking).
