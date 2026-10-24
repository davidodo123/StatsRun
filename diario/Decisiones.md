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

## Progreso por ejercicio
*2026-10-10*

- Va en la **ficha de cada ejercicio** (`/fuerza/ejercicios/[id]`), arriba, solo si lo has hecho alguna vez. Se llega desde el entreno, la sesión o el buscador.
- **Cajas**: 1RM estimado (Epley, mejor serie de 1-12 repeticiones), más peso (con sus repeticiones), mejor volumen en una sesión y nº de sesiones. Sin peso (peso corporal sin lastre): mejor serie y más repeticiones en una sesión.
- **Evolución**: gráfica con 1RM estimado, más peso, volumen o repeticiones por sesión; periodo de 3 meses, 1 año o todo.
- **Historial**: las 10 últimas sesiones con todas las series efectivas y el 1RM de cada día; trofeo en las que hubo récord.
- Los kilos se escriben con coma («62,5 kg»), también en los ejes de las gráficas.

## Series por músculo, medidas y discos
*2026-10-10*

- **Series por músculo** (portada de Fuerza, últimos 7 días): 1 serie para cada músculo principal del ejercicio y ½ para los que ayudan, sin calentamientos (`muscleSets`). Barra por músculo hasta 20 series con la franja 10-20 en verde (Helms, para ganar músculo); se aclara que para mantener (lo normal corriendo) basta con en torno a un tercio.
- **Mapa del cuerpo** (`MuscleMap`): dibujo esquemático en SVG, delante y detrás, con cada músculo en naranja más intenso cuantas más series (pleno a partir de 10); lo no trabajado, en gris.
- **Calculadora de discos**: en Calculadoras (peso total + barra de 20, 15, 10 o 7 kg → discos por lado con colores de competición; avisa si no se llega exacto) y, en el entreno, cada ejercicio con barra dice los discos por lado de la próxima serie (barra de 20). Discos: 25, 20, 15, 10, 5, 2,5 y 1,25 kg.
- **Medidas corporales** (`/fuerza/medidas`, botón «Medidas» en Fuerza): peso, % de grasa, cintura, cadera, pecho, brazo y muslo; una entrada por día, todas opcionales; gráfica por medida e historial con borrar. El peso más reciente se copia al perfil (cuenta para los ejercicios con peso corporal y para el plan).

## Superseries, notas y carpetas
*2026-10-10*

- **Notas por ejercicio**: en el editor de rutinas (agarre, asiento, técnica…) y en el entreno, donde salen las de la rutina y se pueden cambiar; se guardan con el entreno y se ven en la sesión.
- **Superseries**: entre dos ejercicios del editor, «Hacer superserie con el siguiente». Los enlazados seguidos comparten número (`superset`) y llevan borde naranja y «Superserie A, B…». En el entreno, al marcar una serie de un ejercicio que no es el último de la superserie no salta el descanso («sin descanso, sigue con el siguiente»); se descansa al acabar la ronda. Una superserie de un solo ejercicio se descarta al guardar.
- **Carpetas**: campo «Carpeta» en la rutina (con las que ya tienes como sugerencia). En Fuerza, las rutinas sin carpeta arriba y luego cada carpeta desplegable con su número. Las rutinas del entrenador IA van a la carpeta «Entrenador IA».

## Chat con el entrenador de fuerza
*2026-10-10*

- Página **Fuerza → Entrenador de fuerza** (`/fuerza/entrenador`): conversación con la IA para pedir rutinas, resolver dudas (progresión, molestias, cómo encajarla con la carrera). Sirve corras o no.
- **Qué sabe de ti** (`chatContext`): perfil (edad, sexo, peso, altura, lesiones, sesiones de fuerza), si corres y tu carrera, tus lugares y material, tus rutinas, lo entrenado en las últimas 4 semanas (sesiones y mejor serie por ejercicio) y tus últimas medidas. Más los últimos 12 mensajes.
- **Rutinas**: solo las propone si se las pides o hacen falta. Se validan igual que las del plan (`exercisesFromAi`, compartida): ejercicios del catálogo que puedes hacer con tu material, rango de repeticiones en la nota para la progresión doble, superseries opcionales. Salen como tarjetas en la respuesta con «Guardar»: van a tus rutinas, carpeta «Entrenador IA», y no se borran al volver a pedirlas (las del plan sí se sustituyen).
- **Prompt**: Helms y Schoenfeld para ganar músculo o fuerza (10-20 series por músculo y semana, 2 veces por semana, 6-15 reps a 1-3 RIR; mantener ≈ un tercio) y las reglas de corredores (Balsalobre, Blagrove, Lauersen). Sin emojis.
- **Modelo y coste**: el de fuerza (`gpt-4o`, con reintento en `gpt-4o-mini` sin saldo). Con gimnasio completo se mandan ~670 ejercicios (≈10 000 tokens, unos 2,5 céntimos por mensaje); con material de casa, ~150 (menos de 1 céntimo). La conversación guarda los últimos 40 mensajes; «Empezar una conversación nueva» la borra (las rutinas guardadas se quedan).
- En local no se puede probar la respuesta real (no hay clave de OpenRouter); probado con una conversación de ejemplo y el guardado de rutinas.

## Batería de pruebas completa
*2026-10-10*

David pidió probar «todos los casos posibles». Tres capas:

1. **Tests de la lógica (Vitest): 96 → 236.**
   - `basics.test.ts`: fechas (meses, años, bisiestos, cambio de hora), formatos, fisiología (VDOT ida y vuelta, zonas, IMC, calor, desnivel), semáforos de carga, importación (deporte por nombre, no duplicar la misma sesión por dos vías) y sesión firmada (tokens manipulados, caducados o mal formados).
   - `planFuzz.test.ts`: **120 combinaciones** de nivel, distancia, semanas hasta la carrera, días disponibles, día de tirada, fuerza 0-4 y día de inicio. En todas: carrera el último día y una vez, nada en el pasado, una sesión de carrera por día y solo en sus días, fuerza ≤ lo pedido y nunca la víspera de la carrera, la de pierna no la víspera de la tirada si había otro día, tirada larga +10 % como mucho, el afinamiento no carga más que la semana más dura, ninguna sesión vacía.
   - `robustness.test.ts`: datos basura o malintencionados del navegador (rutinas, entrenos) y respuestas de la IA mal formadas; cálculos con cero actividades.
2. **Recorrido en Chrome** de 41 páginas × 3 vistas (móvil claro, móvil oscuro, ordenador) con un usuario completo (un año de demo, carrera con mapa, fuerza, rutinas con carpeta y superserie, medidas, plan anterior, chat), más usuario vacío, sin sesión y enlaces que no existen. Se mira: estado HTTP, errores de JavaScript, peticiones fallidas, desborde horizontal e imágenes rotas.
3. **Flujos de uso** (rellenar y pulsar como una persona, y comprobar lo guardado): registrar (y validaciones), editar y borrar, entreno en vivo hasta guardar, editar/duplicar rutinas y quitar superserie, medidas, material, ejercicio propio, perfil, generar plan de una carrera (archiva el anterior), y con la **IA real**: chat de fuerza, fuerza con IA del plan y ajuste diario.

**Fallos encontrados y arreglados:**
- `parseTime` aceptaba tiempos negativos («-5») y segundos ≥ 60 («45:75»).
- **Afinamiento más duro que el pico**: si ya corrías más de lo que pide la distancia, la primera semana partía de tu volumen (p. ej. 90 km) y el afinamiento se calculaba sobre él (77 km frente a 55 de pico). Ahora el volumen no pasa del pico del plan.
- **Tirada larga del afinamiento** calculada sobre tu tirada más larga *antes* del plan (20 km) y no sobre la del plan (10 km): saltaba a 18,5 km la semana antes de la carrera. Ahora baja desde la más larga del plan.
- **«Tirada larga 0 km»** en la semana de la carrera de algunos planes cortos: ahora ese día es un rodaje suave.
- **Fuerza de pierna el domingo antes de una tirada larga el lunes**: la fuerza solo miraba su semana; ahora tiene en cuenta los días clave del principio de la siguiente.
- **Los formularios se vaciaban tras un error** (React 19 limpia `<form action>` al acabar, también si vuelve con error): se perdía lo escrito (nombre, sensaciones, material para la IA…). Nueva función `keepForm` en todos los formularios con texto; Registrar y Medidas se limpian solo tras guardar bien.
- Respuestas de la IA nulas o con tipos raros podían romper el chat, la fuerza con IA o el ajuste diario: protegidas.
- Faltaban `favicon.ico` (404 en cada visita) y páginas propias de **404** («No lo encontramos», en español y con el estilo de la app) y de **error** («Algo ha fallado» + Reintentar).
- La IA (con el modelo barato) proponía rutinas de 3 ejercicios: el prompt exige ahora 5-7 (sale con 4-5 con `gpt-4o-mini`).

**Visto y correcto:** todas las páginas sin errores de JavaScript ni desbordes en móvil; sin sesión todo lleva a «Entrar»; no se guarda nada con fecha futura (el navegador lo impide y el servidor también). Las páginas de algo que no existe responden 200 con el 404 dentro (es lo normal en Next cuando ya empezó a enviar la página).

**Pendiente de David:** la cuenta de OpenRouter no tiene saldo para `gpt-4o` (la app cae a `gpt-4o-mini`, que funciona). Y conviene revocar la clave de local que se pegó en el chat.

## Usuarios que solo hacen fuerza
*2026-10-10*

