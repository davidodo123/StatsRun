---
tags: [decisiones]
---
# 🧭 Decisiones

Qué se decidió, por qué y cuándo. Si algo cambia, se añade una entrada nueva (no se borra la vieja).

## Login solo con Google
*2026-10-09*

- Se entra **solo con Google**. Fuera usuario/contraseña y el código de invitación.
- Las cuentas antiguas se **enlazan una vez**: la primera vez con Google se pide el usuario y contraseña viejos para conservar entrenos, plan y amigos. Después la contraseña se borra.
- Mientras la app de Google esté en modo «Prueba», solo entran los emails añadidos como usuarios de prueba (control de quién entra, como hacía el código de invitación).

## Sensaciones para la IA
*2026-10-09*

- Al registrar un entreno: botones (muy fácil → muy duro) + texto libre «¿Cómo te has sentido?».
- La IA lo compara con la sesión que tocaba y ajusta los próximos 14 días:
  - fácil → sube un poco la exigencia (sin pasar del 15 % de distancia por sesión)
  - duro → baja 2-4 días
  - dolor → quita intensidad
- El planificador sigue mandando en la estructura (fases y volumen); la IA solo retoca sesiones dentro de límites.

## Diagnóstico de estado de forma para la IA
*2026-10-09*

- Antes de llamar a la IA, la app calcula un **diagnóstico determinista** (`src/lib/engine/readiness.ts`): fase de Selye + veredicto **progresar / mantener / descargar / recuperar**.
- Señales: ACWR, TSB, monotonía, sensaciones de 7 días, RPE de los rodajes, eficiencia (velocidad/FC), palabras de dolor, sueño, estrés y motivación, y sesiones sin hacer.
- Regla de descarga de la Pirámide de Helms: 2+ señales de mala recuperación → descarga; solo molestias → semana ligera.
- La IA **no puede contradecirlo** y el código lo hace cumplir:
  - progresar: hasta +10 % por sesión
  - mantener: sin subir
  - recuperar: −10 % y nada de calidad nueva
  - descargar: −30 %, y se acortan también las sesiones de los próximos 7 días que la IA no toque
- Fuerza con RPE/RIR, sin fallo y fuerza pesada en construcción.
- **Tope por sesión** (Frandsen 2025): ninguna sesión puede pasar de la tirada más larga de 30 días + 10 %. El código impide que la IA alargue por encima; el prompt le pide acortar lo que ya lo supere. El planificador todavía no aplica el tope por sí solo.
- **Enfermedad** (fiebre, gripe, catarro… en los últimos 7 días) → recuperar, sin calidad.
- Prompt ampliado con:
  - el semáforo de dolor 0–10 para volver a correr;
  - el afinamiento: −40–60 % de volumen, manteniendo intensidad y frecuencia;
  - la progresión semanal: subir más de un 30 % aumenta las lesiones;
  - la distribución piramidal, válida para populares.
- El ACWR se queda como una señal más, por las críticas de Impellizzeri.
- Todo el porqué → [[Estudio entrenamiento]] (sección 9).

## Perfil con pestañas
*2026-10-09*

- `/perfil` tiene una cabecera (iniciales, nivel, VDOT, km, carreras, horas) y estas pestañas por URL (`?tab=`):
  - Resumen
  - Running
  - Fuerza
  - Actividades
  - Logros
  - Editar perfil
- La lógica está en `src/lib/engine/profile.ts` (funciones puras con tests); la página solo pinta.
- **Mejores tiempos:** mejor ritmo medio en carreras de esa distancia o más (margen GPS del 3 %), llevado a la distancia exacta.
  - Si la carrera es más de un 10 % más larga, se marca como «estimado».
  - Aún no hay splits por km, así que no se pueden sacar tiempos reales dentro de una carrera.
- **Tabla de mejora:** 3 bloques de 4 semanas y el cambio del último respecto al anterior.
  - Métricas: km/sem, carreras/sem, ritmo, FC, EF, cadencia, tirada más larga y fuerza/sem.
  - En el ritmo y la FC, bajar es mejorar.
- **Logros:** se calculan con los datos que ya hay; no se guardan.
  - Grupos: distancia, volumen, ritmo, constancia, fuerza y plan.
  - Cada logro tiene fecha de conseguido o barra de progreso.
- **Promedios:** el botón «Actualizar el perfil con estos datos» pone en el perfil los km/semana y la tirada más larga de las últimas 6 semanas.
  - Solo aparece si los datos difieren (3 km/sem o 2 km).
  - No toca la fuerza por semana, porque eso cambia el plan.
- La pestaña Actividades tiene filtro (todas, correr, fuerza, otros) y páginas de 25; cada sesión tiene un enlace para editarla.

## Registro manual en vez de captura
*2026-10-09*

