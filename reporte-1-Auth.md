# Reporte 1 — Módulo Auth

Conexión del registro, login, sesión actual y logout del frontend con el backend en `http://localhost:4444`.

## Checklist

- [x] Revisar `AuthPanel`, `AuthContext` y los tipos `RegisterInput`, `LoginInput`, `AuthResult`. La UI sigue mostrando `message` sin `alert()`.
- [x] Confirmar que el único punto de integración es `src/api/authApi.ts`. `AuthContext` ya importaba ese archivo.
- [x] Sustituir el reexport del mock por `fetch` a las rutas de `docs/backend/FRONTEND_INTEGRATION.md`.
- [x] Dejar `updateUserBalance` fuera de la API. `PATCH /users/:id` ignora el saldo.
- [x] Apuntar `VITE_API_URL` a `http://localhost:4444` en `.env.example` y en `.env` local.
- [x] Comprobar el contrato con el API en marcha (curl).
- [ ] Probar el flujo en el navegador. Falta reiniciar Vite para que lea `.env`, y el preflight CORS no envía `Access-Control-Allow-Origin`.

## Qué se cableó

| Función | Ruta | Resultado esperado |
|---|---|---|
| `register` | `POST /users` | 201 `{ token, user }` |
| `login` | `POST /auth/sessions` | 201 `{ token, user }` |
| `getCurrentSession` | `GET /auth/sessions/current` | 200 `{ user }` |
| `logout` | `DELETE /auth/sessions/current` | 204 |

El token se guarda en `localStorage` bajo `betplay.api.session`. Al recargar, `getCurrentSession` lo revalida. Un 401 borra esa sesión. `confirmPassword` se compara en el cliente porque el backend no recibe ese campo.

## Qué quedó fuera

- Cola, resultado de partida e historial siguen en mock.
- `updateUserBalance` solo actualiza el perfil guardado en el navegador. El saldo oficial lo cambiará el backend cuando se conecten las partidas.
- `src/auth/authService.ts` no se borra: ya no lo usa la UI.

## Verificación del contrato

Contra `http://localhost:4444`:

- Login de `ana@salvation.dev` / `password123`: 201, perfil `{ id, username, email, balance }` sin `passwordHash`.
- `GET /auth/sessions/current` con ese token: 200.
- Contraseña incorrecta: 401 `Email o contraseña incorrectos.`
- Email duplicado en `POST /users`: 409 `Ya existe una cuenta registrada con ese email.`
- `DELETE /auth/sessions/current`: 204. El mismo token después responde 401.

El preflight `OPTIONS` desde `Origin: http://localhost:3001` responde 200 y no incluye `Access-Control-Allow-Origin`. El navegador bloqueará las llamadas hasta que el backend añada CORS.

## Para probar en la UI

1. Reiniciar el servidor de Vite para que cargue `VITE_API_URL`.
2. Cuando el backend envíe CORS, registrar una cuenta nueva, entrar con Ana, recargar y cerrar sesión.
