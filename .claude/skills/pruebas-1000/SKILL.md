---
name: pruebas-1000
description: Prueba de Zancavolt con 1.000 o más usuarios ficticios en local — reglas del plan para cada uno y recorrido de todas las pantallas buscando errores. Úsala después de tocar el plan, las pantallas o los datos, o cuando haya ocasión (David quiere que se haga a menudo).
---

# Pruebas con 1.000 usuarios

Siempre **en local** (archivos de `data/`), nunca en producción. Todo desde la raíz del repo, en Git Bash.

## 1. Antes
- Copia `data/users.json` al scratchpad (al final tiene que quedar igual).
- `npx tsc --noEmit && npx vitest run && npm run build`.

## 2. Usuarios y reglas del plan
```bash
npx jiti scripts/pruebas/usuarios.ts 1000 <scratchpad>/informe-usuarios.json
```
- Crea `prueba-0000…` con semilla fija (perfiles, objetivos, idiomas, historial, casos raros), les hace el plan como `rebuildPlan` y comprueba las reglas. Para otra tanda distinta, cambia la semilla (`seed`) o sube el número.
- Mira cada tipo de fallo en el informe (`fallos` → `ejemplos`) **antes** de darlo por error: algunas reglas avisan de cosas correctas (semanas con días bloqueados, la propia semana de carrera…). Si una regla es demasiado estricta, se afina la regla.

## 3. Recorrido de pantallas
```bash
OPENROUTER_API_KEY= npx next start -p 3005 > <scratchpad>/srv.log 2>&1 &   # SIN la clave de la IA
node scripts/pruebas/recorrido.mjs <scratchpad>/informe-recorrido.json 1000 8
```
- 16 pantallas por usuario (~16.000 páginas, ~5 min). Busca errores 5xx, la pantalla «Algo ha fallado», textos rotos (NaN, undefined, Invalid Date…), redirecciones al login y páginas de más de 4 s.
- Revisa también `srv.log`: errores del servidor que no se ven en la página (p. ej. en `after()`).
- Sin la clave de la IA: abrir el Plan puede lanzar el reajuste con IA y llamaría a OpenRouter de verdad.

## 3b. Acciones (guardar formularios)
```bash
npx jiti scripts/pruebas/usuarios.ts --borrar && npx jiti scripts/pruebas/usuarios.ts 1000 <scratchpad>/informe-usuarios.json   # usuarios recién hechos
node scripts/pruebas/acciones.mjs <scratchpad>/informe-acciones.json 1000 16
```
- Llama a las acciones como el navegador (ids del build en `.next/server/server-reference-manifest.json`, así que **después** de `npm run build`): registrar, medida, saltar y deshacer, bloquear y liberar, rehacer el plan, fuerza, borrar, y 5 medidas a la vez.
- Luego lee el Db de cada uno y comprueba que quedó como debe (nada perdido, sin dos carreras el mismo día…). ~3 min con 16 a la vez.
- Cambia los datos de los usuarios: para volver a pasar el recorrido, créalos otra vez.

## 3c. Casos de uso (personas de principio a fin)
```bash
node scripts/pruebas/casos.mjs <scratchpad>/informe-casos.json
```
- Catorce personas («prueba-caso-…»), entre ellas: novata (perfil → carrera → plan → registrar, medida, objetivo, entreno al momento, GPS), lesionado (bloquear, deshacer, saltar, liberar, cambiar de día, rehacer), solo fuerza (lugar, rutinas, entreno, cambiar, duplicar), temporada (carreras A, B y C, mismo día, quitar), en inglés y en francés (busca textos que se quedaron en español) y dos amigos (pedir, aceptar, entreno juntos, privacidad, dejar); importar un GPX (sin duplicar), editar y foto; atajo de Salud (clave, varios días, clave falsa, revocar, respuesta en su idioma); fuerza por grupos (lugares, ejercicio propio, rutina en el plan, EMOM); errores que tienen que salir sin guardar nada; cambiar de plan y de idioma (ca, pt); memoria de la IA; y borrar la cuenta sin que quede nada.
- Una ronda tarda unos segundos; `CASOS_MIN=60` las repite con datos al azar durante una hora (unas 11.000 personas). Después del build y con el servidor en marcha; se borran con `--borrar` como los demás.

## 3d. Navegador de verdad (errores de JavaScript, imágenes rotas, lo que se sale por el lado)
```bash
node scripts/pruebas/navegador.mjs <scratchpad>/informe-navegador.json 250 4   # usuarios repartidos, 4 Chrome a la vez
```
- Con los usuarios del paso 2 creados y el servidor en marcha. Chrome sin ventana a 390 px, cada usuario en uno de los 5 idiomas (~35 min con 250).
- Antes de fiarse de un 0, `NAV_COMPROBAR=1 node scripts/pruebas/navegador.mjs <informe> 1 1`: tienen que salir `excepcion-js`, `consola-error` y `se-sale-por-el-lado` en todas las pantallas.

## 4. Arreglar y apuntar
- Cada fallo real: arreglo + prueba unitaria si es del motor, y repetir los pasos 2-3 hasta que salga limpio.
- En `diario/Roadmap.md`, sección «Pruebas con 1.000 usuarios»: lo encontrado (`[x]` arreglado, `[ ]` para decidir con David). Decisiones y nota del día como siempre.

## 5. Limpieza (siempre)
- Para el servidor del 3005.
- `npx jiti scripts/pruebas/usuarios.ts --borrar` (quita los `prueba-` y sus amistades).
- `cmp data/users.json <copia>`: tiene que ser igual.
