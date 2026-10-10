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

## Recorrido de la carrera
*2026-10-09*

- **Recorrido** (`.kmz`, `.kml`, `.gpx`) → se guarda en `goal.course` (`src/lib/importers/course.ts`).
  - Pensado para las webs de carreras como cruzandolameta.es, que dan el circuito en KMZ.
  - Se usa la línea más larga del archivo. Los puntos con hora de las exportaciones de Garmin se ignoran.
  - Se sacan la distancia, el desnivel (umbral de 3 m) y los marcadores de salida, meta, avituallamientos y km, según su nombre o icono.
  - Comprobado con el KMZ real de Santa Fe: 10,05 km, +31/−34 m, salida, meta y 2 avituallamientos.
- El desnivel del recorrido **no cambia el plan solo**: hay un botón «Ajustar el plan a este desnivel» que rehace el plan con ese dato.
- Si se vuelve a guardar la misma carrera (otra fecha u otro objetivo), se conserva el recorrido.
- Todo está en la tarjeta «Recorrido de la carrera» de la página Plan.
- **PDFs de la carrera: descartado.** Se llegaron a hacer (con Vercel Blob privado), pero David no los necesita y se quitaron, también la dependencia `@vercel/blob`.

## Temporada con varias carreras
*2026-10-09*

- David quería «más de un plan». Se eligió **una temporada**: un único plan hacia la carrera principal (A) con carreras secundarias dentro. Dos planes a la vez se pisarían en el calendario.
- Las carreras se guardan en `db.races` (`TuneUpRace`) y se meten en el plan con `applyTuneUpRaces` (`planner.ts`) cada vez que se rehace.
- **B · a tope**:
  - el día antes, solo activación;
  - 2 días previos sin series (3 si pasa de 13 km);
  - después, **un día suave por cada 3 km competidos** (Daniels): 10K → 3 días, media → 7;
  - sin fuerza el día antes ni los 2 días después.
- **C · como entreno**: a ritmo de umbral; cuenta como la sesión dura de la semana. Solo el día antes y el de después quedan suaves.
- La carrera sustituye a la sesión de ese día (p. ej. a la tirada larga del domingo).
- Aviso si una B está a menos de 21 días de una media o maratón principal (10 días para 5K/10K).
- Lo que se mueve por días no disponibles, y lo que reprograma la IA, nunca cae en el día de una carrera ni en el anterior. La IA tampoco convierte en dura una sesión pegada a una carrera.
- Las carreras después de la principal se guardan, pero no entran en el plan.
- Tarjeta «Temporada» en la página Plan: lista B/C/A, quitar y «+ Añadir carrera».

## Pasos y calorías del iPhone (atajo)
*2026-10-09*

- David tiene iPhone y no tiene Mac → nada de app nativa. Lo que más quiere de Salud son **pasos y calorías**.
- Solución sin app: un **atajo de la app Atajos** que lee de Salud los totales del día y los envía por `POST /api/salud`.
  - Autenticación con una **clave personal** `rio_…` (Perfil → Pasos y calorías). Se enseña una sola vez y solo se guarda su sha256 (`db.healthTokenHash` + clave `statsrun:db:salud:<hash>` → usuario). Se puede cambiar o desactivar; al borrar la cuenta se borra.
  - `/api/salud` es pública en el proxy: no usa la cookie de sesión, solo la clave.
  - Cuerpo JSON: `{pasos, kcalActivas, kcalReposo, fecha?}` o `{dias: [...]}`. Acepta números de Atajos en formato español («8.234», «512,7»).
  - Sin fecha, el día es el de **España** (`todayMadrid`): el servidor de Vercel va en UTC.
  - Cada envío del mismo día sustituye el total (el atajo puede ir varias veces al día). Se guardan 400 días en `db.health`.
- Dónde se ve: tarjeta en Inicio (hoy y media de 7 días) y pestaña Perfil → Pasos y calorías (gráficas de 30 días e instrucciones del atajo).
- La IA recibe los pasos y calorías de los últimos 7 días: muchos pasos (>15.000) cansan las piernas antes de una sesión dura.
- Limitación de iOS: Salud solo se lee con el iPhone desbloqueado; si la automatización falla, se pulsa el atajo a mano.

## Fuerza tipo Hevy
*2026-10-10*

