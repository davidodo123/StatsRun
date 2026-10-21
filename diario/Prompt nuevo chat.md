---
tags: [prompt]
---
# Prompt para empezar un chat nuevo

Copia todo lo que hay debajo de la línea y pégalo como primer mensaje del chat nuevo (Claude Code abierto en `C:\Users\david\Desktop\StatsRun`).

---

Vamos a seguir con **Run-In-Out** (repo `StatsRun`). Te resumo el proyecto, cómo trabajamos y lo siguiente.

## El proyecto
- App de entrenamiento de running y fuerza con IA. Producción: https://run-in-out.vercel.app. Vercel despliega solo con cada push a `main`.
- Next.js 16, React 19, TypeScript, Tailwind 4, Vitest y ESLint. **Lee `AGENTS.md`**: esta versión de Next tiene cambios importantes. Consulta `node_modules/next/dist/docs/` antes de escribir código.
  - Después de un `redirect` en una server action, llama antes a `refresh()` de `next/cache`. Si no, las listas se quedan viejas (`staleTimes.dynamic: 30`).
- Datos: un JSON por usuario (`Db`, en `src/lib/types.ts`). En producción van en Upstash Redis y en local en `data/` (`src/lib/db.ts`).
  - Las fotos de perfil y de entrenos van aparte, en `src/lib/photoStore.ts`.
- Login con Google y cookie firmada. `src/proxy.ts` protege las rutas.
- El plan se genera en `src/lib/engine/planner.ts`: VDOT, fases, carreras B/C y fuerza «general» o «por grupos» (pecho, espalda y pierna).
  - `rebuildPlan` está en `src/app/actions.ts`.
- La IA (`src/lib/coach.ts`, OpenRouter) reajusta los próximos 14 días en segundo plano con `after()`.
- **Dónde la usamos:**
  - Yo y mis amigos tenemos iPhone. La usamos como PWA, con el enlace y el atajo de Salud (`POST /api/salud` con una clave `rio_…`). **No habrá App Store.**
  - **Android:** app Capacitor 8 en `android/`, que carga la web remota.
    - Login con Google por el navegador del sistema, que vuelve a `app.runinout://auth`.
    - Health Connect (`src/components/healthConnect.ts` y `NativeBridge.tsx`).
    - El proyecto está firmado para Google Play; las claves están en `C:\Users\david\.android-keys`.
    - Para compilar uso JDK 21, configurado en `~/.gradle/gradle.properties`, con el emulador `Medium_Phone_API_37.0`.
- Copias de seguridad: cada noche un cron de Vercel (`/api/cron/backup`) hace una copia cifrada AES-GCM en un repo privado de GitHub. Se guardan 30 días las diarias y 12 meses las mensuales.
  - Para restaurar: `scripts/backup-restore.mjs`, que pide la clave.
- Diario y roadmap en Obsidian, en `diario/`: `Roadmap.md`, `Decisiones.md`, `Estudio entrenamiento.md` y `Diario/AAAA-MM-DD.md`. **Léelos antes de empezar.**

## Lo último que se hizo (último commit `7d58369`)
- Deshacer «No puedo ese día» (`UndoSkip`), un aviso de confirmación al pulsarlo y «Vuelvo a estar disponible» en cada semana.
- Fuerza por grupos en el perfil (`strengthStyle`): el día de pierna no hay carrera.
- Perfil compacto, con pestañas dentro de la tarjeta, foto de perfil y km totales con 2 decimales.
- Fotos en los entrenos, que se ven en el feed de amigos.
- Calculadora de sueño en Más → Sueño (`/sueno`).
- Arreglos del iPhone:
  - la franja negra bajo la barra;
  - la barra de abajo flotando con el teclado;
  - las fechas que se salían de la tarjeta;
  - solo en vertical.
- Registrar: el tiempo y el ritmo se escriben con el teclado numérico y los «:» se ponen solos (`maskTime`, en `src/lib/format.ts`).

