---
tags: [config]
---
# ⚙️ Configuración

> [!warning] Aquí no van secretos
> Este diario se sube a GitHub. Los valores de claves van solo en `.env.local` (tu PC) y en Vercel.

## Vercel
- Proyecto: **run-in-out** → https://run-in-out.vercel.app
- Despliega solo con cada push a `main`.
- Región de funciones: **iad1 (Washington)**, la misma que la base de datos Upstash. Plan Hobby: 1 sola región.

### Variables de entorno
| Variable | Para qué |
|---|---|
| `GOOGLE_CLIENT_ID` | Login con Google |
| `GOOGLE_CLIENT_SECRET` | Login con Google |
| `AUTH_SECRET` | Firmar la cookie de sesión |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Base de datos Upstash Redis |
| `OPENROUTER_API_KEY` / `OPENROUTER_MODEL` | Entrenador IA |
| `STRAVA_CLIENT_ID` / `STRAVA_CLIENT_SECRET` / `APP_URL` | Conexión con Strava |
| `CONTACT_EMAIL` | Correo público de contacto en `/privacidad` (se lee en cada visita) |
## Google Cloud
- Proyecto: **Run-In-Out** → Google Auth Platform
- Cliente OAuth «Run-In-Out» (aplicación web). URIs de redirección:
  - `http://localhost:3000/api/auth/google/callback`
  - `https://run-in-out.vercel.app/api/auth/google/callback`
- Estado: **En producción** desde el 2026-10-09: puede entrar cualquier cuenta de Google.
  - Permisos básicos (`openid email profile`): no hace falta la verificación de Google.
  - Sin logotipo, para no activar la verificación de marca.
  - La primera vez puede salir «app no verificada» → Configuración avanzada → Ir a Run-In-Out.
- Marca:
  - página principal `https://run-in-out.vercel.app`;
  - privacidad `https://run-in-out.vercel.app/privacidad`;
  - dominio autorizado `run-in-out.vercel.app`.
- Secreto del cliente **rotado el 2026-10-09**: el nuevo está en `.env.local` y en Vercel (Production, Preview y Development).

## Local
```bash
npm install
npm run dev     # http://localhost:3000
npm test
npm run build
```
