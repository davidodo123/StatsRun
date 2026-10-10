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
- **Nuevo diseño móvil** (petición de David):
  - barra superior fija con el logo a la izquierda (lleva a Inicio) y Amigos a la derecha;
  - barra inferior: Plan · Fuerza · **Registrar** (botón naranja más ancho, en el centro) · Perfil · Más;
  - «Más» se queda con Estadísticas, Carreras, Calculadoras, Importar y Cerrar sesión;
  - el contenido baja lo que ocupa la barra superior (contando la zona de la cámara del iPhone), y la cabecera fija del entreno en vivo se queda justo debajo de ella.

## Pantalla de planes
*2026-10-10*

- David quiere que «Plan» abra primero una lista de planes con un botón «Crear plan», y que al pinchar un plan salga el detalle.
- Decidido: **un plan en marcha + planes anteriores** (sigue habiendo un solo plan activo, el que manda en el calendario y en la IA).
- Rutas:
  - `/plan`: lista. Tarjeta del plan en marcha (semana actual y fase, cumplimiento, tiempo previsto, barra de avance), «+ Crear plan» (lleva a Carreras) y «Planes anteriores» con su cumplimiento;
  - `/plan/actual`: el plan completo de antes, con «← Planes». «Borrar» pasa a ser **«Terminar plan»**;
  - `/plan/anterior/[id]`: ficha de solo lectura con cumplimiento, km hechos de los previstos, VDOT y cada semana con sus sesiones (✓ hecha, ◐ a medias, ✕ sin hacer). Se puede borrar del historial.
- **Cuándo se archiva** (`db.pastPlans`, como mucho 12): al crear un plan para **otra** carrera, o al pulsar «Terminar plan». Cambiar fecha u objetivo de la misma carrera rehace el plan sin archivarlo. Se guardan también sus carreras secundarias.
- Los enlaces «Ver plan» (Inicio, Perfil, Registrar) y la vuelta tras registrar una sesión del plan van a `/plan/actual`.

## Fuerza del plan con tus rutinas
*2026-10-10*

- David vio que el plan ponía la misma «Fuerza general» (solo tren inferior) y que la IA no usaba su rutina. Además, la nota «IA: …» se repetía en cada ajuste.
- **Sesiones distintas** (`StrengthKind`, plantillas por fase y tipo en `planner.ts`). Hasta **3 a la semana** (perfil y `saveProfile`):
  - 1 a la semana: cuerpo entero;
  - 2: pierna + tren superior;
  - 3: pierna pesada + cadena posterior con pliometría + tren superior y core;
  - afinamiento: 1 de activación.
- **Colocación** (`placeStrength`), por orden:
  - la posterior elige primero: en día suave y no en víspera de tirada larga o de sesión clave; si no hay, con tempo, nunca con series, repeticiones o cuestas;
  - la de pierna, el mismo día que una sesión dura y no en víspera de nada clave;
  - la de tren superior, en cualquier hueco libre.
- **Rutinas del usuario en el plan** (`lib/strength/routinePlan.ts`):
  - cada rutina se clasifica como inferior, superior o completa según los músculos principales de sus ejercicios;
  - los huecos de pierna y posterior usan las inferiores; los de superior, las superiores; si hay varias de la misma zona, se van turnando;
  - la sesión toma el nombre de la rutina y sus ejercicios («2 × 12-15 Flexiones con peso corporal») y tiene el botón **«▶ Empezar rutina»**;
  - en fase específica y en descarga: 1-2 series menos o la mitad. En afinamiento: activación;
  - se aplica al rehacer el plan y cada vez que se crea, edita o borra una rutina.
- **IA**: recibe `rutinasDeFuerza`, el tipo y la rutina de cada sesión, y un resumen de cada entreno de fuerza reciente (músculos, ejercicios, series y volumen). Reglas nuevas:
  - respetar la rutina del atleta (solo quitar series o saltos);
  - no cambiar tren superior por pierna;
  - nada de calidad ni tirada larga el día después de pierna pesada.