- Se quitó «rellenar desde captura» (IA leyendo imágenes). Los datos se copian de Strava a mano: más fiable y sin gastar IA.
- Con dos de distancia / tiempo / ritmo se calcula el tercero. La cadencia sale de los pasos.

## Datos en Redis con control de versiones
*2026-10-09*

- Un documento JSON por usuario en Upstash Redis. Cada escritura comprueba que nadie ha escrito entre medias (si no, reintenta): evita que la IA y el usuario se pisen cambios.

## Amigos, sesiones compartidas y mapas
*2026-10-09*

- **Buscar perfiles con solicitud de amistad.** Al buscar solo se ve el nombre, el @usuario y la foto; nunca el código ni el email.
  - Para ver las estadísticas, el otro tiene que aceptar la solicitud.
  - Si los dos se envían solicitud, quedan como amigos.
  - El código de amigo sigue funcionando como atajo (cuenta como aceptación).
- **Feed** «Actividad de tus amigos»: sus sesiones de los últimos 14 días.
  - Sin sensaciones ni notas: eso es privado. Lo quita `publicActivity`.
- **Sesiones compartidas:** `Activity.with` guarda los ids de los amigos con los que entrenaste (solo amigos).
  - Al amigo le aparece en «Entrenasteis juntos» durante 30 días, con dos opciones:
    - **Añadir**: copia distancia, tiempo, desnivel y recorrido. El pulso, el RPE y las sensaciones son de cada uno y se rellenan al editarla.
    - **No, gracias**: la descarta.
  - La copia lleva `sharedFrom` para no duplicarla.
- **Mapa:** el recorrido se guarda como *encoded polyline* (`Activity.route`, `src/lib/route.ts`), simplificado a 400 puntos como máximo.
  - Viene de Strava (`map.summary_polyline`) y de los archivos GPX, TCX y FIT importados.
  - Se dibuja en SVG sobre teselas de CARTO (datos de OpenStreetMap, con atribución). No hace falta clave ni librería.
  - En las listas sale como miniatura sin teselas.
- **Página nueva** `/actividad/[id]`: mapa grande, datos y con quién.
  - Para ver la de un amigo se usa `?de=<id>` y se comprueba que sois amigos.
  - Las sensaciones solo aparecen en las tuyas.
- **Strava:**
  - La primera sincronización tras este cambio recarga el último año, para traer los mapas de lo ya importado (`routesSynced`).
  - Al volver a sincronizar ya **no se pierden** el RPE, las sensaciones ni las notas que añadiste (antes se sobrescribían).

## Etiquetas y repetición del recorrido
*2026-10-09*

- **Etiquetas** (`src/lib/engine/tags.ts`): se calculan en orden cronológico, así que dicen lo que supuso la sesión **cuando se hizo**.
  - 🏆 **Récord** de 5K, 10K, media o maratón: el mejor ritmo medio hasta esa fecha. Solo se marca la mayor distancia que cubre la carrera.
  - 🎉 Primer 5K, primer 10K…
  - 📏 Tu carrera más larga y ⛰️ más desnivel (este, con 50 m como mínimo). Las dos piden al menos 3 carreras de historial.
  - ⚡ Mejor ritmo del mes: carreras de 3 km o más, con al menos 3 en la ventana de 30 días.
  - 💪 Mayor carga, según la carga de entrenamiento con el VDOT de cada uno.
- Salen en las listas (Perfil, Amigos, página del amigo), en la página de la sesión y en el aviso tras registrar («¡Nuevo récord!»).
- **Repetición del recorrido** (`RouteReplay`), al estilo del flyover de Strava pero en 2D:
  - la cámara sigue al corredor con 2 niveles más de zoom;
  - la línea se va dibujando;
  - se cuentan los km y el tiempo;
  - dura de 6 a 14 s según la distancia.
- Con «reducir movimiento» del sistema activado, la cámara no se mueve.
- Por qué no en 3D: un flyover en 3D necesita Mapbox o MapLibre con relieve y una clave de pago. Se queda como mejora futura.

## Privacidad, borrar cuenta y tope de la tirada larga
*2026-10-09*

- **Página de privacidad** (`src/app/privacidad`), pública: el proxy la deja pasar sin sesión porque Google la exige para publicar el login. Explica:
  - qué datos se guardan;
  - qué ven los amigos (nunca las sensaciones);
  - qué se envía a la IA (sin nombre ni email);
  - qué proveedores intervienen;
  - y los derechos de cada uno.