- Nuevo dato del perfil **«¿Qué entrenas?»** (`focus`): «Correr y fuerza», «Solo correr» o «Solo fuerza». Sin indicar cuenta como los dos, así que los perfiles que ya existían (el de David) no cambian.
- **Alta**: la portada sin perfil ofrece «Quiero correr» y «Solo quiero hacer fuerza» (abre el perfil con «Solo fuerza» marcado). Con solo fuerza el formulario no pide experiencia corriendo, km, tirada ni días de carrera: solo datos físicos, lesiones y **días de fuerza por semana (1-6)**, que sirven de objetivo semanal. Los datos de correr que hubiera se conservan por si vuelve a correr.
- **Inicio**: con solo fuerza, la portada de Fuerza con «Hola, …» (componente `StrengthHome`, el mismo que `/fuerza`).
- **Menú** (`AppNav` lee el perfil en el servidor): con solo fuerza desaparecen Plan, Carreras y Estadísticas; la barra de abajo es **Fuerza · Entrenador · Entrenar (naranja, empieza un entreno) · Perfil · Más** (Amigos, Calculadoras, Registrar actividad, Datos). Se resalta la entrada más concreta (en `/fuerza/entrenador`, «Entrenador» y no «Fuerza»).
- **Perfil**: sin las pestañas Resumen y Running; abre en Fuerza; la cabecera muestra entrenos, toneladas movidas y horas en vez de km, carreras y VDOT.
- Probado con un alta real en el navegador (formulario, Inicio, menú, perfil y vuelta a «Correr y fuerza») y recorriendo sus páginas en móvil y ordenador; el usuario de los dos sigue igual.

## IA que aprende de ti
*2026-10-10*

David preguntó si se puede «entrenar» una IA para la app. Opciones: (1) instrucciones y contexto (lo que ya hacía), (2) **ejemplos y memoria**, (3) fine-tuning (cientos de ejemplos revisados; no compensa sin ese conjunto de datos). Eligió la 2, en bloques.

**Bloque 1 · Valoraciones y memoria**
- **Pulgar arriba / abajo** (iconos, sin emojis) en las tres IA: el ajuste del plan (tarjeta «Entrenador IA»), «Fuerza con IA» y cada respuesta del chat. Con pulgar abajo pide «¿Qué no te ha gustado?» y ese motivo pasa a ser una **preferencia**. Cada valoración se guarda con una copia de la respuesta (`aiFeedback`, últimas 200): servirán de ejemplos buenos y malos en el bloque 2 y, si algún día se hace fine-tuning, de conjunto de datos.
- **«Lo que la IA sabe de ti»** (`aiPreferences`, máx. 40, sin repetir): en la página del entrenador y en Perfil → Editar; se pueden añadir a mano (para todas, solo plan o solo fuerza) y olvidar.
- **El chat aprende solo**: si le cuentas algo duradero («odio las zancadas», «tengo barra de dominadas nueva»), lo devuelve en «recordar» y se guarda.
- Las tres IA reciben sus preferencias (`preferencesFor`) con la regla de respetarlas siempre salvo por seguridad (dolor, enfermedad, fatiga).
- Probado con la IA real: el chat apuntó «No quiere zancadas» y la rutina de pierna siguiente salió sin zancadas. Con el modelo barato respeta lo explícito («no quiero X») pero no siempre deduce («entreno en casa» → siguió usando material del gimnasio): de eso se encargan los ejemplos del bloque 2.
- El chat ya no repite en el texto la lista de ejercicios que sale en la tarjeta de la rutina.

**Bloque 2 · Ejemplos** (*2026-10-11*)
- **Ejemplos escritos a mano** en las instrucciones de cada IA (orientativos, «no los copies»):
  - ajuste del plan: un resumen que cita lo que dijo el atleta y cambia solo lo necesario;
  - fuerza del plan: una rutina de pierna buena (6 ejercicios: multiarticular, unilaterales, gemelo y sóleo, core; kilos que tiene y rangos);
  - chat: «hoy en casa con mancuernas» → solo mancuernas y peso corporal y nada que recordar (es solo hoy); una pregunta suelta → breve y sin rutinas; una lesión → se recuerda.
- **Tus valoraciones como ejemplos** (`ratedExamples`): cada IA recibe las dos últimas respuestas suyas que te gustaron («imita su tono y detalle») y las dos que no, con el motivo («no repitas ese error»).
- **El material del mensaje manda** (`chatEquipment`): si en el chat dices «en casa» (o el nombre de uno de tus lugares), «sin material», «en el gimnasio» o nombras material («solo una kettlebell y bandas»), la lista de ejercicios que recibe la IA ya viene filtrada y se le dice por qué. No depende de que el modelo lo deduzca. «Casado» no cuenta como «casa».
- Probado con la IA real (`gpt-4o-mini`): con gimnasio apuntado y «hoy en casa con mancuernas de 10 kg» propuso sentadilla con mancuernas, peso muerto rumano a una pierna, puente de glúteo y gemelo, y no lo guardó como preferencia; a «¿cada cuánto subo peso en press banca?» respondió breve y sin rutinas. Con el modelo barato aún repite a veces en el texto la lista de ejercicios.

**Bloque 3 · Consulta del Estudio** (*2026-10-11*)
- [[Estudio entrenamiento]] se trocea en apartados (`scripts/build-knowledge.mjs` → `src/lib/knowledge/estudio.json`, 19 apartados). Se ejecuta solo antes de cada build (`prebuild`, también en Vercel) y al arrancar en local (`predev`): **basta con editar el estudio en Obsidian y subirlo**. Si el archivo no está, se mantiene el último troceado. Se quitan las gráficas, los emojis y los enlaces de Obsidian; la sección «Fuentes» no se manda.
- **Buscador** (`searchStudy`): por palabras con raíces cortas («doler»/«dolor»), sinónimos de cómo habla el atleta («me duele la rodilla» → semáforo de dolor; «reventado» → fatiga y sobreentrenamiento; «la carrera» → afinamiento; «series», «sentadilla» → Helms) y ajuste por longitud como BM25 (si no, el apartado de Helms, el más largo, salía en todo). Como mucho 2-3 apartados y ~3.500 caracteres; lo que puntúa por debajo del 45 % del mejor no se manda.
- **Qué consulta cada IA**:
  - chat: tu mensaje y el anterior;
  - fuerza del plan: «fuerza para corredores» + lo que sabes hacer + tus lesiones;
  - ajuste del plan: el diagnóstico (veredicto y motivos), enfermedad, si la carrera está a menos de 3 semanas y lo que escribiste en tus sensaciones de los últimos 7 días.
- Regla común: si un apartado trae una regla concreta para el caso (semáforo de dolor, tope de la tirada, regla del cuello…), la IA la aplica tal cual y la nombra. La regla de molestias del chat se alineó con el semáforo (antes decía «no cargues la zona»).
- Probado con la IA real: «me duele la rodilla un 4 sobre 10…» → «Según el semáforo de dolor, con un 4, puedes entrenar pero sin subir la carga y con variantes que no duelan…». Antes de ajustar la regla no lo citaba.

## VFC, pulso en reposo y sueño
*2026-10-11*

- El atajo de Salud puede mandar tres datos más: **`vfc`** (ms), **`pulsoReposo`** (ppm) y **`sueno`**. También valen en inglés (`hrv`, `restingHr`, `sleep`). El sueño vale en horas, minutos o segundos (la app lo detecta por el tamaño) y 0 h cuenta como «sin registro». Rangos: VFC 5-300 ms, pulso 25-130 ppm, sueño 0-16 h. Un envío solo con estos datos, sin pasos, también sirve.
- **Alertas frente a tu propia línea base** (`recoverySignals`, 30 días; necesitan al menos 14 días de datos para no saltar en falso):
  - **sueño corto**: menos de 6,5 h de media las 3 últimas noches (Milewski 2014 asocia < 8 h con más lesiones; 6,5 h como umbral práctico);
  - **pulso en reposo alto**: 5 ppm o más sobre lo normal, de media en 3 días;
  - **VFC baja**: la media de 7 días por debajo de tu rango normal (media − 1 desviación típica, como Plews 2013). Un día bajo no cuenta.
- **En el diagnóstico**: sueño corto = mal descanso; pulso alto o VFC baja = rendimiento a la baja (fatiga). Llevan a mantener o descargar como si lo hubieras escrito, con los números en los motivos («Duermes poco: 5,6 h de media…»). La IA diaria los recibe por día y con la línea base (`recuperacionSalud`), con la regla de citarlos.
- **Perfil → Salud** (antes «Pasos y calorías»): tres cajas con su estado y gráficas de 30 días de sueño, pulso en reposo y VFC. La guía del atajo tiene un apartado opcional «Recuperación (con Apple Watch)», sin capturas porque no se pueden hacer desde aquí.
- **Pendiente de David**: añadir esas acciones al atajo. Si algún paso no aparece igual en su iPhone (sobre todo el del sueño), ajustar la guía con capturas.

## Atajo de pasos con 7 días
*2026-10-11*

