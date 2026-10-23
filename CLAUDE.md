@AGENTS.md

# Run-In-Out (repo `StatsRun`)

App de entrenamiento de running y fuerza con IA, para David y sus amigos. Producción: https://run-in-out.vercel.app (Vercel despliega solo con cada push a `main`).

**Antes de empezar, lee `diario/Inicio.md`, `diario/Roadmap.md` y la última nota de `diario/Diario/`.** Lo pendiente es la primera tarea `[ ]` del Roadmap.

## Cómo trabajamos

- En **español**, con pasos sencillos y numerados. **Una fase cada vez**: al terminar, para y espera a que David lo compruebe.
- **Pregunta antes de hacer commit o push**, salvo que diga «súbelo» o «sí» a subirlo.
- Commits **sin `Co-Authored-By` ni atribución a Claude** y **sin prefijos** («feat:», «fix:»).
- **Nunca subas `diario/Prompt nuevo chat.md`** (es solo local). Sube con `git add -A -- . ":!diario/Prompt nuevo chat.md" ":!capacitor-web/index.html"` o archivo a archivo; nunca `git add diario`.
- **Nunca pongas secretos** en el código ni en el diario (se suben a GitHub): van en `.env.local` y en Vercel. No pidas que se peguen claves en el chat.
- Después de cada bloque, **actualiza el diario**: Roadmap (casillas), `Decisiones.md` (qué y por qué) y la nota del día `Diario/AAAA-MM-DD.md`.
- Estilo del código: comentarios en español, sin sobrecomentar; sigue lo que ya hay.

## Antes de darlo por bueno

1. Pasan `npx tsc --noEmit`, `npx eslint src`, `npx vitest run` y `npm run build`.
2. Pruébalo en un servidor de producción local (`npx next start -p 3005`) con el usuario de prueba `preview-demo` (copia de los datos locales; «Probar con datos demo» para tener actividades). Las capturas a 390 px (tamaño iPhone) se sacan con Chrome sin ventana y la cookie de sesión de ese usuario.
3. Al acabar, borra `data/db_preview-demo.json` y deja `data/users.json` como estaba.

## El proyecto

- **Next.js 16** (lee `AGENTS.md`: cambia mucho respecto a versiones anteriores; la documentación está en `node_modules/next/dist/docs/`), React 19, TypeScript, Tailwind 4, Vitest, ESLint.
  - Tras guardar en una server action que redirige, llama antes a `refresh()` de `next/cache` (si no, las listas salen viejas: `staleTimes.dynamic: 30`).
  - Las fuentes van con `next/font` (Rubik).
- **Datos**: un JSON por usuario (`Db` en `src/lib/types.ts`). En producción, Upstash Redis (región iad1); en local, `data/` (`src/lib/db.ts`). Fotos aparte (`src/lib/photoStore.ts`). Copia cifrada cada noche a un repo privado de GitHub (`/api/cron/backup`; restaurar con `scripts/backup-restore.mjs`).
- **Sesión**: login con Google y cookie firmada; `src/proxy.ts` protege las rutas.
- **Plan**: `src/lib/engine/planner.ts` (VDOT, fases, carreras B/C, fuerza «general» o «por grupos»); `rebuildPlan` en `src/app/actions.ts`. La fuerza del plan usa las rutinas del usuario (`src/lib/strength/routinePlan.ts`, `Routine.planSlot`); las plantillas en texto se pasan a ejercicios con `src/lib/strength/planSteps.ts`.
- **IA** (`src/lib/coach.ts`, OpenRouter): reajusta los próximos 14 días en segundo plano con `after()`. El **Entrenador IA** (`/entrenador`, `src/lib/strength/chat.ts`) responde, crea rutinas, registra entrenos que le cuentas y cambia el plan, siempre con un botón para confirmar.
- **Fuerza**: entreno en vivo (`WorkoutLogger`, también en modo «ya hecho» para registrar a posteriori), EMOM (`EmomTimer`), mapa de músculos (`bodyShapes.ts`).
- **Registrar**: formulario manual, «Grabar con GPS» (`RunRecorder`, `src/lib/gpsTrack.ts`; solo con la pantalla encendida) e imagen para compartir (`/api/compartir/[id]`).
- **Diseño**: estilo deportivo, letra Rubik, naranja solo en el dato principal y en las gráficas; componentes en `src/components/ui.tsx` (`Stat`, `StatGroup`, `FoldCard`, `MoreMenu`…). Móvil primero.
- **iPhone**: David y sus amigos usan la web instalada (PWA) y el atajo de Salud (`POST /api/salud` con clave `rio_…`). No habrá App Store. `KeyboardFix` recoloca lo fijo con el teclado y al volver a la app; sin rebote (`overscroll-behavior: none`).
- **Android**: app Capacitor 8 en `android/` que carga la web; login por el navegador del sistema (`app.runinout://auth`), Health Connect (`healthConnect.ts`, `NativeBridge.tsx`). Compilar con JDK 21; claves de firma fuera del repo.
