# Objetivo

Levantar la base del backend (Express + TypeScript, en MVC) y sustituir el mock de autenticación del frontend por una API: registrar usuarios, iniciar sesión, recuperar la sesión actual y cerrarla.

Todo se guarda en **mocks en memoria**, sin MongoDB ni otras conexiones externas.

Fuentes: `docs/frontend/MILESTONE_1.md` (flujo de Auth y reglas de negocio) y `docs/frontend/MILESTONE_5.md` (el frontend espera la API bajo `/auth/...`).

# Funcionalidades

- [x] Servidor Express en TypeScript escuchando en el puerto `4444`, sin conexión a MongoDB.
- [x] Registro de usuario con `username`, `email` y `password`. La cuenta nace con `100` de saldo.
- [x] Rechazo de un email ya registrado.
- [x] Contraseña guardada solo como hash, nunca en texto plano.
- [x] Inicio de sesión con un único mensaje genérico ante credenciales incorrectas.
- [x] Consulta de la sesión actual, para que el usuario siga logueado al recargar la página.
- [x] Cierre de sesión sin borrar el usuario.

# Tareas

- [x] **Tarea 1 — Base del proyecto sin MongoDB**
  - **Objetivo:** tener un servidor que arranque, lea su configuración y no dependa de una base de datos.
  - **Descripción:** separar `app.ts` (crea la app Express, registra `express.json()` y las rutas) de `server.ts` (carga el entorno y llama a `listen`). Leer las variables con el flag nativo `node --env-file=.env`, sin `dotenv`. Exponer el puerto desde un único módulo. Añadir los scripts `build` (`tsc`) y `start` (`node --env-file-if-exists=.env dist/server.js`).
  - **Archivos afectados:** `src/app.ts`, `src/server.ts`, `src/config/env.ts`, `.env.example`, `package.json`, `tsconfig.json`.
  - **Criterios de aceptación:**
    - `npm run build` compila sin errores.
    - `npm run dev` arranca sin MongoDB y sin `MONGODB_URI`.
    - Escucha en el puerto de `PORT` (por defecto `4444`).
    - `.env.example` documenta `PORT`. `.env` no se sube al repositorio.
  - **Dependencias necesarias:** `typescript` y `@types/node` en desarrollo. No se instala `mongoose`.

- [x] **Tarea 2 — Modelo mock de usuario**
  - **Objetivo:** definir cómo se guarda un usuario en memoria.
  - **Descripción:** crear el modelo `User` con `username`, `email` (único, en minúsculas), `passwordHash`, `balance` (por defecto `100`) y `createdAt`. Declararlo mock en un comentario de cabecera. Añadir una función que convierta el documento en el perfil público, sin `passwordHash`.
  - **Archivos afectados:** `src/models/user.model.ts`.
  - **Criterios de aceptación:**
    - El perfil público nunca incluye `passwordHash`.
    - El email duplicado se rechaza en el servicio, no con un índice de MongoDB.
  - **Dependencias necesarias:** ninguna.

- [x] **Tarea 3 — Registro de usuario (`POST /users`)**
  - **Objetivo:** crear cuentas desde la API.
  - **Descripción:** el servicio valida la entrada, comprueba si el email ya existe, genera el hash de la contraseña con `crypto.scrypt` nativo (con salt aleatorio) y guarda el usuario. El controlador traduce el resultado a una respuesta HTTP. La ruta solo conecta la URL con el controlador.
  - **Archivos afectados:** `src/services/user.service.ts`, `src/controllers/user.controller.ts`, `src/routes/user.routes.ts`, `src/app.ts`.
  - **Criterios de aceptación:**
    - Si los datos son válidos, responde `201` con `{ token, user }` y un `balance` de `100`.
    - Si la contraseña tiene menos de 8 caracteres o falta algún campo, responde `400` con un mensaje de negocio.
    - Si el email está duplicado, responde `409` con "Ya existe una cuenta registrada con ese email."
    - En memoria solo se guarda `passwordHash`, nunca la contraseña.
  - **Dependencias necesarias:** ninguna (`node:crypto`).