- **Problema**: el atajo mandaba solo el día de hoy. iOS no deja leer Salud con el iPhone bloqueado, así que la automatización de las 23:50 a veces falla, y ese día se perdía salvo que David lo pulsara a mano.
- **Solución**: cada envío lleva **los últimos 7 días**. En Atajos, «Buscar muestras de salud» con *está en los últimos 7 días* y **Agrupar por: Día**; luego «Obtener detalles» → *Fecha de inicio* y *Valor*, sin bucles. El cuerpo JSON lleva listas: `fechasPasos`, `pasos`, `fechasKcal`, `kcalActivas` (también vale una sola lista `fechas`). Un día que llega otra vez se actualiza; los que no llegan se conservan.
- **Fechas**: la app entiende las de Atajos en cualquier formato (`parseHealthDate`): «2026-10-11», ISO con zona (pasada al día de España: «2026-10-10T22:00:00Z» es el 11), «11/10/2026», «11 oct 2026, 0:00», «11 de octubre de 2026», «Oct 11, 2026». Si no entiende una, el atajo responde cuál.
- **Dos automatizaciones**: a las 23:50 y al **desconectar el cargador** por la mañana (cuando se coge el iPhone desbloqueado). Con 7 días por envío no se pierde ninguno aunque fallen varias seguidas.
- Los valores sueltos (VFC, pulso, sueño de hoy) pueden ir junto a las listas. La respuesta del atajo dice qué días ha guardado.
- Probado contra la API local con un cuerpo como el de Atajos: 6 días guardados, el que no venía se conserva.
- Guía de Perfil → Salud reescrita. Se quitaron las 4 capturas que ya no correspondían (pasos, variable, calorías y envío); quedan las de «Obtener contenido de URL», el resultado y la automatización.

## La IA no quita días de entreno
*2026-10-11*

- **Problema** (captura de David): la semana del 12 al 18 de octubre empezaba el miércoles; faltaban el lunes y el martes, y las sesiones ponían «Ajustada por IA: mantener la carga suave para evitar sobrecarga». El planificador sí ponía los 5 días; era el ajuste diario de la IA el que quitaba sesiones (`remove`) aunque el diagnóstico era «mantener». Antes se le permitía «si la semana queda sobrecargada».
- **Arreglo en el código** (no solo en el prompt): solo se aplica un `remove` si el diagnóstico es «descargar» o «recuperar». Con «progresar» o «mantener», la sesión se queda tal cual. En el prompt: si hay que bajar carga, que acorte o suavice la sesión, nunca la quite.
- Para recuperar los días que ya quitó, basta con pulsar «↻ Adaptar con mis datos» en el plan: se rehace con los días de su perfil y la IA ya no puede quitarlos.

## Temporada con varios objetivos
*2026-10-11*

- Además de las carreras B (a tope) y C (como entreno), ahora hay **A · Otro objetivo**: una carrera tan importante como la principal, **antes o después** de ella (antes las secundarias solo podían ir antes). Se añade en Plan → Temporada → «Añadir carrera».
- **Plan por tramos** (`generateSeason`): un tramo completo por cada carrera A (construcción + afinamiento), luego **recuperación sin plan** (un día por cada 3 km, como las B: 7 días tras una media, 14 tras un maratón) y el siguiente tramo parte de la forma con que se acabó el anterior (VDOT final, 70 % del volumen pico, 80 % de la tirada más larga). Las semanas se juntan seguidas; la de recuperación sale como «Recuperación tras …» sin sesiones. Las B y C se colocan después dentro del plan, como antes, siempre antes del último objetivo.
- El plan se llama con todas sus carreras («Villa Romana de Salar + Maratón de abril», `planTitle`) y la tarjeta Temporada las lista en orden con la principal y las A destacadas.
- Probado en el navegador: con Villa Romana (25 nov) como principal y un maratón el 18 de abril como A salieron 27 semanas seguidas: afinamiento hasta el 25 de noviembre, semana suave, construcción completa con sus descargas y afinamiento hasta el 18 de abril. Tests: las dos carreras dentro, afinamiento en cada una, 7 días sin plan tras la media, semanas sin huecos ni ids repetidos, y con un solo objetivo el plan es idéntico al de siempre.

## Carreras de Cruzando la Meta
*2026-10-11*

- **La web**: cruzandolameta.es (cronometraje, sobre todo Andalucía). Lista de próximas en `/carreras/proximas/` (por páginas; pasada la última responde 404) y ficha por carrera en `/ver/<nombre>---<número>/` con distancias, hora, tipo, localidad, lugar de salida, coordenadas (Google Maps), plazo de inscripción, web oficial y **Descargas** (normativa en PDF y, en algunas, el recorrido en GPX/KMZ). Las ya celebradas redirigen a sus clasificaciones. No tiene `robots.txt` que lo prohíba.
- **Cómo se lee** (`cruzandolameta.ts` interpreta el HTML, `cruzandolametaStore.ts` descarga y guarda): como mucho **cada 12 horas**, en segundo plano al entrar en Carreras (`after`), de dos en dos con pausas y con un User-Agent que dice quién es. Se guarda para todos los usuarios (`statsrun:db:carreras-cm`), hasta 9 meses vista. Si su web falla se mantiene lo anterior. Los recorridos solo se descargan de su propio dominio y con tope de 4 MB.
- **En la app**:
  - Carreras → «Próximas carreras · Cruzando la Meta»: tarjetas con cartel, fecha, lugar, distancias y tipo; filtro por provincia; por defecto solo carreras a pie (se pueden ver también bici, natación, triatlón e infantiles).
  - `/carreras/cm/<número>`: datos, cartel, enlaces (ficha e inscripción, web oficial, descargas, salida en el mapa) y **Preparar esta carrera** con el formulario ya rellenado (nombre, fecha y sus distancias).
  - Al generar el plan, si publican el recorrido se descarga y se carga solo en el objetivo (mapa, distancia y desnivel si el archivo lo trae).
- Probado con su web real: 18 próximas carreras, todas con coordenadas, 7 con descargas y 3 con recorrido. Con la XV Prueba de Fondo «Villa Romana de Salar» (10K, 15 de noviembre) se creó el objetivo, el plan y el recorrido (9,9 km; ese GPX no trae alturas).
- **Ojo**: el plan de David tiene «Villa Romana de Salar» como media maratón el 25 de noviembre; según Cruzando la Meta es un 10K el 15 de noviembre. Se le avisa.

## Tirar para actualizar y aviso de versión nueva
*2026-10-11*

- En el iPhone instalado (pantalla completa) no existe «tirar para actualizar» y, para coger una versión nueva, había que cerrar la app y volver a abrirla.
- **Tirar hacia abajo** (`AppUpdates`): estando arriba del todo, al arrastrar hacia abajo sale «Tira para actualizar» y, pasados 80 px, «Suelta para actualizar»; al soltar se recarga la página (el service worker pide siempre la página a la red, así que llega lo último). No se activa dentro de ventanas, campos de texto ni listas que se deslizan, ni si el gesto es más de lado que hacia abajo.
- **Aviso de versión nueva**: la app sabe con qué versión se abrió (`VERCEL_GIT_COMMIT_SHA` de su despliegue) y pregunta a `/api/version` (pública, sin caché) cuál está publicada: al abrir, al volver a la app y cada 10 minutos. Si es otra, sale arriba el botón «Hay una versión nueva · Actualizar». En local la versión es «dev» y no avisa.
- Probado en Chrome simulando el dedo: el gesto recarga; y con el servidor respondiendo otra versión, al volver a la app sale el botón.
- **Ajuste al montarlo con David** (*2026-10-11*): en Atajos es más fácil poner las listas en campos de tipo **Texto** que de tipo Matriz. Con una variable de lista en un campo de texto, Atajos manda los elementos **uno por línea**; la app ahora los separa (antes juntaba los números de toda la semana en uno gigante y daba «Pasos fuera de rango: 2,07e+35»). Un número suelto junto a las listas sigue contando como el valor de hoy. La guía de Perfil → Salud dice ahora «Texto».
- Al probarlo: Atajos manda las calorías con **punto decimal** («269.714» = 269,7 kcal) y la app lo leía como miles (269.714 kcal → «fuera de rango»). Ahora, si leer el punto como de miles da un valor imposible para ese dato (más de 20.000 kcal, 300 ms de VFC…), se lee como decimal. Los pasos con punto de miles («9.120») siguen igual.
- **Funcionando** (2026-10-11): «8 días guardados (del 2026-10-04 al 2026-10-11)». Hay que borrar la acción final «Mostrar contenido» del atajo para que las automatizaciones no saquen una ventana.

## Pasos y calorías por meses
*2026-10-11*

- Perfil → Salud → tarjeta **«Este mes»** (`monthlyHealth`): media diaria de pasos (y cuánto sube o baja frente al mes anterior), total del mes, días de 10.000 pasos o más, mejor día; gráfica de la media de pasos mes a mes y tabla de los últimos 12 meses (media/día, días de 10.000+, total y kcal activas por día).
- Los días a 0 (sin registro, por «Completar las que faltan» del atajo) no cuentan para las medias.
- Para rellenar los meses anteriores: cambiar una vez en el atajo «últimos 7 días» por 365, ejecutarlo y volver a 7 (la app guarda 400 días).

## Refrescar antes de redirigir
*2026-10-11*

- Las acciones que guardan y luego llevan a otra página (`redirect`) no refrescaban la caché del navegador: con `staleTimes.dynamic: 30`, la página de destino salía con lo de antes durante 30 s (por eso «Borrar del historial» parecía no hacer nada). Ahora todas llaman a `refresh()` justo antes del `redirect`.

## Deshacer «No puedo ese día»
*2026-10-11*

- Al marcar un día (o un rango) sin poder entrenar se guarda una copia del plan y de los días bloqueados de antes (`lastSkip`). Sale un aviso «Marcaste el … como día sin poder entrenar · Deshacer» en Inicio, Plan y Perfil hasta el día siguiente; «Deshacer» devuelve el plan y los días tal como estaban.
- Si el plan se rehízo después (otro objetivo, «Adaptar con mis datos»), el aviso ya no sale: la copia sería de otro plan.
- La IA que reajusta en segundo plano descarta su respuesta si mientras pensaba cambiaron los días sin entrenar, para no volver a meter el cambio deshecho.

