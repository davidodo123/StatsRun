# StatsRun (Run-In-Out)

App de entrenamiento para corredores: planes periodizados hacia una carrera, registro de entrenos, forma/fatiga, estadísticas y amigos.

## Arrancar en local

```bash
npm install
cp .env.example .env.local   # rellena GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET
npm run dev
```

Sin Redis, los datos se guardan en `data/` (ignorado por git).

## Inicio de sesión con Google

1. En https://console.cloud.google.com/apis/credentials crea un **ID de cliente de OAuth** de tipo *Aplicación web*.
2. Añade como URIs de redirección autorizados `http://localhost:3000/api/auth/google/callback` y `https://<tu-dominio>/api/auth/google/callback`.
3. Copia el ID y el secreto en `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` (en Vercel: Settings → Environment Variables).

Las cuentas antiguas (usuario y contraseña) se enlazan una sola vez la primera vez que su dueño entra con Google.

## Producción (Vercel)

- Conecta una base de datos Redis de Upstash en Storage (crea `KV_REST_API_URL` y `KV_REST_API_TOKEN`).
- Pon la región de las funciones de Vercel (Settings → Functions) en la misma región que la base de datos de Upstash: cada página lee de Redis y la distancia entre ambas se nota en cada carga.
- Define `AUTH_SECRET`.

## Comandos

- `npm run build`: compila para producción.
- `npm test`: pruebas del motor y los importadores.
- `npm run lint`: lint.