- Arreglado: la nota «IA: …» se sustituye en cada revisión en vez de acumularse, y «Semana de descarga» ya no se repite.
- **Perfil → Disponibilidad rediseñado** (petición de David):
  - los días son chips L M X J V S D, sin casilla y rellenos en naranja al marcarlos;
  - la tirada larga se elige con chips, solo entre los días marcados; si se desmarca ese día, pasa al último que quede;
  - las sesiones de fuerza se meten como **número con − / +, de 0 a 4** («Recomendado: 2-3»). Con 4, la cuarta es otra de tren superior.

## Ejercicios ocultos, rutinas cortas y desplegables
*2026-10-10*

- **«Desaparecían» ejercicios al añadir**: el buscador (`ExercisePicker`) venía con «Mi material» activado y ocultaba todo lo que tu lugar no tiene. Ahora empieza desactivado. Si lo activas, avisa: «N ejercicios ocultos porque necesitan material que no tienes · Ver todos».
- **Rutina corta en el plan** (decisión de David: «rutina + completar»):
  - la sesión empieza con los ejercicios de tu rutina y añade, marcadas con «+», las líneas de la plantilla del plan cuyo patrón no cubre: empuje, tirón, vertical, hombro, core, sentadilla, bisagra, gemelo, aductor o pliometría;
  - los patrones de la rutina salen de los músculos principales de sus ejercicios; los de la plantilla, de su texto;
  - ejemplo: «Pecho» (solo flexiones) + remo, press de hombro, dominadas y core.
- **Desplegables en toda la web**:
  - sin el aspecto del sistema: flecha naranja propia, fondo y bordes de la app;
  - en Chrome, la lista abierta también lleva el diseño (`appearance: base-select`: tarjeta redondeada y opción elegida en naranja); en el iPhone se abre la rueda nativa;
  - el periodo de la gráfica de rutinas es un chip (`select-chip`);
  - los filtros de Explorar tienen textos cortos («Músculo: todos») para que quepan en el móvil.

## Fuerza con IA en el plan
*2026-10-10*

- Idea de David: en el plan de running, un cuadro donde le cuenta a la IA qué tiene en casa (p. ej. kettlebell, mancuernas de 15-18 kg, cinta elástica, barra de dominadas) y qué sabe hacer o su rutina normal. A partir de eso, la IA le hace la rutina para preparar la carrera y estar fuerte.
- **Tarjeta «Fuerza con IA»** en `/plan/actual` (`StrengthCoachCard`), con dos cuadros: material y «qué sueles o puedes hacer». Se guardan en `db.strengthCoach`.
- **Acción `generateStrengthRoutines`**:
  - manda a la IA su material, su capacidad, sus lesiones, la carrera, las fases que quedan, las sesiones de fuerza por semana y el catálogo compacto (`id | nombre | material | músculos`, solo fuerza y pliometría, sin nivel avanzado);
  - pide una rutina por **tipo** (pierna, posterior, superior, completo, según sesiones por semana) y **bloque**: «base» (técnica, 8-12) para la fase base, y «fuerza» (4-6 con pliometría) para construcción y específico;
  - **validación** (`routinesFromAi`): material con códigos conocidos; ejercicios que existen y que puede hacer con ese material; entre 1 y 6 series; el rango de repeticiones va a la nota («Rango 8-12: cuando llegues a 12…»); descansos redondeados a 15 s; peso corporal en los ejercicios sin peso externo; mínimo 2 ejercicios por rutina;
  - las rutinas se guardan con `source: "ia"`, `kind` y `phases`. Volver a pedirla **sustituye solo las de la IA**: las del atleta no se tocan;
  - su material queda como el lugar **«Casa»** (activo);
  - el plan se recoloca: primero usa la rutina de la IA hecha para ese hueco y esa fase y, si no hay, una de la misma zona.