## Fuerza por grupos
*2026-10-11*

- Lo pidió David: con fuerza «por grupos» (lunes pecho, martes espalda, miércoles pierna) quiere un día sin correr entre semana; con fuerza general (cuerpo entero, poca fatiga), correr todos sus días.
- Perfil → «Tipo de fuerza» (`strengthStyle`: general o grupos; sin indicar, general).
- Por grupos, el **día de pierna** es el día disponible dos días antes de la tirada larga (o el más lejano a ella) y ese día **no se corre**; las de tren superior van seguidas en los días anteriores. Con 2 días: superior + pierna; con 3: pecho, espalda, pierna; con 4: + hombro. Con 3 días disponibles o menos se corre en todos.
- En afinamiento (1 sesión, activación) y semana de carrera se vuelve a correr todos los días.
- Plantillas nuevas: «Pecho y tríceps», «Espalda y bíceps», «Hombro y brazos», con series según la fase (3 × 8-12 en base, 4 × 6-8 en construcción, 2 × 6-8 de mantenimiento).
- Las rutinas propias van a su día por el músculo principal (una de pecho nunca cae el día de espalda). La IA del día a día no puede mover carreras al día de pierna, y la IA de fuerza conoce los tipos nuevos.

## iPhone por enlace, Android por Play Store
*2026-10-12*

- El App Store cuesta 99 €/año: David no lo quiere. Para él y sus amigos (todos con iPhone), la app sigue siendo la web instalada desde Safari, con el atajo para la salud.
- Para que sus amigos no tengan que montar el atajo a mano: atajo compartido por enlace de iCloud y, en la app, botones para copiar la clave e instalarlo.
- Android: app en Google Play (25 $ una vez) con Capacitor (la misma app dentro) y Health Connect, que lee la salud sin atajos.

## Copias de seguridad
*2026-10-12*

- Cada noche (cron de Vercel, `0 3 * * *` UTC) `/api/cron/backup` copia todas las claves `statsrun:*` de Redis (usuarios, datos de cada uno, fotos, claves del atajo…; sin los contadores `:v`), las comprime (gzip) y las cifra con AES-256-GCM (`BACKUP_SECRET`).
- Se suben a un repo **privado** de GitHub: `diarias/AAAA-MM-DD.rio` (se borran a los 30 días) y `mensuales/AAAA-MM.rio` (la del día 1, se borran a los 12 meses, para que lo que alguien borra no se quede para siempre; así lo dice la política de privacidad). Ojo: el historial de git conserva también las borradas; si algún día hace falta borrarlas de verdad, hay que reescribir el historial del repo de copias.
- La ruta solo responde con `Authorization: Bearer CRON_SECRET` (Vercel la manda sola si existe la variable).
- Variables en Vercel: `BACKUP_SECRET`, `CRON_SECRET`, `GITHUB_BACKUP_TOKEN` (token de grano fino, solo «Contents: lectura y escritura» en ese repo), `GITHUB_BACKUP_REPO` (`usuario/repo`). Nunca en el diario.
- **Sin `BACKUP_SECRET` las copias no se pueden abrir**: guardarla también fuera de Vercel (gestor de contraseñas).
- Restaurar: `scripts/backup-restore.mjs` (resumen, `--json` para verla descifrada, `--restaurar [--solo clave]` para escribirla en Redis).

## App de Android con Capacitor
*2026-10-12*

- Capacitor 8 (`capacitor.config.ts`): id `app.runinout`, carga la web de Vercel (`server.url`), así cada despliegue llega también a la app sin publicar otra versión. `capacitor-web/index.html` es solo la pantalla «Sin conexión».
- La carpeta `android/` es el proyecto nativo (se sube a git; lo compilado no).
- Compilar: Android Studio trae Java 25 y el Gradle de Capacitor solo llega a Java 24, así que se usa un **JDK 21** aparte (`%LOCALAPPDATA%\jdk21`, puesto en `~/.gradle/gradle.properties` → `org.gradle.java.home`). `cd android && gradlew assembleDebug`.
- Probado en el emulador «Medium Phone» (Android 17): abre la pantalla de Entrar.

## Entrar con Google desde la app de Android
*2026-10-12*

- Google no deja iniciar sesión dentro de la vista web de una app. En la app (`NativeBridge`), «Continuar con Google» se abre en el navegador del sistema (`@capacitor/browser`) con `/api/auth/google?app=<reto>`.
- Al volver de Google, el callback no abre la sesión en el navegador: devuelve una página que abre `app.runinout://auth?code=…` (código firmado, 2 min). La app lo recibe (`@capacitor/app`, `appUrlOpen`) y va a `/api/auth/app?code=…&v=<verificador>`, que abre la sesión dentro de la app.
- Como PKCE: el reto es el sha256 de un verificador que nunca sale de la app; si otra app del móvil captara la vuelta, el código no le serviría.
- En la web no cambia nada.

## Health Connect en la app de Android
*2026-10-12*

- Complemento `@capgo/capacitor-health` 8.11.4. Solo **lectura** de 5 datos: pasos, calorías activas, pulso en reposo, VFC y sueño. El complemento declara ~50 permisos (leer y escribir de todo): se quitan en `AndroidManifest.xml` con `tools:node="remove"`, porque Google Play revisa y hay que justificar cada permiso de salud. `minSdk` 26 (Android 8), el mínimo de Health Connect.
- Al abrir la app y al volver a ella (como mucho cada 30 min) lee los últimos 7 días, día a día, y los manda con la sesión (acción `saveHealthFromApp`, mismo formato `{dias: […]}` que el atajo). El sueño cuenta para el día en que te despiertas y, si hay fases, sin «despierto» ni «en la cama».
- Perfil → Salud en Android: tarjeta «Health Connect» (conectar, sincronizar ahora, permisos) y se oculta la guía del atajo del iPhone (`html[data-native=android]`).
- Política de privacidad: Health Connect, fotos, la IA recibe un resumen de recuperación, copias en GitHub. La pantalla de permisos enlaza a `/privacidad`.
- Copias mensuales: ahora se borran a los 12 meses (antes, nunca).

## Icono y versión para Google Play
*2026-10-12*

- Iconos de Android desde el mismo logo que la web (`scripts/generate-icons.mjs`): icono adaptable (logo blanco en la zona segura sobre naranja #EB6834), icono redondo y cuadrado para Android antiguo, y pantalla de carga con el logo sobre el fondo oscuro #1a1a19.
- Versión para la tienda: `cd android && gradlew bundleRelease` → `app/build/outputs/bundle/release/app-release.aab`, firmado con la **clave de subida** (`~/.android-keys/runinout-upload.jks`, alias `upload`). Contraseña al azar en `~/.android-keys/keystore.properties`, copiada a `android/keystore.properties` (en `.gitignore`, nunca en git).
- **Hay que guardar la carpeta `~/.android-keys` en un sitio seguro** (gestor de contraseñas o copia cifrada). Con «Firma de apps de Google Play», si se pierde la clave de subida se puede pedir a Google que la cambie, pero tarda días.
- Cada versión nueva que se suba a Play tiene que subir `versionCode` en `android/app/build.gradle` (1, 2, 3…).

## Respuesta de «Adaptar con mis datos»
*2026-10-18*

- El botón sí funcionaba: rehace el plan entero con el VDOT y los km de media de ahora, y la IA lo reajusta después en segundo plano. Pero no daba ninguna señal y, si los datos no habían cambiado, el plan salía igual (o perdía un momento los ajustes de la IA hasta que esta volvía a ponerlos).
- Ahora el botón (`AdaptPlanButton`) pone «Adaptando…» y debajo un mensaje: «Plan recalculado: VDOT objetivo 30,4 → 30,0 · 119 → 123 km hasta la carrera · 19 días cambiados» o «Tus datos no han cambiado: el plan sale igual», más «La IA lo está ajustando: en un minuto verás sus cambios» si está activada.
- Los cambios se cuentan desde hoy (`planChanges`), por días con sesiones distintas.
- Sin perfil o sin carrera objetivo, avisa en vez de no hacer nada.

## Desacople aeróbico
*2026-10-18*

- Pa:FC (Friel / TrainingPeaks): eficiencia (velocidad ÷ pulso) de la 1.ª mitad frente a la 2.ª de un rodaje largo. Menos de un 5 % = buena base aeróbica; 5-10 % mejorable; más de un 10 %, la base aún no aguanta esa duración → [[Estudio entrenamiento#9.11 Otras herramientas evaluadas]]
- Solo en carreras de Strava con pulso y **1 h o más** en movimiento. Se quitan los 10 primeros minutos (calentamiento), las paradas y los tramos andando (menos de 1,5 m/s).
- Al sincronizar Strava se piden los datos por segundo (streams) de **5 tiradas como mucho** cada vez, las más recientes primero, porque Strava deja unas 100 lecturas cada 15 min. Las antiguas se van rellenando en las siguientes sincronizaciones. Si una no tiene pulso por segundo, se apunta para no volver a pedirla.
- Se ve en la ficha de la sesión («Desacople aeróbico 6,3 % · Base aeróbica mejorable»). La IA lo recibe en cada actividad y, si es alto, no alarga la tirada larga y mete más rodaje suave. Con desnivel o calor sube solo, sin ser falta de base.
- Las carreras registradas a mano o desde archivo no lo tienen (no traen el pulso por segundo).

## Ideas nuevas: orden y alcance
*2026-10-18*

- Orden: 1) EMOM (pequeño, no depende de nada); 2) compartir el entreno (lo que más se ve entre amigos); 3) chat con la IA más registrar por voz (usan la misma pieza); 4) GPS (lo más grande, con la limitación del iPhone).
- El cuerpo humano para compartir lo dibuja Claude en SVG, con una pieza por músculo para colorearlo (una imagen de Gemini sería un dibujo plano que habría que recortar a mano).
- Voz: con el dictado del teclado del iPhone (funciona en todas partes); un micrófono propio dentro de la web instalada puede fallar.
- GPS: en el iPhone la web instalada deja de recibir la ubicación con la pantalla bloqueada; vale con grabar con la pantalla encendida. En Android (Capacitor) se puede en segundo plano.

