# routes-summary — salvation-qa

| Ruta | Carga | Título visible | Errores consola | Notas |
|---|---|---|---|---|
| `/` | 200 | Retro Hub / 5 JUEGOS LEGENDARIOS | 500/401 residuales al arranque (proxy ECONNRESET y sesión ausente); 0 errores tras login | Landing + secciones |
| `/#juegos` | vista | Catálogo de 5 juegos | 0 | Click-sweep `Juegos` |
| `/#ranking` | vista | Clasificación (GET /users 200) | 0 | Requiere sesión |
| `/#info` | vista | Info de pozo y abandono | 0 | |
| lobby Paddle Duel | vista | Elige rival | 0 | Sin iniciar partida |
| perfil Fernando | vista | Historial GET 200 | 0 | |
| `/robots.txt` | 200 HTML SPA | Retro Hub | n/a | No es robots real |
| `/sitemap.xml` | 200 HTML SPA | Retro Hub | n/a | No es sitemap real |