- El email de contacto se lee de la variable de entorno `CONTACT_EMAIL`, para no escribirlo en el código.
- **Borrar mi cuenta** (Perfil → Editar): hay que escribir BORRAR. Se borra el Db, se quita el usuario de los amigos y solicitudes de los demás, se desconecta Strava y se cierra la sesión.
- **Planificador:** la tirada larga sube como mucho un 10 % sobre la más larga reciente (con un mínimo de 0,5 km), redondeando hacia abajo a medio kilómetro.
  - Antes eran +1,5 o +2 km fijos: con tiradas cortas eso era un +20-30 %, justo el pico de riesgo de Frandsen 2025.
  - Si el tope frena la progresión, el plan lo avisa en sus notas.

## App instalable (PWA) y repaso móvil
*2026-10-09*

- **PWA en vez de app nativa** (elegido por David): se instala desde el navegador, sin tiendas ni cuentas de desarrollador.
  - Manifest con iconos PNG 192 y 512, uno *maskable* y `apple-touch-icon`, generados con `scripts/generate-icons.mjs`.
  - Atajos (Registrar, Plan, Amigos), `viewportFit: cover` y margen superior para la muesca del iPhone.
- **Service worker** (`public/sw.js`):
  - las páginas salen siempre de la red; sin conexión se muestra `offline.html`;
  - solo se guardan en caché los estáticos con hash y los iconos;
  - **nunca** se guarda una página con datos personales;
  - se registra solo en producción.
- **Aviso «Instala PaceLab»** con dos variantes:
  - Android, Chrome y Edge: botón que abre el diálogo del sistema;
  - iPhone: instrucciones (Compartir → Añadir a pantalla de inicio).
  - Se puede cerrar y se recuerda en el navegador.
- **Revisión con capturas reales** (Chrome sin ventana a 390 px, con un usuario de prueba temporal que luego se borró). Problemas encontrados y arreglados:
  - **Mapas**: CARTO ya exige clave (las teselas salían con «API KEY REQUIRED»). Ahora se usan las de OpenStreetMap, con atribución y política de uso ligero.
  - **`.btn` e `.input` estaban fuera de cualquier capa de CSS** y ganaban a las utilidades de Tailwind, así que `px-3`, `text-xs`, `w-full`… no hacían nada en los botones. Ahora están en `@layer components`.
  - Las cuadrículas `grid lg:grid-cols-3` desbordaban en móvil: les faltaba `grid-cols-1` (`minmax(0,1fr)`).
  - En la tira de fases de Selye, «Supercompensación» no cabía: en móvil se usan etiquetas cortas.
  - La tabla de mejora en móvil enseña solo los dos últimos bloques.
  - `Date.now()` antes de una petición real daba un error con `cacheComponents` + `partialPrefetching`. Ahora `getUserId` espera a `connection()` antes de comprobar la caducidad.
- La tirada más larga reciente para generar el plan pasa de 42 a 30 días, igual que Frandsen.

## Nombre Run-In-Out
*2026-10-09*

- La app se llama **Run-In-Out** en todos los textos visibles: logo, título, app instalada, privacidad y pantalla sin conexión.
- Las claves internas `pacelab-…` (caché del service worker y aviso de instalar) no cambian: no se ven, y cambiarlas haría que el aviso volviera a salir.
- Versión del service worker v2, para renovar la pantalla sin conexión guardada.

## Recorrido y documentos de la carrera
*2026-10-09*

- **Recorrido** (`.kmz`, `.kml`, `.gpx`) → se guarda en `goal.course` (`src/lib/importers/course.ts`).
  - Pensado para las webs de carreras como cruzandolameta.es, que dan el circuito en KMZ.
  - Se usa la línea más larga del archivo. Los puntos con hora de las exportaciones de Garmin se ignoran.
  - Se sacan la distancia, el desnivel (umbral de 3 m) y los marcadores de salida, meta, avituallamientos y km, según su nombre o icono.
  - Comprobado con el KMZ real de Santa Fe: 10,05 km, +31/−34 m, salida, meta y 2 avituallamientos.
- El desnivel del recorrido **no cambia el plan solo**: hay un botón «Ajustar el plan a este desnivel» que rehace el plan con ese dato.
- Si se vuelve a guardar la misma carrera (otra fecha u otro objetivo), se conserva el recorrido.
- **PDFs** (reglamento, dorsal…) en «Documentos»:
  - se comprueba que son PDF de verdad (cabecera `%PDF-`);
  - máximo 4 MB (Vercel corta las peticiones a 4,5 MB) y 20 documentos.
- Se guardan en **Vercel Blob privado** (sin URL pública). En local van a `data/files/`.
  - Solo se abren con `/api/documentos/[id]`, que comprueba que el documento es del usuario de la sesión.
  - Se sirven con `Cache-Control: private, no-store`.
- Al borrar un documento o la cuenta, también se borra el archivo.
- Todo está en la tarjeta «Tu carrera: recorrido y documentos» de la página Plan. Los documentos no se comparten con los amigos.