- **Instrucciones de la IA**: estudio §6, §7 y §9.6, más la pirámide de Helms en resumen propio. RPE 7-8 (RIR 2-3) sin fallo; dosis mínima eficaz; unilaterales si hay poco peso; respetar lesiones; descansos por tipo; progresión doble; 4-7 ejercicios y 30-50 min.
- **Modelo**: `OPENROUTER_STRENGTH_MODEL` (por defecto `openai/gpt-4o`), más capaz que el de los reajustes (`gpt-4o-mini`). Unos céntimos por petición. La página tiene `maxDuration = 180` porque puede tardar un minuto.
- En local no hay clave de OpenRouter: la respuesta real de la IA solo se puede probar en producción. La validación está cubierta con tests.
- **Primer intento en producción: error 402 de OpenRouter** («requested up to 16384 tokens, but can only afford 3673»). Sin `max_tokens`, OpenRouter reserva el máximo del modelo, y la cuenta tenía poco saldo. Arreglos:
  - `chatJson` manda `max_tokens` (3.500 por defecto);
  - `equipmentFromText` lee el material escrito (mancuernas, kettlebell, cinta o banda, barra de dominadas, banco, cajón, gimnasio…) y solo se manda a la IA lo que se puede hacer con él. La lista de ejercicios pasa de ~50.000 a ~16.000 caracteres (212 ejercicios con el material de David). Ese material se suma al que entienda la IA;
  - si no hay saldo para `gpt-4o`, se reintenta con `gpt-4o-mini` (unas 16 veces más barato). Si tampoco llega: «Tu cuenta de OpenRouter no tiene saldo suficiente…». El entrenador diario también muestra ese aviso en lenguaje claro.
  - Coste aproximado por petición: ~5 céntimos con `gpt-4o`, ~0,3 con `gpt-4o-mini`.

## Fotos de los ejercicios propios y rutinas de la IA en planes antiguos
*2026-10-10*

- Los 20 ejercicios de corredor no tenían foto (salía un emoji). Ahora usan la **foto de un ejercicio parecido** del catálogo (`imgFrom` en `extra.json`, que pasa a `imgId` en el catálogo). Ejemplos: peso muerto rumano a una pierna con mancuerna → el de kettlebell; pogo → salto cohete; Copenhague → plancha lateral. Lo mismo para dos ejercicios de kettlebell del catálogo sin foto. En la ficha se avisa: «Foto de un ejercicio parecido».
- Solo queda uno sin foto (halo con kettlebell). Los que no tienen foto, y los ejercicios propios, llevan un **icono dibujado** según el tipo (pesa, rayo, estiramiento, corazón) en vez del emoji. La gráfica vacía de las rutinas también.
- **Las rutinas de la IA no entraban en el plan de David**: su plan es anterior a los tipos de fuerza y sus sesiones no tenían `strengthKind`, así que se quedaban en «Fuerza general». Ahora `applyStrengthRoutines` les asigna el tipo por orden en la semana (con 2: pierna y superior; con 3: pierna, posterior y superior) y reciben las rutinas.
- **Tarjeta del plan en marcha rediseñada**:
  - ancho máximo (en el ordenador se estiraba a lo ancho);
  - barra de avance por semanas, con un tramo por semana y siempre visible;
  - cuatro cajas con borde: cumplimiento, tiempo previsto, VDOT y km del plan;
  - al pasar el ratón, borde naranja (el cambio de fondo hacía desaparecer las cajas).

## Progresión doble y récords de fuerza
*2026-10-10*