- [x] **Tarea 4 — Inicio de sesión (`POST /auth/sessions`)**
  - **Objetivo:** autenticar un usuario existente y abrirle una sesión.
  - **Descripción:** el servicio busca el usuario por email y compara el hash con `crypto.timingSafeEqual`. Si coincide, crea una sesión: un token aleatorio de `crypto.randomBytes`, guardado en el modelo mock `Session` junto con el `userId`. Responde con el token y el perfil público.
  - **Archivos afectados:** `src/models/session.model.ts`, `src/services/auth.service.ts`, `src/controllers/auth.controller.ts`, `src/routes/auth.routes.ts`.
  - **Criterios de aceptación:**
    - Con credenciales correctas, responde `201` con `{ token, user }`, y el saldo es el que tenía el usuario.
    - Con email inexistente o contraseña incorrecta, responde `401` con el mismo mensaje en ambos casos: "Email o contraseña incorrectos."
    - El registro de la Tarea 3 también devuelve una sesión, porque el frontend deja al usuario logueado tras registrarse.
  - **Dependencias necesarias:** ninguna.

- [x] **Tarea 5 — Sesión actual y cierre de sesión (`GET` y `DELETE /auth/sessions/current`)**
  - **Objetivo:** mantener la sesión al recargar y permitir cerrarla.
  - **Descripción:** crear un middleware `requireSession` que lee `Authorization: Bearer <token>`, busca la sesión y adjunta el usuario a la petición. `GET` devuelve el perfil del usuario de la sesión. `DELETE` elimina la sesión, pero no el usuario.
  - **Archivos afectados:** `src/middlewares/requireSession.ts`, `src/services/auth.service.ts`, `src/controllers/auth.controller.ts`, `src/routes/auth.routes.ts`.
  - **Criterios de aceptación:**
    - Con un token válido, `GET` responde `200` con el perfil y el saldo actual.
    - Sin token, o con un token inválido o ya cerrado, responde `401`.
    - `DELETE` responde `204`. Después, ese token da `401`, y el usuario puede volver a iniciar sesión con sus datos.
  - **Dependencias necesarias:** ninguna.

# Fuera del alcance

- Conexión a MongoDB o a cualquier otra base de datos.
- Actualizar el saldo (`updateUserBalance`): corresponde a la economía de apuestas (frontend Milestone 3).
- Matchmaking, colas, WebSockets y registros de partidas (frontend Milestone 2).
- Resolución de partidas, comisión de plataforma, reserva de saldo y reembolsos (frontend Milestone 3).
- Perfil con estadísticas e historial de partidas (frontend Milestone 4).
- JWT, OAuth, recuperación de contraseña y roles.
- Configurar CORS, rate limiting, logging avanzado, tests automatizados y Docker: la documentación no los pide para este milestone.
- Dependencias como `dotenv`, `bcrypt`, `jsonwebtoken`, `cors`, `nodemon` o `mongoose`.

## Notas de incertidumbre

- **Mecanismo de sesión:** la documentación no dice cómo se transporta la sesión. Se usa un token opaco guardado en el mock de sesiones y enviado como `Bearer`. Hay que confirmarlo con el frontend.
- **Nombres de las rutas:** el frontend solo indica el prefijo `/auth/...`. El registro quedó en `POST /users` (Milestone 3 del backend). `/auth` se usa para las sesiones.
- **Forma de la respuesta:** `ApiAuthResponse` (frontend Milestone 5) todavía no tiene campos definidos. Se usa `{ token, user }` con `user = { id, username, email, balance }`.
- **Confirmación de contraseña:** el frontend la pide en el formulario, pero no está claro si la envía a la API. Se asume que se valida solo en el frontend.
- **Username único:** la documentación solo prohíbe emails duplicados, así que el username no se marca como único.
- **Formato del saldo:** el frontend muestra `$100.00`, pero no se define si el backend debe guardar decimales o céntimos. Se guarda `100` como número.
- **Puerto:** el backend usa `4444` por decisión del equipo, pero el frontend espera `4000` (`VITE_API_URL`). Hay que alinear uno de los dos.
- **`mongoose`:** queda instalado y `src/config/database.ts` existe, pero nadie los importa. Se conservan para un futuro paso a MongoDB; no se usan en este milestone.
