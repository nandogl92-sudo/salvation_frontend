# Objetivo

Completar el recurso **Users** con un CRUD REST en MVC: crear (registro), listar, consultar, actualizar y borrar usuarios. Todo con **datos mock en memoria**, sin MongoDB ni otras conexiones externas.

Fuentes: `docs/frontend/MILESTONE_1.md` (registro con `username`, `email` y `password` de al menos 8 caracteres, saldo inicial de `$100.00`, email único y sin roles) y `docs/frontend/MILESTONE_4.md` (perfil del jugador). Decisiones acordadas con el equipo: el alta pasa a `POST /users`, y cada usuario solo puede modificar o borrar su propia cuenta.

# Funcionalidades

- [x] Crear un usuario con `POST /users`, que devuelve una sesión como el registro anterior.
- [x] Listar los perfiles públicos con `GET /users`.
- [x] Consultar un perfil público con `GET /users/:id`.
- [x] Actualizar `username`, `email` o `password` de la propia cuenta con `PATCH /users/:id`.
- [x] Borrar la propia cuenta con `DELETE /users/:id`, cerrando sus sesiones y cancelando sus búsquedas en espera.
- [x] Tres usuarios de ejemplo cargados al arrancar, para probar sin registrar a nadie.

# Tareas

- [x] **Tarea 1 — Modelo mock de usuarios y usuarios de ejemplo**
  - **Objetivo:** que el modelo mock permita todas las operaciones del CRUD.
  - **Descripción:** añadir `findAllUsers`, `updateUser` y `deleteUser` a `user.model.ts`. Crear `user.mock.ts`, declarado como mock, con los 3 usuarios de ejemplo y su contraseña común. Añadir `deleteSessionsByUserId` a `session.model.ts`.
  - **Archivos afectados:** `src/models/user.model.ts`, `src/models/user.mock.ts`, `src/models/session.model.ts`.
  - **Criterios de aceptación:**
    - Las funciones del modelo solo guardan, leen, actualizan y borran. No validan ni aplican reglas de negocio.
    - `updateUser` solo acepta `username`, `email` y `passwordHash`; nunca el `balance`.
  - **Dependencias necesarias:** ninguna.

- [x] **Tarea 2 — Utilidades compartidas de contraseña y lectura del body**
  - **Objetivo:** que el alta, la edición de contraseña y los usuarios de ejemplo usen el mismo hash, sin duplicar código.
  - **Descripción:** mover `hashPassword` y `verifyPassword` de `auth.service.ts` a `password.service.ts`. Mover `readText` a `src/utils/readText.ts`, que ya usan dos servicios.
  - **Archivos afectados:** `src/services/password.service.ts`, `src/utils/readText.ts`, `src/services/auth.service.ts`.
  - **Criterios de aceptación:**
    - `POST /auth/sessions` sigue funcionando igual.
    - No queda código de hash duplicado.
  - **Dependencias necesarias:** ninguna (`node:crypto`).

- [x] **Tarea 3 — Servicio de usuarios**
  - **Objetivo:** concentrar las reglas del CRUD en un solo sitio.
  - **Descripción:** crear `user.service.ts` con `createUser`, `listUsers`, `getUser`, `updateUser`, `deleteUser` y `seedMockUsers`. El registro sale de `auth.service.ts`, que se queda solo con las sesiones. Borrar una cuenta también borra sus sesiones y cancela sus tickets en espera (`cancelWaitingTicketsOfUser` en `matchmaking.service.ts`).
  - **Archivos afectados:** `src/services/user.service.ts`, `src/services/auth.service.ts`, `src/services/matchmaking.service.ts`, `src/server.ts`.
  - **Criterios de aceptación:**
    - El alta mantiene las reglas del Milestone 1: campos obligatorios, contraseña de al menos 8 caracteres, email único y saldo inicial de `100`.
    - Actualizar exige al menos un campo válido. Un email usado por otra cuenta da error de duplicado.
    - Un usuario que intenta actualizar o borrar otra cuenta recibe un error de permiso.
  - **Dependencias necesarias:** ninguna.

- [x] **Tarea 4 — Controlador y rutas REST de `/users`**
  - **Objetivo:** exponer el CRUD al frontend.
  - **Descripción:** crear `user.controller.ts` y `user.routes.ts`. `POST /users` es público; el resto va protegido con `requireSession`. Retirar `POST /auth/users` de las rutas de `/auth`.
  - **Archivos afectados:** `src/controllers/user.controller.ts`, `src/routes/user.routes.ts`, `src/controllers/auth.controller.ts`, `src/routes/auth.routes.ts`, `src/app.ts`.
  - **Criterios de aceptación:**
    - `POST /users`: `201` con `{ token, user }`, `400` si faltan datos o la contraseña es corta, `409` si el email ya existe.
    - `GET /users` y `GET /users/:id`: `200`, o `404` si el usuario no existe. Nunca devuelven `passwordHash`.
    - `PATCH /users/:id`: `200` con el perfil actualizado, `400`, `403` si no es tu cuenta, `404` o `409`.
    - `DELETE /users/:id`: `204`, `403` si no es tu cuenta, o `404`.
    - Sin sesión, las rutas protegidas dan `401`.
  - **Dependencias necesarias:** ninguna.

- [x] **Tarea 5 — Documentación y verificación**
  - **Objetivo:** que la documentación coincida con el código y el CRUD esté probado.
  - **Descripción:** actualizar `docs/backend/MILESTONE_1.md`, donde el alta pasa a `POST /users`. Documentar en `README.md` cómo arrancar, los endpoints y los usuarios de ejemplo. Probar el CRUD con peticiones reales.
  - **Archivos afectados:** `docs/backend/MILESTONE_1.md`, `README.md`.
  - **Criterios de aceptación:**
    - `npx tsc --noEmit` y `npm run build` terminan sin errores.
    - Tras un `PATCH` de contraseña, se puede iniciar sesión con la nueva y no con la antigua.
    - Tras un `DELETE`, el token de ese usuario da `401`, deja de aparecer en `GET /users` y su email se puede volver a registrar.
  - **Dependencias necesarias:** ninguna.

# Fuera del alcance

- Conexión a MongoDB o a cualquier otra base de datos.
- Modificar el `balance`: corresponde a la economía de apuestas (frontend Milestone 3).
- Roles y administradores: `docs/frontend/MILESTONE_1.md` los deja fuera explícitamente.
- Estadísticas e historial de partidas en el perfil (frontend Milestone 4).
- Recuperación de contraseña y verificación de email.
- Paginación, filtros u ordenación del listado.
- Nuevas dependencias en `package.json`.

## Notas de incertidumbre

- **Editar y borrar usuarios no está en la documentación del frontend.** El frontend solo contempla el registro y el perfil; este milestone los añade por petición directa del equipo. Si el frontend nunca los usa, conviene reconsiderarlos.
- **Numeración:** este es el Milestone 3 del backend; no corresponde al Milestone 3 del frontend (economía de apuestas).
- **Listado público:** `GET /users` muestra el email y el saldo de todos los usuarios a cualquiera con sesión, porque el perfil público actual los incluye. No está claro si el frontend lo necesita así; puede ser un problema de privacidad.
- **Cambio de contraseña:** no se define si debe cerrar las demás sesiones del usuario. Se mantienen abiertas.
- **Usuarios de ejemplo:** se regeneran en cada arranque porque el almacén es en memoria.
