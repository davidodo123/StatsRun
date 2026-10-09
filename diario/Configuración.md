---
tags: [config]
---
# ⚙️ Configuración

> [!warning] Aquí no van secretos
> Este diario se sube a GitHub. Los valores de claves van solo en `.env.local` (tu PC) y en Vercel.

## Vercel
- Proyecto: **run-in-out** → https://run-in-out.vercel.app
- Despliega solo con cada push a `main`.
- Hay un segundo proyecto, `stats-run`, conectado al mismo repo (duplicado).

### Variables de entorno
| Variable | Para qué |
|---|---|
| `GOOGLE_CLIENT_ID` | Login con Google |
| `GOOGLE_CLIENT_SECRET` | Login con Google |
| `AUTH_SECRET` | Firmar la cookie de sesión |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Base de datos Upstash Redis |
| `OPENROUTER_API_KEY` / `OPENROUTER_MODEL` | Entrenador IA |
| `STRAVA_CLIENT_ID` / `STRAVA_CLIENT_SECRET` / `APP_URL` | Conexión con Strava |

## Google Cloud
- Proyecto: **Run-In-Out** → Google Auth Platform
- Cliente OAuth «Run-In-Out» (aplicación web). URIs de redirección:
  - `http://localhost:3000/api/auth/google/callback`
  - `https://run-in-out.vercel.app/api/auth/google/callback`
- Estado: **Prueba** → solo entran los usuarios de prueba (Público → Usuarios de prueba).
- Para publicar hace falta página principal y política de privacidad.

## Local
```bash
npm install
npm run dev     # http://localhost:3000
npm test
npm run build
```