- La fuerza deja de ser solo un añadido del plan de carrera: rutinas propias con cualquier material, registro en vivo como Hevy y un chat con la IA que crea programas. También para quien no corre.
- **Ejercicios**: se importa [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (dominio público, ~870 ejercicios con fotos, material y músculos), traducida al español, más los ejercicios de corredor que falten. Las fotos se sirven desde un CDN.
- **Orden**: 4.1 catálogo y material → 4.2 rutinas y entreno en vivo → 4.3 progreso → 4.4 chat IA → 4.5 usuarios solo fuerza.
- **IA**: para crear programas se usa un modelo más capaz en OpenRouter; los ajustes diarios siguen con `gpt-4o-mini`.
- **Extras**, todos: mapa de músculos, entrenos de fuerza en el feed, medidas corporales y calculadora de discos.
- El libro de Helms (PDF de David) solo se usa para resumir ideas con palabras propias; no se copia texto ni se sube el PDF.

## Catálogo de ejercicios y material
*2026-10-10*

- **896 ejercicios**: los 876 de free-exercise-db (commit `f00c92c`), traducidos al español a mano, más 20 de corredor que faltaban:
  - plancha Copenhague, gemelo excéntrico, sóleo con rodilla flexionada, peso muerto rumano a una pierna;
  - pogo, multisaltos, skipping A, avión de cadera, almeja con banda, tibial contra la pared;
  - bajada de escalón, Pallof con banda, bird dog, swing con kettlebell, hip thrust a una pierna;
  - sentadilla isométrica en pared, flexión de rodillas, búlgara sin peso, gemelo a una pierna y colgarse de la barra.
- Las instrucciones se reescribieron en 2-4 pasos cortos. Al traducir se afinó el **material** de cada ejercicio: banco, jaula, cajón, barra de dominadas y otros.
- Cómo se genera: `node scripts/build-exercises.mjs` junta `scripts/exercises/es.json` (traducción) y `extra.json` (los propios) y crea `src/lib/strength/catalog.json` (~400 KB, solo en el servidor). Al navegador llega solo lo necesario para listar.
- Las fotos se cargan desde jsDelivr, fijadas al commit, y no se guardan en el repositorio. En la ficha se alternan las dos fotos (posición inicial y final) como un gif.
- **Material**: lugares (`db.places`) con 16 tipos de material; uno está marcado como «ahora» (`activePlaceId`). Hay botones rápidos para Gimnasio, Casa y Sin material. El peso corporal siempre cuenta.
- **Ejercicios propios**: en `db.customExercises` (id `c_…`), con músculos, material y pasos. Se pueden editar y borrar.
- **Páginas nuevas**:
  - `/fuerza`;
  - `/fuerza/ejercicios`: búsqueda sin tildes y filtros de músculo, tipo, lugar y material, que se guardan en la URL; muestra 40 cada vez;
  - `/fuerza/ejercicios/[id]`;
  - `/fuerza/ejercicios/nuevo` (también sirve para editar con `?editar=`);
  - `/fuerza/material`.
- «Fuerza» se añade al menú (7 iconos en el móvil) y hay un enlace desde Perfil → Fuerza.

## Rutinas y entreno en vivo
*2026-10-10*

- A David no le gustó la primera portada de Fuerza. Mandó capturas de Hevy y se rehízo igual:
  - «Empezar entrenamiento vacío»;
  - Rutinas, con «Nueva rutina» y «Explorar» (la biblioteca);
  - tarjetas de rutina con sus ejercicios y «Empezar rutina».
- **Ficha de rutina** (`/fuerza/rutinas/[id]`):
  - «Comenzar rutina»;
  - gráfica de volumen, repeticiones o duración de cada vez que se hizo (último mes, 3 meses o año);
  - tabla SERIE · KG · REPS de cada ejercicio;
  - «Editar rutina».
- **Editor** (`/fuerza/rutinas/nueva` y `/[id]/editar`):
  - filas de kg y repeticiones (añadir y quitar);
  - descanso por ejercicio, reordenar y quitar ejercicios;
  - al tocar el número de serie cambia de tipo: calentamiento (C), descendente (D) o al fallo (F);
  - selector de ejercicios a pantalla completa, de varios a la vez, filtrado por tu material.
- **Entreno en vivo** (`/fuerza/entreno?rutina=…`):
  - cabecera con duración, volumen y series;
  - columnas SERIE · ANTERIOR · KG · REPS · ✓;
  - en gris, lo de la rutina o lo de la última vez: si no se escribe nada, al marcar ✓ se apunta eso;
  - «Anterior» empareja calentamiento con calentamiento y series efectivas con efectivas;
  - al marcar ✓ empieza el descanso (barra con −15, +15 y Saltar);
  - «Terminar» pide nombre, RPE y cómo te has sentido.
- El entreno en curso se guarda en el **navegador** (`localStorage`): si se cierra la app o se bloquea el iPhone, sigue donde estaba durante 12 h. Al guardar se borra.
- Al terminar se crea una **actividad de fuerza** con `workout` (solo las series marcadas):
  - cuenta en la carga (sRPE con el RPE), el plan, el feed y los logros;
  - la IA reajusta los próximos días;
  - la página de la actividad enseña los ejercicios, las series, el volumen y el 1RM estimado (Epley, hasta 12 repeticiones).
- El volumen no cuenta las series de calentamiento.
- Problemas encontrados al probar:
  - varios ✓ seguidos se pisaban: ahora el estado se actualiza siempre sobre el más reciente;
  - al guardar, Next volvía a renderizar la página y el entreno se recreaba en el navegador: ahora el efecto depende del id de la rutina y, tras guardar, ya no se escribe.
- Tras probarlo, David pide terminar cuando quiera y poder pausar:
  - **Terminar** ya no exige series marcadas. Se guardan las marcadas con ✓ aunque no lleven kg ni repeticiones (p. ej. flexiones sin peso). Si no hay ninguna, se guarda igual el entreno con su duración.
  - **Pausa**: «⏸ Pausa» / «▶ Reanudar» en la cabecera. Para el cronómetro y el descanso, y la duración guardada descuenta el tiempo en pausa (`pausedMs`).

## Borrar un entreno vuelve a donde estabas
*2026-10-10*

- Antes, al borrar un entreno siempre se iba a Registrar. Ahora se vuelve a la última página visitada que no sea de ese entreno (Perfil, Inicio, Fuerza…). Si no hay ninguna, va a Perfil → Actividades.
- El menú (`Nav`) apunta en `sessionStorage` las últimas 30 páginas de la pestaña. `DeleteActivityButton` borra, se salta la ficha y la edición del entreno borrado y vuelve a la página anterior.
- Además pide confirmación antes de borrar.

## Peso corporal en los ejercicios
*2026-10-10*

- David pide que en KG se pueda elegir el peso corporal, tomando el peso del perfil.
- Va **por ejercicio**: selector «⚖ Peso: Kg / Peso corporal» junto al descanso, en el editor de rutinas y en el entreno en vivo.
  - Con peso corporal, la columna pasa a **+KG**: el lastre opcional (chaleco, cinturón, mochila).
  - Carga de la serie = peso del perfil + lastre. Se muestra como «PC» o «PC + 10 kg».
- Los ejercicios que solo usan el cuerpo (con barra de dominadas, banco o cajón como mucho) empiezan con peso corporal al añadirlos.
- Al guardar el entreno se apunta el peso del perfil de ese día (`bodyKg`). El volumen y el 1RM estimado se calculan con la carga real y no cambian si luego cambias de peso.
- Sin peso en el perfil, se avisa: «Pon tu peso en Perfil para contarlo en el volumen».
- Rediseño (petición de David, «se ve mal»):
  - **Descanso**: chip redondeado ⏱, también editable durante el entreno.
  - **Peso**: control segmentado **[Kg | Peso corporal]** en lugar del desplegable.
  - Con peso corporal, la tabla tiene una columna **PESO** con el chip fijo «PC» (y tus kg del perfil en el entreno) y otra **LASTRE** para el peso añadido (+0 si no llevas).

## Arreglos de la versión móvil
*2026-10-10*

- **La página se movía hacia los lados en el iPhone.** En Chrome nada se salía de ancho. La causa probable es que los campos tenían letra de menos de 16 px y Safari hace zoom al tocarlos. Arreglos:
  - en móvil, `input`, `select` y `textarea` van a 16 px;
  - `body` recorta lo que se salga de ancho (`overflow-x: clip`, con `hidden` como respaldo).
- **Barra inferior.** Con 7 iconos quedaba estrecha. Ahora:
  - es más alta (iconos de 24 px y texto de 11 px) y tiene 5 secciones: Inicio, Plan, Fuerza, Registrar y Perfil;
  - «Más» abre un panel con Estadísticas, Amigos, Carreras, Calculadoras, Importar y **Cerrar sesión**, que antes no estaba en el móvil;
  - el hueco inferior de la página y la barra de descanso del entreno se ajustan a la nueva altura.
- El atajo de Salud funciona. iOS pide permiso para «enviar muestras médicas a la web»: hay que darle a **«Permitir siempre»**, si no, la automatización nocturna se queda esperando la respuesta.