## EMOM
*2026-10-18*

- Fuerza → EMOM (`/fuerza/emom`). Se elige cada cuánto (30 s, 45 s, 1 min, 1:30, 2 min o 3 min) y cuántas rondas (hasta 90), y los ejercicios con repeticiones y kilos. Con varios ejercicios se turnan: ronda 1 el primero, ronda 2 el segundo…
- En marcha: 10 s para prepararse, cuenta atrás grande, ejercicio de ahora y el siguiente, pitidos 3-2-1 y uno largo al empezar cada ronda (y vibración en Android), pausa, y la pantalla se queda encendida (Wake Lock). «No llego en esta ronda» o tocar una ronda pasada la marca como no completada.
- En el iPhone los pitidos solo suenan tras tocar la pantalla: se activan al pulsar «Empezar». Si la app se cierra a mitad, al volver sigue donde iba (el tiempo va por reloj, no se pierde), y hay que tocar «Activar los pitidos».
- Se guarda como entreno de fuerza (`workout.emom`: intervalo, rondas y completadas): cada ronda completada es una serie de su ejercicio, así cuenta en volumen, series por músculo, récords, carga, feed y logros. Nombre por defecto: «EMOM 12 min», «E2MOM 20 min»…
- La IA lo ve en el resumen del entreno («11/12 rondas cada 60 s»).

## Compartir el entreno
*2026-10-18*

- **Cuerpo humano nuevo** (`lib/strength/bodyShapes.ts`): figura de delante y de detrás en SVG, con una forma por cada uno de los 17 músculos de la app (pectorales, deltoides, abdominales en bloques y oblicuos, dorsales, trapecio, glúteos…). Se dibuja la mitad izquierda y la derecha es su reflejo. Lo usan el mapa de la portada de Fuerza y la imagen para compartir. David lo dio por bueno «de momento».
- **«Compartir»** en la ficha de cada entreno propio: genera una imagen de historia (1080 × 1920, `/api/compartir/[id]`, con `next/og`) y abre el menú de compartir del móvil (Instagram, WhatsApp…). Si el navegador no puede compartir archivos (ordenador), la descarga.
- Fuerza: el cuerpo con los músculos del entreno en naranja (más intenso cuantas más series; los secundarios cuentan la mitad), los ejercicios (series × repeticiones · mejor peso), tiempo, series, repeticiones y volumen; en un EMOM, también «EMOM 12 min · 11/12 rondas».
- Running: la línea del recorrido sobre fondo oscuro, sin mapa debajo (salida en blanco y llegada en naranja), distancia, ritmo, tiempo y desnivel (o pulso medio). Sin recorrido, la distancia en grande.
- La imagen solo la puede sacar el dueño del entreno (con su sesión); no lleva sensaciones ni notas.

## Entrenador IA
*2026-10-18*

- El chat de fuerza pasa a ser el **Entrenador IA** general (`/entrenador`; `/fuerza/entrenador` lleva allí). Está en «Más» y en la barra de quien solo hace fuerza, y se enlaza desde Fuerza y desde el Plan. Conserva la conversación y la memoria de antes.
- Sabe de running y de fuerza: su perfil, material, rutinas, las sesiones del plan de los próximos 7 días y lo que ha hecho en 14 días.
- Lo que propone se confirma siempre con un botón (la IA nunca guarda nada sola):
  - **Registrar un entreno** que le cuentas («hoy 8 km en 45 minutos, me ha costado», «ayer 4×8 de sentadilla con 70 kg»): tarjeta con los datos y «Guardar entreno». Se comprueba fecha (no futura, como mucho 60 días atrás), rangos y ritmo; si falta el tiempo, pregunta. Fuerza sin tiempo: 4 min por serie.
  - **Rutinas** de fuerza, como antes.
  - **Cambiar el plan**: los días que no puede («la semana que viene solo puedo martes, jueves y sábado», «el jueves no puedo») se sacan del propio mensaje y se marcan como «No puedo ese día» (las sesiones van a sus días disponibles del perfil y sale el aviso de «Deshacer»). Otros cambios («tirada larga más corta») van a la IA del plan con su petición (`adaptWithAI(uid, petición)`), que en ese caso puede quitar sesiones.
- **Voz**: el dictado del teclado vale siempre; además hay un botón de micrófono (reconocimiento de voz del navegador, en español) que solo sale si el navegador lo tiene.
- El modelo barato a veces pone el nombre del ejercicio en vez del id: se acepta el nombre exacto, y «sentadilla», «press de banca» y «peso muerto» van a los básicos con barra.

## Grabar la carrera con el GPS
*2026-10-19*

- Registrar → **Grabar con GPS** (`/registrar/gps`): se elige correr, caminar o bici y empieza. Muestra el estado del GPS (bueno, regular, flojo, con su precisión), cronómetro, distancia, ritmo actual (últimos 30 s), ritmo medio, el dibujo del recorrido y los parciales por km. Pausa a mano y **pausa automática** (parado no cuenta como tiempo en movimiento).
- Filtro de puntos (`lib/gpsTrack.ts`): fuera los de precisión peor de 35 m, los saltos de más de 9 m/s y los que no se mueven (quieto, uno cada 10 s). Tras una pausa, el tramo de la pausa no cuenta. Desnivel con histéresis de 4 m, porque la altura del GPS baila.
- Al guardar, el servidor recalcula distancia, tiempo y desnivel con los mismos puntos (`saveRecordedRun`) y guarda el recorrido simplificado (como los de Strava): sale en el mapa, el flyover, compartir y las estadísticas.
- La grabación va guardándose en el navegador: si se cierra la app, al volver sigue en pausa con lo grabado.
- La pantalla se queda encendida (Wake Lock). En el iPhone la web instalada no recibe la ubicación con la pantalla bloqueada; en Android tampoco de momento (haría falta un complemento de ubicación en segundo plano, y Google Play pide justificar ese permiso): queda como tarea aparte.
- Android: permisos de ubicación añadidos al `AndroidManifest.xml`. Hace falta compilar e instalar una versión nueva de la app para que los pida (subir `versionCode` al subirla a Play).

## Teclado del iPhone y barras fijas
*2026-10-20*

- En el iPhone, al abrir el teclado la parte visible de la página se desplaza y lo fijo no la sigue: la barra de arriba (y la cabecera del entreno) se iba bajo la hora y la de abajo se quedaba flotando en medio, a veces también después de cerrarlo (capturas de David en Perfil → Editar y en el entreno de fuerza).
- `KeyboardFix` (en el layout de la app) mira la parte visible (`visualViewport`): mientras el teclado está abierto, o hay un campo activo, pone `html[data-kb]` y `--vv-top` (cuánto se ha movido). Con eso: la barra de abajo se oculta, la de arriba y la cabecera del entreno bajan con la parte visible (`.vv-top`), y la barra del descanso se esconde (`.hide-on-kb`) y el descanso sale en la cabecera del entreno (`.only-kb`).
- Al cerrar el teclado, un desplazamiento de un píxel hace que el iPhone recoloque lo fijo.

## Menos texto en inicio y plan
*2026-10-20*

- David quiere la app más simple y con menos scroll.
- Inicio: fuera la tarjeta «Recomendaciones» (y `lib/engine/insights.ts`, que solo servía para eso); subtítulos más cortos (forma y fatiga, volumen, predicciones, salud).
- Plan: fuera «Cómo se adapta tu plan», la explicación del entrenador IA, la nota de los ritmos y la leyenda «Altura = km». Los avisos del plan van en un desplegable («N avisos del plan») y las notas técnicas (de dónde sale el VDOT, el volumen de partida…) ya no se enseñan.
- La **Temporada** no se borra: es donde se añaden las carreras B y C. Pasa del plan a la página de Carreras como «Tu temporada» (solo si ya hay carrera objetivo).
- Perfil se queda como está.

## Versión guardada antes de reorganizar
*2026-10-20*

- Etiqueta de git **`v2026-10-20`** (commit `ba52d48`), subida a GitHub: la app tal como estaba antes de la reorganización y el rediseño de la Fase 8.
- Volver a ella si algo sale mal:
  - **La web, al momento**: Vercel → proyecto → Deployments → el despliegue de `ba52d48` → «Promote to Production» (o «Instant Rollback»).
  - **El código**: `git checkout v2026-10-20` para verla, o `git revert` de los commits que sobren para volver sin perder historial.