- David comprobó las fases 2, 3, 4.1 y 4.2 y quiso seguir con 4.3 tal como se propuso.
- **Progresión doble** al empezar un entreno (`nextTarget` en `strength/workouts.ts`), mirando la última vez que hiciste cada ejercicio:
  - si llegaste al **tope del rango en todas las series efectivas** → sube el peso y vuelve al mínimo de repeticiones;
  - si no → mismo peso y una repetición más;
  - el rango sale de la nota «Rango 8-12» (la ponen las rutinas de la IA) o de las repeticiones de la rutina: +2 si son 6 o menos (fuerza), +4 si son más (p. ej. 8 → 8-12);
  - cuánto sube: 2,5 kg (barra, máquinas, lastre), 2 kg (mancuernas), 4 kg (kettlebell);
  - sin peso (peso corporal sin lastre): una repetición más;
  - si la rutina ya pide más peso que el que hiciste, manda la rutina.
  - Se ve como texto bajo cada ejercicio («↑ Sube a 65 kg…» en naranja) y como valores en gris; al marcar ✓ sin escribir se apunta eso.
- **Récords** (`strengthRecords`): más peso (o lastre) que nunca en un ejercicio; sin peso, más repeticiones en una serie. La primera vez que haces un ejercicio no cuenta. Sale la etiqueta 🏆 «Récord en Sentadilla» (o «3 récords de fuerza») en la sesión y en el feed, y en el detalle «🏆 Récord: 62.5 kg (antes 60 kg)» junto al ejercicio. Así, al subir de peso con la progresión, sale récord.

## Sin emojis y app más rápida
*2026-10-10*

- David quiere la app **sin emojis** y lo más rápida posible. El resto de 4.3 (página de progreso por ejercicio, mapa de músculos, medidas, discos) queda aparcado.
- **Emojis → iconos SVG** dibujados en el mismo estilo que el menú (`src/components/icons.tsx`, `Icon` + `ICON_PATHS`):
  - deportes en la lista de actividades, etiquetas de sesión, logros, botones (pausa, reproducir, descanso), marcadores del mapa de la carrera;
  - donde el icono no aportaba nada, solo texto: sensaciones («Muy fácil»…), material, banderas de las carreras (ahora el país en texto), «Ajustar con IA»;
  - los títulos de planes ya guardados con 🏁 o 🏃 se limpian al leer los datos (`parseDb`), y a las dos IA se les pide «sin emojis».
- **Rendimiento** (medido en un servidor de producción local con un año de datos: el servidor responde en 15-90 ms, así que el cuello está en lo que se descarga y en la distancia):
  - **Recharts fuera**: las gráficas son SVG propio (`charts.tsx`, mismas funciones y tooltips al tocar). Eran unos 400 KB de JS (≈110 KB comprimidos) que el iPhone tenía que descargar y ejecutar en Inicio, Perfil, Estadísticas y las rutinas.
  - **Lista de ejercicios en el JS**: los 896 ejercicios iban dentro de cada página de Ejercicios, Entreno y editor de rutinas. Ahora van en un archivo JS (`summaries.json`, lo genera `build-exercises.mjs`) que el service worker guarda en caché; en cada página solo viajan los ejercicios propios. Ejercicios: 211 → 66 KB; Entreno: 183 → 39 KB. En el entreno, la lista ya no se recalcula cada segundo con el reloj.
  - **Caché de navegación de 30 s** (`staleTimes.dynamic`): volver a una pestaña vista hace poco es instantáneo. Todas las acciones que guardan refrescan, así que no se ven datos viejos.
  - **Precarga de páginas en el service worker** (navigation preload): la página se pide sin esperar a que arranque el service worker.
- **Pendiente con más impacto**: Vercel y Upstash están en **iad1 (Washington)** y David usa la app desde España: cada petición cruza el Atlántico (~100 ms ida y vuelta, varias por página). Moverlo a Europa (Vercel `fra1`/`cdg1` + base nueva de Upstash en Europa y copiar los datos) lo notaría mucho. Necesita hacerlo David en los paneles. **Descartado (2026-10-10):** al crear la base en Frankfurt desde Vercel solo salían planes de pago (Pay As You Go o fijos) y David prefiere seguir con la actual, que es gratis.

