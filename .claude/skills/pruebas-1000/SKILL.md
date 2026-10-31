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

## 4. Arreglar y apuntar
- Cada fallo real: arreglo + prueba unitaria si es del motor, y repetir los pasos 2-3 hasta que salga limpio.
- En `diario/Roadmap.md`, sección «Pruebas con 1.000 usuarios»: lo encontrado (`[x]` arreglado, `[ ]` para decidir con David). Decisiones y nota del día como siempre.

## 5. Limpieza (siempre)
- Para el servidor del 3005.
- `npx jiti scripts/pruebas/usuarios.ts --borrar` (quita los `prueba-` y sus amistades).
- `cmp data/users.json <copia>`: tiene que ser igual.
