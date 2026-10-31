---
name: probar-movil
description: Probar un cambio de Zancavolt como en el móvil antes de darlo por bueno — comprobaciones, servidor de producción local, usuario de prueba con datos, capturas a 390 px (o a 1080×1920 para Google Play) y limpieza. Úsala después de tocar pantallas, o cuando David pida capturas.
---

# Probar en el móvil

Lo que pide `CLAUDE.md` en «Antes de darlo por bueno», paso a paso. Todo en Git Bash desde la raíz del repo.

## 1. Comprobaciones
```bash
npx tsc --noEmit && npx eslint src && npx vitest run && npm run build
```
Si algo falla, se arregla antes de seguir.

## 2. Usuario de prueba
Guarda antes una copia de `data/users.json` (en el scratchpad) para comprobar al final que queda igual.

Elige uno:
- **Datos de David** (lo normal): `cp data/db_07a76fdb-8585-4840-8a5d-f7082a9ea27a.json data/db_preview-demo.json` → usuario `preview-demo`. Sus amigos no salen (no está en `users.json`).
- **Usuaria ficticia con muchos datos** (plan, carreras con mapa, fuerza, amigos): `DEMO_PASS=$(node -e 'console.log(require("crypto").randomBytes(12).toString("hex"))') npx jiti scripts/demo-video/seed.ts` → usuario `demo-video-lucia` (mujer). Con `DEMO_LANG=en` delante, los nombres en inglés. Para otro idioma de la app, cambia `lang` en `data/db_demo-video-lucia.json`.

Cookie de sesión (no muestra secretos):
```bash
node scripts/movil/sesion.mjs preview-demo <scratchpad>/cookie.txt
```

## 3. Servidor
```bash
npx next start -p 3005   # en segundo plano; espera ~7 s
```
Tras cambiar código, `npm run build` otra vez y reinicia el servidor (para pararlo en PowerShell: `Get-NetTCPConnection -LocalPort 3005 -State Listen | % { Stop-Process -Id $_.OwningProcess -Force -Confirm:$false }`).

## 4. Capturas
```bash
export MSYS_NO_PATHCONV=1
node scripts/movil/capturas.mjs <scratchpad>/capturas <scratchpad>/cookie.txt "/|inicio.png" "/plan/actual|plan.png|window.scrollTo(0,400)"
```
- `IDIOMA=en` (o `ca`, `pt`, `fr`) para otro idioma; `PAGINA=1` para la página entera; `TAM=360x640x3` para capturas de Google Play (1080×1920).
- Si la pantalla carga algo lento (mapas), mete la palabra `esperar` en el js: `window.scrollTo(0,280); void 'esperar'`.
- Mira cada captura con Read. Busca: textos cortados o en otro idioma, cosas que se montan, desbordes a los lados, números con el formato del idioma.

## 5. Limpieza (siempre, aunque algo falle)
- Para el servidor del puerto 3005.
- `rm -f data/db_preview-demo.json` y, si usaste la ficticia, `npx jiti scripts/demo-video/seed.ts --borrar`.
- Comprueba con `cmp` que `data/users.json` es igual que la copia del paso 2.
- Borra la cookie del scratchpad.

## Cuidado
- Nunca imprimas `.env.local` ni la cookie.
- No pruebes contra producción con estos scripts: son para el servidor local.