## Lo siguiente
1. **Pendiente ahora:** el botón «↻ Adaptar con mis datos» de `src/app/(app)/plan/actual/page.tsx` no parece hacer nada.
   - Llama a `regeneratePlan()` (`rebuildPlan`, más la IA en segundo plano, más `refresh()`).
   - Seguramente funciona, pero no se ve nada: no tiene estado «Adaptando…», ni mensaje, y el plan recalculado suele salir igual. Lo que cambia la IA llega más tarde.
   - Compruébalo en local, comparando el plan de antes y el de después.
   - Luego dale respuesta visible: estado pendiente con `useActionState`, un mensaje de qué se ha recalculado, y avisar de que la IA lo está ajustando.
2. **Google Play (en pausa):** estoy unos días probando la app. Después:
   - cuenta personal de Play Console;
   - prueba cerrada con 12 testers durante 14 días;
   - ficha de la tienda;
   - declaración de datos de salud;
   - subir `versionCode` en cada subida.
3. **Me queda probar:**
   - Health Connect con datos reales en un Android de verdad;
   - las últimas pantallas en el iPhone.
4. Del roadmap: desacople aeróbico, que necesita los streams de Strava.

## Ideas nuevas (de `diario/Ideas.md`, sin hablar todavía)
Cuando terminemos lo de arriba, quiero ver estas ideas contigo. Para cada una, proponme el alcance y el orden antes de programar, y pásala al Roadmap cuando la cerremos.
1. **Sección EMOM:** entrenos «cada minuto, al minuto».
2. **Chat con la IA** en el apartado de IA, para pedirle que me haga la rutina.
3. **Registrar entrenos por voz:** se lo cuento a la IA y ella lo registra.
4. **Compartir el entreno en Instagram o WhatsApp, como Strava,** con una imagen al terminar.
   - **Fuerza:** el muñeco del cuerpo humano (el de la pestaña Fuerza) con los músculos trabajados coloreados, más las series, las repeticiones, el peso, el tiempo y algún dato más.
   - Hay que mejorar el diseño del muñeco. Antes de nada, pásame un prompt para pedírselo a Gemini (un cuerpo humano neutro que luego tú coloreas), o hazlo tú.
   - **Running:** lo mismo, pero con el mapa del recorrido en vez del muñeco. El diseño lo vamos viendo.
5. **Grabar la carrera con el GPS del móvil:** en Registrar, le das a empezar, corre el cronómetro y va guardando la ubicación. Así se sacan el ritmo, los km, los pasos y el mapa con más exactitud.

## Cómo quiero que trabajes
- Háblame en **español** y explícate con pasos sencillos y numerados.
- **Una fase cada vez.** Al terminar, para y espera a que lo compruebe.
- **Pregúntame antes de hacer commit o push**, salvo que diga «súbelo» o «pushealo».
- Commits:
  - **sin `Co-Authored-By` ni ninguna atribución a Claude**;
  - **sin prefijos** como «feat:» o «fix:»;
  - nunca subas `diario/Prompt nuevo chat.md`: usa `git add -A -- . ":!diario/Prompt nuevo chat.md"`.
- Después de cada bloque, **actualiza el diario de Obsidian** (Roadmap, Decisiones y la nota del día).
- **Nunca pongas secretos en el diario ni en el código**, porque se sube a GitHub. Van solo en `.env.local` y en Vercel. Tampoco me pidas que pegue claves o tokens en el chat.
- Antes de darlo por bueno:
  - que pasen `npx tsc --noEmit`, `npx eslint src`, `npx vitest run` y `npm run build`;
  - pruébalo en un servidor de producción local (`npx next start -p 3005`) con usuarios de prueba (`preview-demo`, `amigo-demo`);
  - al acabar, bórralos y deja `data/users.json` como estaba.
- Sigue el estilo del código: comentarios en español y sin sobrecomentar.
