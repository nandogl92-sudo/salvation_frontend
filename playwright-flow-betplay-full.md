# playwright-flow-betplay-full

## 1. Resumen ejecutivo

**Pass.** Entorno local, commit `da63e11` más los cambios sin commitear del proxy de Vite. La app en `http://localhost:4000` recorrió registro/login, lobby, partida real 1v1, resultado y perfil. El backend sigue en `http://localhost:4444` y el navegador llega a él por el proxy del mismo origen.

Playwright MCP no expone traza ni vídeo. Las capturas están en `artifacts/betplay-full/screenshots/`. No se generó `*.spec.ts`.

## 2. Escenario

Flujo completo de BetPlay: entrar sin sesión, login inválido, login de los dos usuarios del juego, apostar, emparejar, terminar la partida y ver el historial.

- `PAGE_URL`: `http://localhost:4000/`
- Tras login, registro o resultado la URL no cambia. La vista sí: home, lobby, playing, profile.
- Usuarios: `nando@gmail.com` / `12345678` (en la API el username es Fernando) y `marcos@gmail.com` / `12345678` (username Marcos).
- `ENV`: local. El archivo `docs/api_rest_postmant_documentation.json` no está en el repo. El contrato usado es `docs/backend/API.md`.

## 3. Cobertura

- Rutas enlazables desde la home: 0. Vista única `/` cubierta. Vistas de la SPA cubiertas: home, lobby, playing, profile.
- Elementos críticos accionados: pestañas de auth, login inválido, login válido, 1 juego, apuesta inválida y válida, buscar rival, resultado, perfil, logout y login del segundo usuario.
- Móvil: perfil de Marcos en viewport iPhone 13. Las tarjetas y el historial se leen enteros.

## 4. Hallazgos

| ID | Severidad | Tipo | Descripción | Repro | Logs | Impacto |
|---|---|---|---|---|---|---|
| F1 | S3 | UI | En el perfil, una derrota se escribe `$-10.00`. La victoria se escribe `+$9.00`. | Perder una partida y abrir el perfil. | Historial Fernando profit -10 | El número es correcto. El signo queda detrás del símbolo de dólar. |
| F2 | S3 | UI | "Volver al inicio" del perfil no tiene `aria-label`. | Abrir el perfil. | — | El botón se usa, pero el nombre accesible es solo el texto con la flecha. |

No hubo `console.error` de CORS en `http://localhost:4000`. El 401 y el 409 son las respuestas correctas del login malo y del email ya registrado. No hubo avisos de hidratación.

## 5. Qué se comprobó

1. Sin sesión, "Jugar Paddle Duel" abre el login con el aviso "Inicia sesión para jugar Paddle Duel."
2. `nando@gmail.com` con clave incorrecta muestra "Email o contraseña incorrectos." La red respondió 401.
3. Registrar ese email otra vez responde 409 `Ya existe una cuenta registrada con ese email.` y el formulario lo muestra.
4. Login de Fernando entra al lobby del juego que había elegido. Saldo $100.00.
5. Apuesta 500 muestra "Saldo insuficiente. Tienes $100.00" y bloquea la búsqueda. Apuesta 10 lo quita.
6. El perfil vacío dice 0 partidas y "Aún no has jugado ninguna partida oficial."
7. Fernando busca rival en Pong a $10. Marcos entra en la misma cola por `POST /matchmaking/tickets`. La UI empareja, el saldo baja a $90.00 y el rival es Marcos. Pozo $20.00.
8. La partida termina en derrota de Fernando: "-$10.00", nuevo saldo $90.00. `POST /matches/:id/results` respondió 200.
9. El historial de Fernando: 1 partida, 0 victorias, 1 derrota, profit -10, "Paddle Duel". El de Marcos: 1 victoria, profit +9, saldo $109.00. Los dos `GET /users/:id/history` respondieron 200 y `application/json`.
10. Cerrar sesión borra la sesión y vuelve al inicio. El login de Marcos en la misma UI muestra su victoria.

## 6. Recomendaciones

- Inmediatas: poner el signo delante del dólar en el profit negativo. Añadir `aria-label` al botón de volver del perfil.
- Medio plazo: el nombre de juego que devuelve el historial es `pong`; la UI lo traduce a "Paddle Duel". Conviene que el contrato y la pantalla usen el mismo nombre.
- Largo plazo: repetir este recorrido con Playwright MCP en cada entrega. Traza y vídeo no están en las herramientas actuales de este MCP.

## Evidencias

- `artifacts/betplay-full/screenshots/`
- `artifacts/betplay-full/routes-discovered.json`
- `artifacts/betplay-full/routes-summary.md`
- `artifacts/betplay-full/element-inventory-betplay-full.md`
- `artifacts/betplay-full/network.log`
- `artifacts/betplay-full/console.log`