- Los **datos** no van en git: tienen su copia cifrada cada noche en el repo privado de copias (→ [[#Copias de seguridad]]).

## Rediseño, ronda 1
*2026-10-20*

- Guía: la skill `redesign-existing-projects` (que usa taste-skill, de leonxlnx, MIT) y sus reglas para pantallas de app: sin degradados ni brillos, el color en los datos, menos tarjetas con icono, listas divididas en vez de tarjetas sueltas, cifras tabulares.
- Por primera vez con capturas de la app a 390 px (Chrome sin ventana, con un usuario de prueba con datos demo), antes y después.
- Cambios: **Registrar** es un círculo naranja con «+» (lo pidió David, para ahorrar sitio); las **tarjetas de datos** (`Stat`) más bajas en toda la app; en **Inicio** el botón «Registrar entreno» solo sale en el ordenador; en **Fuerza** los tres accesos (entrenamiento vacío, EMOM, Entrenador IA) van en una sola lista con separadores.
- Siguientes rondas propuestas: datos de Inicio y Plan en un solo bloque dividido (menos alto), cabeceras de página más ligeras, y repasar Plan (lo más largo: casi 6.000 px).
- Ronda 3 (mismo día): componentes `FoldCard` (tarjeta plegable con el título a la vista) y `MoreMenu` (menú «⋯» para acciones secundarias, sin JavaScript). «Terminar plan» va al menú; Disponibilidad y Ritmos se pliegan; gráficas del Inicio a 190/200/120 px.
- Ronda 2 (mismo día): `StatGroup` (datos en un bloque con líneas, el último ocupa la fila si son impares), pasos de las sesiones plegados, formulario de «Fuerza con IA» plegado cuando ya hay rutinas y el porqué del «Estado de forma» plegado.

## Estilo deportivo
*2026-10-20*

- David eligió el estilo **deportivo y enérgico** (frente a «limpio y premium» o mantener el actual).
- Tipografía propia en vez de la del sistema, con `next/font` (se descarga al compilar y la sirve la app, sin llamadas a Google): **Barlow** para el texto y **Barlow Condensed** para cifras y títulos (`font-display`), como un marcador de carrera. Títulos de página en mayúscula.
- El naranja va en el dato principal de cada pantalla (`Stat accent`: «Esta semana» en Inicio, «Días para la carrera» en Plan), no en todo. «Esta semana» lleva barra de progreso con los km del plan (`Stat progress`).
- Gráficas (mismo día): un solo color por gráfica, el naranja (`S1 = var(--accent)` en `charts.tsx`); una segunda serie va en gris (la fatiga en «Forma y fatiga»), y la frescura negativa también en gris, no en rojo: entrenando es lo normal. Los colores de las fases del plan no cambian.
- Pendiente: repasar el resto de pantallas con el estilo nuevo. *(Hecho el mismo día.)*
- **Cambio de letra (mismo día)**: a David la Barlow Condensed le parecía alargada y prefiere una letra redondeada. Ahora **Rubik** para todo (texto, cifras y títulos), con los títulos sin mayúsculas y las cifras a 24 px. Barlow ya no se usa.

## Rutinas propias en el plan
*2026-10-20*

- Fallo: las sesiones de fuerza del plan sin rutina del usuario solo llevaban los ejercicios en texto («3 × 8-12 sentadilla goblet a RPE 7»), y «Empezar entreno» abría el entreno vacío.
- Ahora «Empezar entreno» va a `/fuerza/entreno?sesion=<id>`: la página traduce las líneas de la sesión a ejercicios del catálogo (`lib/strength/planSteps.ts`: series, repeticiones —el máximo del rango, con el rango en la nota—, «por lado», segundos y las «2 rondas» del afinado; de las alternativas, la primera). Con una rutina propia, sus ejercicios más lo que el plan le añade («+ …»). Probado con todas las plantillas del plan.
- **Rutinas propias en el plan**: en cada rutina, «En tu plan» (`Routine.planSlot`): que la coloque el plan (por la zona que trabaja, como hasta ahora), un día concreto de los que tiene el plan (pierna, tren superior, pecho…) o «No usarla en el plan». Al cambiarlo, la fuerza del plan se rehace. Debajo dice en cuántas sesiones está.

## Registrar fuerza ya hecha
*2026-10-21*

- Antes, registrar fuerza a posteriori solo guardaba duración y esfuerzo, sin ejercicios. Ahora, en Registrar con «Fuerza / gimnasio» (entreno nuevo), un bloque «¿Qué hiciste?» elige lo del plan de esa fecha, una rutina propia o un entreno libre, y «Apuntar las series →» abre `/fuerza/entreno?fecha=…&hora=…&sesion|rutina=…`.
- El entreno en modo «ya hecho» (`WorkoutLogger pastStart`): sin cronómetro, sin descansos y sin mezclarse con un entreno en vivo a medias (no usa el guardado del navegador); «✓ Marcar todas» pone lo escrito o lo que se ve en gris; al terminar pide la duración en minutos (por defecto, unos 2,5 min por serie) y guarda con la fecha y la hora elegidas.
- En el plan, «✓ Registrar» de una sesión de fuerza pasada lleva directo a apuntar sus series con su fecha.
- Sigue valiendo guardar solo la duración y el esfuerzo con el formulario de siempre.

## GPS con la pantalla apagada
*2026-10-21*

- Ahora la grabación usa la ubicación del navegador (`watchPosition`): solo llega con la app abierta y la pantalla encendida.
- **Android** (la app de Capacitor): se puede con un complemento de ubicación en segundo plano que arranca un *servicio en primer plano* (Android lo exige para seguir leyendo el GPS con la pantalla apagada, con una notificación fija «Grabando carrera»). Por debajo usan el Fused Location Provider de Google (la API de Maps no hace falta: es para dibujar mapas, no para leer la posición). Candidatos para Capacitor 8:
  - `@capgo/background-geolocation`: gratis (MIT), Android e iOS; el permiso de segundo plano se activa a mano.
  - `@capawesome-team/capacitor-background-geolocation`: pensado para Android 14+, guarda los puntos en una cola nativa; de pago (suscripción).
  - `@capacitor-community/background-geolocation`: el clásico, pero sus versiones llegan a Capacitor 6.
  - Google Play pide justificar el permiso de ubicación (declaración en la ficha); para una app de entrenamiento que graba mientras corres se acepta.
- **iPhone**: con la web instalada no hay forma; iOS no da la ubicación a una web en segundo plano o con la pantalla bloqueada. Core Location en segundo plano solo es para apps nativas, y una app nativa en el iPhone necesita la App Store (99 €/año) y compilar en un Mac, que se descartó (→ [[#iPhone por enlace, Android por Play Store]]).
- Fuentes: capgo.app/docs/plugins/background-geolocation, capawesome.io (anuncio del complemento), README de @capacitor-community/background-geolocation.

## Más ejercicios de fuerza
*2026-10-23*

- David echaba en falta ejercicios, sobre todo variantes con máquinas, mancuernas, kettlebell y gomas. Añadidos **140** en `scripts/exercises/extra.json` (el catálogo pasa de 896 a 1.036): máquinas +30 (hip thrust, multicadera, prensa horizontal y a una pierna, péndulo, belt squat, jalón y remo articulados, dominadas y fondos asistidos, pec deck…), poleas +6, mancuernas +39 (hip thrust, rumano, goblet, zancadas, cosaca, thruster, swing, arrancada, paseos…), kettlebell +34 (peso muerto, swing americano, turco completo, paseos, remo gorila, cosaca, búlgara…) y bandas +31 (remos, jalones, face pull, curl, tríceps, paso lateral, TKE y tobillo para corredores, nórdico asistido…).
- Se escriben a mano en vez de traer otra base de datos: así siguen el formato del catálogo (material, músculos, pasos en español) y no hay que traducir ni mezclar fuentes.
- Fotos: cada uno lleva la de un ejercicio parecido de free-exercise-db (`imgFrom`); en la ficha sale «Foto de un ejercicio parecido».
- La IA (rutinas y Entrenador) también los tiene como candidatos.


## Volver a donde estabas
*2026-10-23*

- Fallo: el enlace de arriba de cada página iba siempre al mismo sitio («← Ejercicios» al buscador), aunque vinieras de tu rutina, del entreno o del perfil.
- Ahora `BackLink` (`components/BackLink.tsx`): si en esta pestaña vienes de otra página de la app, vuelve atrás (`router.back()`, que además conserva dónde estabas en la página); si has entrado directamente (enlace, app recién abierta), va a la página de siempre. Para saberlo, `NavHistory` (en el layout) apunta las páginas visitadas en `sessionStorage`.
- El texto pasa a ser «← Volver» en todas: con la vuelta atrás ya no se sabe de antemano a qué página va. Cambiado en las 13 páginas que lo tenían (ficha de ejercicio, entreno, carrera, amigo, rutina, planes, material, medidas, GPS…).
- **Series que bajaban** (mismo día): con el teclado abierto, el descanso se mostraba en la cabecera fija del entreno y la hacía crecer unos 40 px; al tocar la serie siguiente (con el descanso en marcha) todo bajaba. Ahora el aviso del descanso flota justo debajo de la cabecera (`absolute`), sin ocupar sitio. Comprobado en Chrome a 390 px: la serie no se mueve.

## Next 16.4.2 por seguridad
*2026-10-23*

- Next 16.4.0 tenía 3 fallos publicados: dos críticos (ejecución de código en el servidor sin iniciar sesión, en la optimización de imágenes con SVG y en funciones `use cache` que devuelven arrays tipados) y uno de bloqueo (DoS) con las server actions. El build lo avisaba y terminaba con error.
- Se actualiza a **16.4.2** (y `eslint-config-next` 16.4.2), con versión exacta: es un parche, sin cambios de API. Se hace a mano (`npm install --save-exact`) en vez de con `next upgrade --agent`, que lanza un agente para hacerlo.
- Comprobado: `tsc`, `eslint`, 302 tests, build sin error y todas las páginas en el servidor local.
- `npm audit` sin `--omit=dev` aún marca `braces` y `uuid` en herramientas de desarrollo; no van en la web.

## Pestaña del entreno en curso y sin descanso
*2026-10-23*

- **Pestaña del entreno en curso** (`LiveWorkoutBar`, en el layout): si hay un entreno empezado (el que ya se guardaba en el navegador, `rio-entreno`, de menos de 12 h), sale encima de la barra de abajo en todas las secciones menos en el propio entreno: «Entreno en curso» (o «en pausa»), el nombre, el tiempo, las series hechas y «Seguir →», que abre `/fuerza/entreno` y continúa donde estaba. Desaparece al terminar o descartar el entreno. En el ordenador, abajo a la derecha del menú.
- La clave y el límite de 12 h están en un solo sitio (`lib/strength/liveWorkout.ts`), que usan el entreno y la pestaña.
- **Sin contador de descanso** (lo pidió David): fuera la cuenta atrás al marcar una serie, la barra de abajo con −15/+15/Saltar, el aviso en la cabecera con el teclado y la vibración al acabar. También el selector de descanso de cada ejercicio dentro del entreno, que ya no hacía nada. El descanso de las rutinas se queda (lo usan el plan, la IA y el EMOM).

## Secciones precargadas con tus datos
*2026-10-23*

- **Qué se medía**: el servidor tarda unos 30 ms en pintar cualquier página, y el plan pesa 24 kB comprimido; no era eso. Cada sección era dinámica (`connection()` en `getDb` y en la sesión) y se pedía al tocarla al servidor de EE. UU. (iad1), a ~300 ms desde España más el arranque en frío; mientras, «cargando». Con latencia simulada de 300 ms: entrar en el plan 398 ms, cambiar de sección ~320 ms.
- **Qué se ha hecho** (Next 16, guía *Optimizing prefetching*): las lecturas para pintar van en la **caché privada** (`"use cache: private"`): `getDb`, `getAnalysis`, el usuario de la sesión (`requireViewerId`), los amigos (`lib/authView.ts`) y el día de hoy (`viewToday`, `viewTodayMadrid`). El servidor sigue leyendo siempre en directo; lo que se guarda es la página ya pintada en el navegador (5 min, el mínimo para que la precarga la incluya). Los enlaces de la barra de abajo llevan `prefetch={true}` (también resuelve la pestaña de Perfil). Resultado: plan 55 ms (lo que tarda en pintarse), secciones 5-15 ms.
- **Datos al día**: con solo eso, tras guardar algo la página seguía enseñando lo de antes (`refresh()` no vacía esa caché). Ahora todo lo de pintar lleva la etiqueta `vista` y cualquier escritura (`kvSet`, `kvUpdate`, `kvDel`) hace `updateTag("vista")`. Comprobado: marcar «no puedo», ir a otras secciones y volver: todo al día, igual que antes. Importar archivos y subir el recorrido (van por rutas de API) llaman a la acción `refreshViews`.
- **Lo que no se actualiza solo**: lo que se guarda fuera de una acción (el atajo de Salud del iPhone, la IA que ajusta el plan en segundo plano) se ve al caducar la caché (5 min) o al **tirar para actualizar**. Antes eran 30 s.
- Las acciones y las rutas de API siguen leyendo en directo (`readDbNow`, `requireUserId`).
- **Código sin usar** (con knip): fuera `SyncButton` y las acciones `syncStrava`/`disconnectStrava` (Strava ya no tiene botón), `WEEKDAYS_SHORT` y `goalPace`; 38 `export` que solo se usaban en su archivo. El JS del navegador está bien (lo mayor, React: 70 kB comprimido).

## Cambiar una sesión de día
*2026-10-23*

- Lo pidió David para cualquier sesión, no solo la tirada: «hoy no puedo la tirada larga, pero mañana sí». Antes solo había «No puedo ese día», que quita el día y deja que el plan recoloque las sesiones donde quiera.
- **Cómo funciona** (`moveSession` en `planner.ts`, acción `moveSessionDay`): en cada sesión de hoy a 7 días, «Cambiar de día» enseña los próximos días; al elegir uno, la sesión pasa a ese día. Si ese día ya hay otra del mismo tipo (carrera con carrera, fuerza con fuerza), se intercambian. En Inicio y Perfil (tarjetas pequeñas) solo en la sesión de hoy; en el plan, en todas las de la próxima semana.
- **Límites**: las carreras no se mueven; nada al día de una carrera ni al anterior; solo días de la próxima semana y dentro del plan. Si quedan dos sesiones fuertes seguidas, se hace igual (lo decide el corredor) pero lo avisa.
- La sesión enseña «Cambiada (era el vie 23 oct)» (`movedFrom`), y sale el aviso con **Deshacer** (el mismo de «No puedo ese día», con `lastSkip.move`).
- No se llama a la IA, y la IA ya no cambia la fecha de una sesión cambiada por el atleta (se lo dice el contexto, `cambiadaPorElAtleta`, y el código lo impide).

## GPS con la pantalla apagada en Android
*2026-10-23*

- David pasó una lista de Gemini (Mapbox o Google Maps para el mapa; Transistor, Roam.ai o Radar para el GPS). Para el **mapa** no hace falta nada nuevo: el recorrido ya se dibuja (en directo, la línea; después, el mapa de la actividad). Para el **GPS**: Transistor es de pago para publicar en Android, y Roam.ai y Radar son servicios externos de pago por los que pasaría la ubicación. Se elige **`@capgo/background-geolocation` 8.4.14** (gratis, MPL-2.0, para Capacitor 8, precisa: GPS de Google Play services con servicio en primer plano). El de `@capacitor-community` es menos preciso.
- **Cómo va**: `components/gpsSource.ts` decide de dónde salen los puntos. En la app de Android con el complemento, al grabar, el GPS nativo en segundo plano con la notificación «Grabando carrera» (y sin forzar la pantalla encendida); antes de empezar y en todo lo demás (iPhone, navegador, APK antiguo), la ubicación del navegador como hasta ahora. El filtro de puntos y las estadísticas (`gpsTrack.ts`) no cambian.
- **Android**: `useLegacyBridge: true` en `capacitor.config.ts` (si no, Android corta las ubicaciones a los 5 min en segundo plano). Del complemento se quitan las geovallas y el arranque con el móvil (`RECEIVE_BOOT_COMPLETED`); quedan ubicación, `FOREGROUND_SERVICE_LOCATION` y notificaciones. El GPS sigue sin ser obligatorio para instalar (`tools:replace`). No se pide la ubicación «todo el tiempo» (`ACCESS_BACKGROUND_LOCATION`): con el servicio en primer plano no hace falta.
- **Google Play**: el servicio en primer plano de tipo ubicación se declara en Play Console (para qué se usa y un vídeo corto). Hay que hacerlo antes de publicar.
- **iPhone**: sigue sin poder (una web no recibe la ubicación con la pantalla bloqueada); pantalla encendida.
- Compilar: `cd android` y `gradlew assembleDebug` con `JAVA_HOME` al JDK 21 y `ANDROID_HOME` al SDK (no hay `local.properties`).

## Sticker y vídeo para compartir
*2026-10-23*

- Opciones que se le dieron a David: sticker transparente, JPEG, vídeo con el recorrido animado o varias plantillas. Eligió **sticker** y **vídeo**.
- **Abrir directamente las historias de Instagram con el sticker encima de tu foto** (como Strava) no se puede desde una web: Strava lo hace con una función de su app nativa. Lo que sí funciona en el iPhone: **Copiar sticker** y, en la historia con tu foto, mantener pulsado → «Pegar»; Instagram lo pone como sticker (se mueve y se escala). Si el navegador no deja copiar imágenes, se comparte el PNG (y se añade con el sticker «Foto»).
- **Sticker** (`/api/compartir/[id]?formato=sticker`): PNG sin fondo de 1080 de ancho con el recorrido (con borde blanco) o el cuerpo con los músculos (gris claro), y las tres cifras en blanco con sombra, para que se lean sobre cualquier foto.
- **Vídeo** (`components/routeVideo.ts`): se hace en el móvil, sin servidor. Un `<canvas>` de 720 × 1280 dibuja la línea en ~4 s y después salen los datos; `MediaRecorder` lo graba en MP4 (iPhone y Chrome de Android; Instagram no acepta WebM). Tarda lo que dura (~6 s) y pesa ~350 kB. Solo en actividades con recorrido; el servidor pasa los puntos ya normalizados (`shareVideo`, como mucho 400).
- La imagen de historia de siempre sigue igual (PNG 1080 × 1920).

## Herramientas: ScreensDesign, PostHog y RevenueCat
*2026-10-23 · propuesta, pendiente de que David decida cada una*

David vio en un vídeo una app montada con tres herramientas y pidió investigarlas.

**Diseño: ScreensDesign** («App Library» no existe con ese nombre; es esta). Biblioteca de unas 2.800 apps de las listas más vendidas con su registro inicial, pantalla de pago y pantallas clave grabadas, y **cuánto factura cada una al mes** (estimación, solo App Store). Tiene versión Pro de pago y conexión con Claude (MCP).
- Modelo elegido por lo que factura y por parecido: **Runna** (~5-6 M$/mes; planes hacia una carrera con entrenador; 19,99 $/mes o 119,99 $/año, 7 días de prueba) para el **registro inicial, el plan y la pantalla de pago**. **Strava** (7-16 M$/mes) para grabar con GPS, amigos y compartir. **Hevy** para fuerza (ya se sigue).

**Métricas y errores: PostHog.** Plan gratis sin tarjeta: 1 millón de eventos/mes (qué se usa y dónde se va la gente), 5.000 grabaciones de sesión, 100.000 errores y 1 millón de peticiones de *feature flags* (interruptores por usuario: Gratis/Premium, probar dos pantallas de pago). **Sustituye a Sentry.** Cuidado con los **datos de salud**: no mandarlos, tapar lo escrito en las grabaciones, pedir consentimiento (UE) y elegir servidor en Europa (comprobar al darse de alta).

**Cobrar: RevenueCat** (lo que David oyó como «revenueapp»). Gratis hasta 2.500 $/mes de ingresos; después, 1 % de lo facturado (más la comisión de Stripe). Junta en un único «premium» lo que se cobra en la **web/iPhone** (Web SDK `@revenuecat/purchases-js`, con tu cuenta de Stripe; pantalla de pago y portal para cancelar incluidos) y en **Android** (Google Play Billing, obligatorio en Play). Sustituye a montar Stripe a mano ([[Suscripción]]). Su documentación aún no es coherente sobre «Stripe Billing»: comprobar al empezar.

**Orden propuesto**: 1) PostHog (gratis, una tarde; dice qué usa la gente antes de decidir Premium); 2) rediseño con Runna de modelo (hace falta ScreensDesign Pro); 3) RevenueCat al decidir Premium.

Fuentes: screensdesign.com, posthog.com/pricing, revenuecat.com/pricing, revenuecat.com/docs/web/web-billing/web-sdk.

## Avisos de cada mañana
*2026-10-23*

- **Web Push** (estándar de los navegadores, con la librería `web-push`): en el iPhone funciona con la web **instalada en la pantalla de inicio** (iOS 16.4+); en Safari sin instalar no. En la **app de Android** no: la vista web de Capacitor no recibe push (más adelante, `@capacitor/local-notifications`).
- **Cómo va**: «Más → Avisos» (`/avisos`) pide permiso en el mismo toque y guarda la suscripción del móvil en el Db (`push.subs`, hasta 5 móviles). El cron de Vercel `/api/cron/avisos` (6:00 UTC: 7:00 en invierno y 8:00 en verano en España) recorre los usuarios con avisos, calcula lo que toca hoy en Madrid (`todayMessage` en `lib/pushMessage.ts`) y lo manda una sola vez al día (`push.lastSent`). Las suscripciones caducadas (410/404) se borran solas. El service worker enseña el aviso y al tocarlo abre el plan.
- **Hora fija**: en el plan gratis de Vercel los cron van una vez al día y no a la hora exacta (dentro de esa hora); por eso no se elige hora.
- **Texto**: «Hoy: Tirada larga · 12 km» + «Ritmo 5:30–6:00 /km.» + la descripción; si además hay fuerza, «Y además: Fuerza general». Día de carrera, mensaje propio. Días de descanso, solo si se pide.
- **Claves**: `VAPID_PUBLIC_KEY` y `VAPID_PRIVATE_KEY` (generadas, en `.env.local`; copiarlas a Vercel). `/api/cron/` queda público en `proxy.ts` (lo protege `CRON_SECRET`).
- **Probado**: en Chrome del emulador de Android (con la web local): permiso, suscripción de Google guardada, el servidor la envía (Google la acepta) y el cron no repite el mismo día; el aviso se ve con su icono y título (entregado al service worker con las herramientas de Chrome: el emulador no recibe push de Google sin terminar de configurar la cuenta). En Chrome sin ventana del PC los service workers no arrancan (ni el de producción): no sirve para probar esto.
- De paso: si se recargaba la página de grabar a mitad (p. ej. al tirar para actualizar), el servicio de GPS en segundo plano de Android seguía con su notificación. Ahora, al abrir la página sin grabar, se para cualquier servicio suelto (una vez).

### Avisos: sin pantalla, lo pregunta la app (mismo día)
- David lo probó en su iPhone y funcionó; pidió quitar la opción del menú y que lo pida solo al instalar. El iPhone no deja pedir el permiso sin un toque, así que con la app instalada sale un aviso abajo: «¿Te aviso cada mañana de lo que te toca?» con **Activar** / **Ahora no** (no vuelve en 2 semanas). Con el permiso ya dado (móvil nuevo, o se reinstaló) se suscribe solo. Se quitan desde los ajustes del móvil. Fuera `/avisos` y la prueba; los días de descanso quedan sin aviso.
- El de prueba no se veía porque **con la app abierta el iPhone no enseña el aviso** (Apple sí lo aceptaba). Por eso la prueba salía a los 10 s; ya no hace falta.

## Rediseño: estilo Volt
*2026-10-24*

- Antes de tocar nada, copia del código en GitHub: etiqueta `antes-rediseno-2026-10-24` y rama `copia/antes-rediseno-2026-10-24` (commit `5feebef`). Volver: `git checkout antes-rediseno-2026-10-24` (o rehacer `main` desde ahí).
- Se le enseñaron a David 10 diseños de Inicio en un lienzo (deportivo oscuro, coach claro, social, **Volt**, minimal suizo, datos de reloj, editorial, noche neón, pastel, brutalista). Eligió el **4, Volt** (al estilo Nike Run Club).
- **Volt**: siempre oscuro (fuera el tema claro): fondo negro `#000`, tarjetas `#0f0f0f`, **lima `#d4ff3a`** en el dato principal, los botones y la pestaña activa (con texto negro encima). Gráficas: lima, cian `#3ec6ff` y gris claro.
- **Letras**: **Anton** (condensada, un solo grosor) solo en títulos de página y cifras grandes, en mayúsculas; **Inter** en todo el texto. En 2026-10-20 David había descartado una condensada (Barlow) por alargada; esta vez la eligió él con el diseño, pero se limita a lo grande.
- Botones en píldora y en negrita; etiquetas de los datos en mayúsculas pequeñas.
- **Inicio** (`TodayHero`): «HOY TOCA» + el nombre de la sesión en grande (sin los km del final, que van debajo; más pequeño si es largo) + km gigantes en lima + ritmo, minutos y zona + **EMPEZAR** (correr → grabar con GPS; fuerza → el entreno de esa sesión) + la semana en barras (hecho en blanco, hoy en lima) + la cuenta atrás de la carrera. Sin sesión hoy: «DESCANSO» y la siguiente.
- Pendiente: el icono de la app (hay que regenerar los PNG y reinstalar), las imágenes y el vídeo para compartir (siguen en naranja) y la pantalla de inicio de sesión.
- **Parte 2 y 3** (mismo día): el resto de pantallas ya cogía Volt de las piezas comunes; se cambió el naranja que quedaba (gris claro para las sesiones suaves y la fase de base, flechas de los desplegables en lima). Icono de la app en lima con las montañas en negro (`scripts/generate-icons.mjs`: web y Android, y la pantalla de arranque en negro), imágenes para compartir, sticker y vídeo en lima sobre negro, fondo de la app de Android en negro. La imagen de historia sigue con la letra por defecto de las imágenes (no Anton): cargarla ahí es más trabajo, se puede hacer después.

## Distribución del menú: Inicio como pestaña
*2026-10-24*

- Antes, copia en GitHub: etiqueta `antes-distribucion-2026-10-24` y rama `copia/antes-distribucion-2026-10-24` (commit `6c018de`).
- Opciones: **A** Inicio como pestaña y «Tú» con lo demás · B por deporte (Inicio · Correr · Fuerza · Tú) · C Entrenador IA en el centro · D retoque de la actual. David eligió la **A** (como Strava o Nike Run Club).
- Móvil, abajo: **Inicio · Plan · ＋ (Registrar) · Fuerza · Tú**. Solo fuerza: Inicio · Fuerza · ＋ (Entrenar) · Ejercicios · Tú.
- Arriba: el logo, el **Entrenador IA** (la estrella) y Amigos. Logros pasa a un botón en la cabecera del perfil (como en el ordenador).
- Fuera el menú «Más»: Estadísticas, Carreras, Calculadoras, Sueño, Importar / demo y Cerrar sesión van en una cuadrícula de «Tú» (en el resumen del perfil). «Tú» se queda encendido dentro de esas secciones.
- En el ordenador no cambia: barra lateral con todo.

## «No puedo» solo para hoy o días futuros
*2026-10-24*

- Pedido por David: si la sesión ya pasó (uno o dos días), no tiene sentido decir que no puedes. Se quita el botón «No pude → reajustar» de las sesiones no hechas; queda «Hoy no puedo» (hoy) y «No puedo ese día» (próximos).
- El servidor también lo rechaza (`skipSession` y el formulario de días sin entrenar). La sesión pasada queda como «No realizado» y la IA ya la tiene en cuenta al reajustar.

## Datos de la carrera en la notificación (Android)
*2026-10-24*

- Complemento propio en el APK, `RunNotificationPlugin.java` (registrado en `MainActivity`): reescribe la notificación «Grabando carrera» del servicio de ubicación con **el mismo id (28351) y el mismo canal**, así no sale una segunda notificación, no suena y sigue siendo la del servicio en primer plano.
- Título según el deporte («Corriendo», «Caminando», «En bici»), un **cronómetro que lleva Android** (sigue contando aunque la web tarde) y el texto «km · ritmo medio». Visible en la pantalla de bloqueo (`VISIBILITY_PUBLIC`) y de categoría «entreno».
- La web (`RunRecorder` → `showRunData` en `gpsSource.ts`) manda los km y el ritmo como mucho cada 3 s, solo mientras graba en segundo plano. Al pausar o terminar se para el servicio y se quita la notificación.
- Descartado `@capacitor/local-notifications`: habría sido una segunda notificación, aparte de la del servicio. Tocar el código del complemento de ubicación se perdería al actualizarlo.
- Para tenerlo hay que instalar un **APK nuevo**: el código nativo no llega con Vercel. iPhone: sigue sin poder hacerse desde la web.
