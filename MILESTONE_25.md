# MILESTONE_25 - Rol de administrador y rol de usuario

# Objetivo

Al iniciar sesión, la pantalla distingue si la cuenta es de administrador o de usuario. El administrador abre un panel para ver a las personas y marcar quién ha pagado. Quien queda marcado entra a los juegos. En la barra aparece la inicial de quien ha entrado y una luz verde o roja.

Este documento es solo de frontend. No añade rutas, base de datos ni cobro real.

# Funcionalidades

- La cuenta guarda un rol: `admin` o `user`.
- El registro crea siempre rol `user`. El formulario no deja elegir administrador.
- Tras iniciar sesión, la barra muestra la inicial del nombre y una luz: verde si esa cuenta puede entrar a los juegos, roja si no.
- Solo el rol `admin` ve el panel.
- El panel lista a los usuarios con los datos que la cuenta ya tiene: nombre, email, fichas, puntos del mes y si puede entrar a los juegos.
- En esa lista, el administrador marca que una persona ha pagado. A partir de entonces esa persona puede abrir los juegos y su luz pasa a verde.
- El rol `user` no ve el panel. Si su luz está roja, un clic en un juego no abre la partida.

# Tareas

## 1. Guardar el rol en la cuenta

- Objetivo: que la sesión sepa si quien entra es administrador o usuario.
- Descripción: añadir el rol al perfil y a la sesión que ya se guardan en el navegador. Una cuenta nueva sale con rol `user`. El rol no se pide en el registro ni en el inicio de sesión. Hace falta una cuenta ya guardada con rol `admin` para poder abrir el panel en las pruebas. Qué cuenta es esa no está dicho; no se inventa un email ni una contraseña en este documento.
- Archivos afectados: `src/types.ts`, `src/auth/storage.ts`, `src/auth/authService.ts`, `src/auth/AuthContext.tsx`.
- Criterios de aceptación:
  - [ ] Una cuenta nueva queda con rol `user`.
  - [ ] El rol sigue igual al recargar la página.
  - [ ] El inicio de sesión no muestra un selector de rol.
- Dependencias necesarias: ninguna. Se usa el `localStorage` y React que ya tiene el proyecto.

## 2. Mostrar la inicial y la luz al entrar

- Objetivo: que, nada más iniciar sesión, se vea de quién es la cuenta y si puede jugar.
- Descripción: en la barra, junto a la sesión, mostrar la primera letra del nombre en mayúscula y una luz. Verde si el administrador ha marcado el pago de esa cuenta. Roja si no. El nombre y las fichas que ya se muestran pueden seguir ahí. La luz sale de esa marca, no de estar conectado en este momento.
- Archivos afectados: `src/auth/AuthContext.tsx`, `App.tsx`.
- Criterios de aceptación:
  - [ ] Tras entrar se ve la inicial del nombre.
  - [ ] La luz es roja si esa cuenta no está marcada como pagada.
  - [ ] La luz es verde si esa cuenta está marcada como pagada.
  - [ ] Al salir y volver a entrar, la misma luz sigue ahí.
- Dependencias necesarias: ninguna.

## 3. Abrir el panel solo si el rol es admin

- Objetivo: que el administrador vea a todas las cuentas y el usuario no.
- Descripción: una entrada al panel, visible solo con rol `admin`. Dentro, una lista de las cuentas del almacén mock. Cada fila muestra nombre, email, fichas, puntos del mes y si puede entrar a los juegos. No se añaden gráficas ni cifras que la cuenta no tenga ya.
- Archivos afectados: `App.tsx`, `src/admin/AdminPanel.tsx` (archivo nuevo).
- Criterios de aceptación:
  - [ ] Con rol `admin`, se puede abrir el panel y ver la lista.
  - [ ] Con rol `user`, esa entrada no aparece.
  - [ ] Cada fila enseña nombre, email, fichas, puntos del mes y si tiene acceso a los juegos.
- Dependencias necesarias: ninguna.

## 4. Marcar el pago y dar acceso a los juegos

- Objetivo: que el administrador pueda dejar pagada a una persona y que esa persona entre a los juegos.
- Descripción: en cada fila del panel, una acción para marcar que esa persona ha pagado, y otra para quitar la marca. Al marcar, esa cuenta puede abrir los juegos y su luz pasa a verde. Al quitar la marca, la luz vuelve a roja y el clic en un juego no abre la partida. No se cobra dinero ni se suman los 10 puntos de la ventana de suscripción: esta marca solo abre o cierra el paso a los juegos.
- Archivos afectados: `src/admin/AdminPanel.tsx`, `src/auth/authService.ts`, `src/auth/storage.ts`, `App.tsx`.
- Criterios de aceptación:
  - [ ] El administrador marca a una persona y esa persona, al entrar, ve la luz verde.
  - [ ] Con la luz verde, puede abrir un juego.
  - [ ] Si el administrador quita la marca, la luz pasa a roja y el juego no se abre.
  - [ ] Marcar o quitar no cambia las fichas ni los puntos del mes.
- Dependencias necesarias: ninguna.

## 5. Dejar al usuario fuera del panel y fuera de los juegos si no está marcado

- Objetivo: que el rol `user` solo juegue cuando el administrador lo ha marcado.
- Descripción: el usuario no tiene enlace al panel. Si intenta la ruta del panel a mano, vuelve al inicio. Si su luz está roja, el clic en un juego explica que aún no tiene acceso y se queda en el inicio. Si está verde, el juego se abre como hasta ahora.
- Archivos afectados: `App.tsx`, `src/admin/AdminPanel.tsx`.
- Criterios de aceptación:
  - [ ] Un usuario no ve el panel ni entra escribiendo su ruta.
  - [ ] Con luz roja, el clic en un juego no abre la partida y se lee el motivo.
  - [ ] Con luz verde, el juego se abre igual que antes.
- Dependencias necesarias: la tarea 4.

# Fuera del alcance

- Backend, API, MongoDB y cualquier cambio en `src/` del servidor.
- Elegir el rol en el registro o convertir a alguien en administrador desde el panel.
- Borrar cuentas, cambiar email, nombre o contraseña desde el panel.
- Cobrar de verdad, pasarela de pago, ventana de suscripción de 10 € y sumar puntos al marcar.
- Gráficas, ingresos, retención u otras métricas que la cuenta no guarda hoy.
- Saber si otra persona está conectada ahora mismo. La luz no significa eso.
- Decidir si el administrador juega sin estar marcado. No está dicho; no se añade un atajo.

# Incertidumbre

- No se dice qué cuenta concreta es la administradora. Este milestone solo exige que el mock pueda tener una, sin fijar email ni contraseña.
- «Activo» no se define aparte del acceso a los juegos. Aquí la luz verde es «el administrador ha marcado el pago» y la roja es «no lo ha marcado». Si más adelante activo significa otra cosa, este documento no lo cubre.
- «Gestionar usuarios» no describe alta, baja ni edición. Aquí se limita a ver la lista y marcar o quitar el pago.
- «Métricas de todos los usuarios» no nombra cifras nuevas. Se muestran las que la cuenta ya tiene.
