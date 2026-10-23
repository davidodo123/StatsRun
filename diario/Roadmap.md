---
tags: [roadmap]
---
# 🗺️ Roadmap

Regla: se trabaja **una fase cada vez** y no se pasa a la siguiente hasta que David la comprueba.

Leyenda: `[x]` hecho · `[ ]` pendiente · `[/]` empezado

---

## ✅ Fase 1 · Necesario — *terminada 2026-10-09*

- [x] Inicio de sesión con Google → [[Decisiones#Login solo con Google]]
- [x] Quitar el usuario y contraseña de la entrada (era una Basic Auth de un despliegue antiguo atascado)
- [x] Optimizar la web (el build fallaba y Vercel servía una versión vieja; lecturas a Redis deduplicadas)
- [x] Registrar entreno con los datos de Strava a mano: nombre, distancia, ritmo medio, tiempo en movimiento, desnivel +, altitud máx., pasos. Quitada la captura.
- [x] *Extra:* «¿Cómo te has sentido?» al registrar → la IA ajusta la rutina → [[Decisiones#Sensaciones para la IA]]
- [x] *Extra:* IA con base científica: diagnóstico de estado de forma (Selye, Banister, ACWR, checklist de Helms) → [[Estudio entrenamiento]]
- [x] *Extra:* investigación ampliada: tope por sesión (Frandsen 2025), enfermedad, semáforo de dolor, afinamiento → [[Estudio entrenamiento#9. Evidencia ampliada (búsqueda del 2026-10-09)]]
- [x] *Extra:* fallos de seguridad y datos (secreto de sesión, escrituras simultáneas en Redis)

Detalle en [[2026-10-09]].

---

## ✅ Fase 2 · Importante — *hecha 2026-10-09, comprobada 2026-10-10* → [[Decisiones#Amigos, sesiones compartidas y mapas]]

- [x] Añadir amigos: **buscar perfiles** por nombre o @usuario con **solicitud de amistad** (el código de amigo sigue sirviendo)
- [x] Sección de sesiones de amigos: «Actividad de tus amigos» (14 días)
- [x] Sesiones compartidas: al registrar, «¿Con quién has entrenado?» → sale «👥 con Ana» y a Ana le aparece para añadirla a sus entrenos
- [x] Imagen de la sesión: **el mapa** del recorrido (Strava, GPX, TCX y FIT) en una página de detalle nueva

---

## 🔮 Fase 3 · Futuro

### Perfil — *hecho 2026-10-09, comprobado 2026-10-10* → [[Decisiones#Perfil con pestañas]]
- [x] Mejores tiempos
- [x] Sesiones recientes
- [x] Apartados Running y Fuerza
- [x] Apartado con todas las sesiones hechas
- [x] Tabla de mejora con medias a partir de los datos
- [x] Ver la preparación (plan) que estás haciendo
- [x] Logros
- [x] Modificación del perfil (promedios)

### Hacer aplicación — *PWA hecha 2026-10-09, pendiente de comprobar* → [[Decisiones#App instalable (PWA) y repaso móvil]]
- [x] App instalable (PWA): icono, pantalla completa, atajos, pantalla sin conexión, aviso «Instala PaceLab»
- [x] Diseño móvil revisado con capturas: desbordes arreglados, botones y tablas ajustados
- [x] Instalada en el iPhone de David desde Safari (2026-10-09)
- [-] ~~App nativa~~: descartada, David tiene iPhone y no tiene Mac (compilar en la nube exigiría Apple Developer, 99 $/año)
- [x] **Pasos y calorías** de Salud del iPhone con un atajo de Atajos → [[Decisiones#Pasos y calorías del iPhone (atajo)]]
- [x] Ampliar el atajo con VFC, pulso en reposo y sueño (para el diagnóstico de la IA) — *hecho 2026-10-11; falta que David añada los pasos al atajo* → [[Decisiones#VFC, pulso en reposo y sueño]]

### Carrera objetivo — *hecho 2026-10-09* → [[Decisiones#Recorrido de la carrera]]
- [x] Subir el recorrido de la carrera (.kmz, .kml, .gpx) → mapa con salida, meta y avituallamientos, distancia y desnivel
- [-] ~~Adjuntar PDFs de la carrera~~: descartado, no hace falta
- [x] Más de un plan → **temporada**: carreras secundarias B (a tope) y C (como entreno) dentro del plan de la principal → [[Decisiones#Temporada con varias carreras]]

### IA / ciencia (salido del estudio)
- [x] Carga por sRPE (RPE × minutos) cuando no hay FC — *ya existía en `load.ts`*
- [x] El planificador aplica también el tope por sesión de Frandsen: la tirada larga sube como mucho un 10 % (mín. 0,5 km)
- [x] Desacople aeróbico (Pa:FC) en tiradas largas, con los streams de Strava — *hecho 2026-10-18, pendiente de comprobar con una tirada real* → [[Decisiones#Desacople aeróbico]]
- [x] VFC (HRV) diaria si se conecta con la app de Salud (con el atajo, 2026-10-11)

### Experiencias de la app — *hecho 2026-10-09, comprobado 2026-10-10* → [[Decisiones#Etiquetas y repetición del recorrido]]
- [x] Flyover estilo Strava con la ruta seguida (repetición animada en 2D, cámara que sigue al corredor)
- [x] Etiquetas: nuevo récord, primer 5K/10K…, carrera más larga, más desnivel, mejor ritmo del mes, mayor carga

---

## 🏋️ Fase 4 · Fuerza tipo Hevy — *alcance decidido 2026-10-10* → [[Decisiones#Fuerza tipo Hevy]]

Idea: la fuerza deja de ser un añadido del plan de carrera. Cada uno monta las rutinas que quiera con el material que tenga (gimnasio, mancuernas en casa, una kettlebell o sin peso), las registra en vivo como en Hevy y puede pedirle a la IA un programa de fuerza, solo o encajado con su plan de carrera. Sirve también para quien no corre.

Base: [[Estudio entrenamiento#6. La Pirámide de Entrenamiento (Helms, Valdez, Morgan)]], [[Estudio entrenamiento#7. Fuerza para corredores]], [[Estudio entrenamiento#9.6 Fuerza para corredores]] y el libro de Helms (Niveles 2-4, guía rápida y modelos de progresión), más una búsqueda nueva → §10 del estudio.

### 4.1 · Catálogo de ejercicios y material — *hecho y comprobado 2026-10-10* → [[Decisiones#Catálogo de ejercicios y material]]
- [x] Base de datos de ejercicios de todo tipo: barra, mancuernas, kettlebell, máquinas, poleas, bandas, peso corporal, pliometría; con músculos, material, imágenes e instrucciones en español
- [x] Ejercicios propios (crear los que falten)
- [x] Mi material: lugares («Casa: mancuernas hasta 20 kg y kettlebell 16 kg», «Gimnasio», «Sin material»)
- [x] Buscar y filtrar por músculo y material

### 4.2 · Rutinas y entreno en vivo — *hecho 2026-10-10 con el diseño de Hevy que pidió David, comprobado* → [[Decisiones#Rutinas y entreno en vivo]]
- [x] Crear, editar, duplicar y borrar rutinas, y carpetas (hechas 2026-10-10)
- [x] Empezar entreno (vacío o desde rutina): series con «anterior», kg, repeticiones, RIR y ✓; tipos de serie (calentamiento, normal, descendente, al fallo)
- [x] Temporizador de descanso, superseries y notas por ejercicio — *superseries y notas hechas 2026-10-10, pendientes de comprobar* → [[Decisiones#Superseries, notas y carpetas]]
- [x] Se guarda como actividad de fuerza (cuenta en la carga, el feed y los logros)

### 4.3 · Progreso — *hecho y comprobado 2026-10-10* → [[Decisiones#Progresión doble y récords de fuerza]]
- [x] Por ejercicio: 1RM estimado, mejor serie, volumen, historial y récords — *en la ficha de cada ejercicio; pendiente de comprobar* → [[Decisiones#Progreso por ejercicio]]
- [x] Progresión doble: peso y repeticiones propuestos al empezar — *pendiente de comprobar*
- [x] Series por músculo a la semana y mapa de músculos (portada de Fuerza) → [[Decisiones#Series por músculo, medidas y discos]]
- [x] Medidas corporales (peso, % de grasa, perímetros) y calculadora de discos

### 4.4 · Entrenador IA de fuerza (chat)
- [x] En el plan: «Fuerza con IA» (material + lo que sabe hacer) → rutinas base y fuerza por tipo que el plan coloca solas → [[Decisiones#Fuerza con IA en el plan]]
- [x] Chat de fuerza también para quien no corre (sección Fuerza) — *hecho 2026-10-10, pendiente de comprobar en producción* → [[Decisiones#Chat con el entrenador de fuerza]]
- [x] Con plan de carrera: encaja la fuerza en el plan (hasta 4 días; pierna, posterior + pliometría, superior + core; nunca antes de la tirada larga o de una sesión clave)
- [x] El planificador usa las rutinas del usuario (por zona) y plantillas distintas por tipo; hasta 3 días → [[Decisiones#Fuerza del plan con tus rutinas]]

### 4.5 · Usuarios que solo hacen fuerza — *hecho 2026-10-10, pendiente de comprobar* → [[Decisiones#Usuarios que solo hacen fuerza]]
- [x] Alta sin carrera ni plan de running; Inicio y menú según lo que haga cada uno

---

## ⚡ Repaso de rendimiento y sin emojis — *hecho 2026-10-10, pendiente de comprobar* → [[Decisiones#Sin emojis y app más rápida]]
- [x] Quitar todos los emojis: iconos SVG propios (`components/icons.tsx`)
- [x] Gráficas sin Recharts (SVG propio): unos 400 KB menos de JS en Inicio, Perfil, Estadísticas y rutinas
- [x] Lista de ejercicios en el JS en caché en vez de en cada página (Ejercicios 211 → 66 KB, Entreno 183 → 39 KB)
- [x] Caché de navegación de 30 s y precarga de páginas en el service worker
- [-] ~~Mover Vercel y Redis a Europa~~: descartado, la base de Upstash en Europa no tiene plan gratis en Vercel y David prefiere seguir gratis en iad1

## 🛠️ Fase 5 · Arreglos que pidió David (2026-10-11) — *hechos los 9, pendientes de comprobar en el iPhone*
1. [x] **Atajo de pasos automático**: que se actualice solo y que, si un día no se ejecuta, ese día no se pierda (cada envío manda los últimos 7 días) — *hecho, falta que David cambie el atajo* → [[Decisiones#Atajo de pasos con 7 días]]
2. [x] **Arreglar el logo**: dentro de la app salía un triángulo de un pico (texto «▲»); ahora las montañas de dos picos del icono en la barra y en «Entrar» (`LogoMark`) — *hecho 2026-10-11*
3. [x] **Perfil en el móvil**: quitar la barra de desplazamiento de las pestañas (Resumen, Running, Fuerza, Actividades…) — *hecho 2026-10-11: rejilla de 4 columnas en el móvil (todas a la vista), fila en el ordenador; «Editar perfil» se acorta a «Editar»*
4. [x] **Plan con fuerza**: que ponga todos los días de carrera que necesite (p. ej. 5) más los días de fuerza elegidos (p. ej. 3); ahora solo pone 3 de fuerza y 3 de correr — *hecho 2026-10-11: la IA del ajuste diario quitaba días de correr («evitar sobrecarga»); ahora solo puede quitar sesiones con diagnóstico descargar o recuperar. David pulsa «↻ Adaptar con mis datos» para recuperar los días quitados* → [[Decisiones#La IA no quita días de entreno]]
5. [x] **Un plan con dos carreras** (p. ej. 25 de noviembre y abril): que se ajuste a las dos — *hecho 2026-10-11: carreras «A · Otro objetivo» en la Temporada, con su propio tramo* → [[Decisiones#Temporada con varios objetivos]]
6. [x] **Plan en el móvil**: hay un espacio negro abajo — *hecho 2026-10-11: franja negra bajo la barra de abajo al llegar al final (o al rebotar) en el iPhone instalado; el color de la barra sigue por debajo. Pendiente de comprobar en el iPhone*
7. [x] **Quitar las barras de desplazamiento en todo el móvil** — *hecho 2026-10-11: barras ocultas en el móvil (se sigue deslizando) y las 4 tablas que se desplazaban de lado (Estadísticas ×2, tabla de mejora del perfil, comparación con un amigo) caben en la pantalla, con las columnas secundarias desde tableta. Todas las páginas sin desborde a 360 px*
8. [x] **Carreras de «Cruzando la meta»**: traer las carreras que van saliendo, con los detalles y el archivo del recorrido que publican — *hecho 2026-10-11* → [[Decisiones#Carreras de Cruzando la Meta]]
9. [x] **Tirar para actualizar**: al bajar la pantalla, botón de actualizar para coger los cambios de la web sin cerrar y abrir la app — *hecho 2026-10-11* → [[Decisiones#Tirar para actualizar y aviso de versión nueva]]

## 🐞 Fallos que vio David (2026-10-11)
- [x] **«Borrar del historial» no funcionaba**: el plan sí se borraba, pero al volver a Planes se veía la lista de antes (caché del navegador). Arreglado en todas las acciones que guardan y redirigen (terminar plan, borrar rutina, ejercicio propio, guardar entreno…) — *hecho 2026-10-11, pendiente de comprobar*
- [x] **Deshacer «No puedo ese día»** si se pulsa sin querer: aviso con botón «Deshacer» en Inicio, Plan y Perfil hasta el día siguiente — *hecho 2026-10-11, pendiente de comprobar* → [[Decisiones#Deshacer «No puedo ese día»]]
- [x] **Fuerza por grupos**: en Perfil, «Tipo de fuerza»: general (cuerpo entero, se corre todos los días) o por grupos (pecho, espalda, pierna; el día de pierna no se corre, dos días antes de la tirada larga) — *hecho 2026-10-11, pendiente de comprobar* → [[Decisiones#Fuerza por grupos]]
- [x] **Perfil más recogido en el móvil**: fuera el título «Tu perfil» y «Cerrar sesión» (está en Más); Logros es un trofeo en la barra de arriba, junto a Amigos; Editar, un lápiz en la tarjeta del nombre; y las pestañas (Resumen, Running, Fuerza, Entrenos, Salud) dentro de esa misma tarjeta. Arreglado el desborde lateral de Editar (el desplegable de tipo de fuerza era muy ancho) — *hecho 2026-10-11, pendiente de comprobar*
- [x] **Foto de perfil** (subir, cambiar o quitar; sale en Amigos) — *hecho 2026-10-11, pendiente de comprobar*
- [x] **Foto en los entrenos** (al registrar o desde la ficha; en Amigos sale como publicación con la foto grande) — *hecho 2026-10-11, pendiente de comprobar*
- [x] **Semana del 12 sin lunes a jueves**: eran días marcados como «no puedo»; quitar el día ahora devuelve las sesiones, se ven en su semana y «No puedo ese día» pide confirmación — *hecho 2026-10-11*
- [x] **«↻ Adaptar con mis datos» no parecía hacer nada**: sí recalculaba, pero sin aviso. Ahora pone «Adaptando…» y dice qué ha cambiado (VDOT, km, días) o que sale igual, y que la IA lo está ajustando — *hecho 2026-10-18, pendiente de comprobar* → [[Decisiones#Respuesta de «Adaptar con mis datos»]]

- [x] **Teclado del iPhone (2026-10-20)**: con el teclado abierto (o recién cerrado) la barra de abajo flotaba en medio, la de arriba se iba bajo la hora y el descanso del entreno tapaba las series. Ahora la barra de abajo se oculta, lo de arriba sigue a la parte visible y el descanso pasa a la cabecera del entreno — *hecho 2026-10-20, pendiente de comprobar en el iPhone* → [[Decisiones#Teclado del iPhone y barras fijas]]
- [x] **Sección Sueño** en «Más»: a qué hora despertarse por ciclos de 90 min, o a qué hora acostarse — *hecho 2026-10-12, pendiente de comprobar*

## 💾 Copias de seguridad (2026-10-12) → [[Decisiones#Copias de seguridad]]
- [x] Copia diaria cifrada a un repo privado de GitHub (cron de Vercel a las 3:00 UTC), 30 días de diarias + una mensual; script para abrirla y restaurarla — *código hecho 2026-10-12*
- [x] David crea el repo privado, el token y las 4 variables en Vercel y guarda BACKUP_SECRET aparte — *hecho 2026-10-12*
- [x] Primera copia desde Vercel → Settings → Cron Jobs → Run: `diarias/2026-10-12.rio` (7 claves) — *hecho 2026-10-12*
- [x] David abre la copia en su PC con el script y su BACKUP_SECRET guardada: funciona — *hecho 2026-10-12*

## 📲 Fase 6 · Compartir la app (2026-10-12) → [[Decisiones#iPhone por enlace, Android por Play Store]]
**iPhone (David y sus amigos): enlace web + atajo, sin App Store (99 €/año)**
- [x] 6.1 Atajo compartido por enlace de iCloud (copia sin clave, comprobada descargándola) — *hecho 2026-10-12*
- [x] 6.2 En Perfil → Salud: «Copiar mi clave» + «Instalar el atajo» + pegar la clave + las dos automatizaciones; la guía para crearlo a mano queda en un desplegable — *hecho 2026-10-12, pendiente de comprobar*
- [x] 6.3 Bienvenida en Safari: ya la hace el aviso «Instala Run-In-Out» (en iPhone, Compartir → Añadir a pantalla de inicio). Al pasar el enlace: abrirlo en Safari, no dentro de WhatsApp/Instagram

**Android: Google Play (25 $ una vez)**
- [x] 6.4 Android Studio en el PC de David; Capacitor 8 con la app actual dentro (`app.runinout`, carga run-in-out.vercel.app); APK de prueba funcionando en el emulador — *hecho 2026-10-12*
- [x] 6.5 Entrar con Google desde la app (pestaña del sistema y vuelta a la app con código de un solo uso) — *hecho y probado en el emulador 2026-10-12*
- [x] 6.6 Health Connect: pasos, calorías, pulso en reposo, VFC y sueño al abrir la app (sin atajos) — *hecho 2026-10-12: permisos y lectura probados en el emulador (sin datos); falta probarlo con datos reales en un Android*
- [ ] 6.7 Prueba cerrada en Play (12 personas, 14 días, obligatorio en cuentas nuevas) y publicación — *en pausa: David prueba la app unos días antes (cuenta personal de Play Console, con DNI)*

## ✨ Fase 7 · Ideas nuevas (2026-10-18) — *7.1-7.3 comprobadas por David 2026-10-19* → [[Decisiones#Ideas nuevas: orden y alcance]]
1. [x] **EMOM** (Fuerza → EMOM): intervalo y rondas, ejercicios que se turnan, pitidos 3-2-1, pantalla encendida, marcar rondas sin completar; se guarda como entreno de fuerza — *hecho 2026-10-18, comprobado 2026-10-19* → [[Decisiones#EMOM]]
2. [x] **Compartir el entreno** en Instagram/WhatsApp (imagen de historia): fuerza con el cuerpo humano y los músculos coloreados (cuerpo nuevo en SVG, también en la portada de Fuerza); running con la línea del recorrido sobre fondo oscuro — *hecho 2026-10-18, comprobado 2026-10-19* → [[Decisiones#Compartir el entreno]]
3. [x] **Entrenador IA** (`/entrenador`, en «Más» y desde Fuerza y Plan): chat de running y fuerza que registra los entrenos que le cuentas, crea rutinas y cambia el plan (todo con un botón para confirmar), con **micrófono** donde el navegador lo permite — *hecho 2026-10-18, comprobado 2026-10-19* → [[Decisiones#Entrenador IA]]
4. [x] **Grabar la carrera con el GPS** (Registrar → Grabar con GPS): cronómetro, distancia, ritmo actual y medio, parciales, desnivel, recorrido y pausa automática; con la pantalla encendida (iPhone y Android) — *hecho 2026-10-19, pendiente de comprobar corriendo* → [[Decisiones#Grabar la carrera con el GPS]]
   - [ ] **GPS con la pantalla apagada** (lo pidió David 2026-10-20: ahora solo cuenta si el móvil está en esa pantalla) → [[Decisiones#GPS con la pantalla apagada]]
     - [/] Android (app de Capacitor): `@capgo/background-geolocation` (gratis) con servicio en primer plano y la notificación «Grabando carrera»; la web lo usa solo si está en el APK (si no, como antes). APK de prueba compilado — *hecho 2026-10-23; falta instalar el APK nuevo y salir a correr con la pantalla apagada; en Play hay que declarar el «servicio en primer plano de ubicación»* → [[Decisiones#GPS con la pantalla apagada en Android]]
     - [ ] iPhone: la web instalada no puede (iOS no da la ubicación a una web con la pantalla bloqueada). Haría falta una app nativa con Core Location en segundo plano, y eso es la App Store (99 €/año y un Mac), que David descartó. Mientras tanto: pantalla encendida (ya se mantiene sola)

## 📝 Fase 8 · Por hacer (apuntado por David 2026-10-20)
- [x] **GPS**: desmarcar las opciones de correr al empezar a grabar (ahora «Correr» sale ya marcado) — *hecho 2026-10-20: los tres botones iguales, con su icono, y «¿Qué vas a hacer? Toca para empezar»*
- [/] **Pasos**: se han dejado de actualizar solos; David tiene que ejecutar el atajo a mano — *causa 2026-10-20: solo tenía la automatización de las 23:50, y con el iPhone bloqueado iOS no deja leer Salud. Falta que David añada la de «Cargador → Se desconecta» (paso 5 de la guía) y lo compruebe*
- [x] **Optimizar**: repasar y redistribuir toda la app (secciones, menús, qué va en cada página) para hacerla más simple y rápida — *hecho 2026-10-20 en las rondas 1-5 del rediseño: menos scroll (Plan −25 %, Estadísticas −52 %), lo secundario plegado y acciones en menús* → [[Decisiones#Rediseño, ronda 1]]
- [/] **`CLAUDE.md` y skills del proyecto** (idea de David 2026-10-22) — *`CLAUDE.md` hecho 2026-10-23 (ya no hace falta pegar el prompt en cada chat); faltan las skills*: un `CLAUDE.md` en la raíz con el resumen del proyecto y cómo trabajamos, que sustituya a pegar `Prompt nuevo chat.md` en cada chat; y dos skills: `/probar-movil` (compilar, usuario de prueba con datos demo, capturas a 390 px y limpiar) y `/subir` (tests, diario, commit sin coautor ni prefijo y sin el prompt, y push)
- [x] **Más ejercicios de fuerza** (lo pidió David 2026-10-23): faltaban variantes de máquinas, mancuernas, kettlebell y gomas — *hecho 2026-10-23: 140 nuevos (896 → 1.036), pendiente de comprobar* → [[Decisiones#Más ejercicios de fuerza]]
- [x] **Las series bajaban al pasar a la siguiente** (lo vio David 2026-10-23): con el teclado abierto, el descanso aparecía en la cabecera fija y la hacía crecer; ahora flota debajo sin mover nada — *hecho 2026-10-23, pendiente de comprobar en el iPhone*
- [x] **«← Ejercicios» en la ficha llevaba al buscador** aunque vinieras de tu rutina (lo vio David 2026-10-23): ahora «← Volver» vuelve a la página de la que vienes, en todas las páginas de detalle — *hecho 2026-10-23, pendiente de comprobar* → [[Decisiones#Volver a donde estabas]]
- [x] **Pestaña del entreno en curso** (lo pidió David 2026-10-23): con un entreno empezado, encima de la barra de abajo sale «Entreno en curso» con el nombre, el tiempo y las series, y «Seguir →» vuelve a él desde cualquier sección — *hecho 2026-10-23, pendiente de comprobar* → [[Decisiones#Pestaña del entreno en curso y sin descanso]]
- [x] **Quitar el contador de descanso** del entreno en vivo (lo pidió David 2026-10-23) — *hecho 2026-10-23*
- [x] **Las secciones tardan en cargar, sobre todo el Plan** (lo vio David 2026-10-21) — *hecho 2026-10-23, pendiente de comprobar en el iPhone*: no era el servidor (pinta en ~30 ms) sino que cada sección se pedía al servidor de EE. UU. al tocarla. Ahora las secciones del menú y el plan llegan precargadas con tus datos: con 300 ms de latencia, de ~320-400 ms a 5-15 ms (el plan entero, 55 ms). También fuera código sin usar → [[Decisiones#Secciones precargadas con tus datos]]
- [x] **Cambiar una sesión de día** (lo pidió David 2026-10-23: «hoy no puedo la tirada, pero mañana sí»): «Cambiar de día» en cualquier sesión de hoy a una semana vista; si ese día ya hay otra, se intercambian; avisa si quedan dos fuertes seguidas y se puede deshacer — *hecho 2026-10-23, pendiente de comprobar* → [[Decisiones#Cambiar una sesión de día]]
- [ ] **Compartir en Instagram en otro formato** (no PNG; lo pidió David 2026-10-21). Opciones a decidir: JPEG (el que mejor trata Instagram), *sticker* con fondo transparente para ponerlo encima de una foto propia (como Strava), o vídeo corto con el recorrido animado; y que abra directamente las historias de Instagram
- [/] **Diseño**: hacer muchos diseños nuevos, porque la app se ve muy básica — *ronda 1 hecha 2026-10-20 (con la guía taste-skill y capturas a 390 px): Registrar como círculo con «+», tarjetas de datos más compactas, sin el botón repetido de registrar en Inicio, accesos de Fuerza en una sola lista; «Entrenamiento vacío» pasa a llamarse «Entrenamiento». Después: estilo deportivo (letra redondeada Rubik, naranja en el dato principal y en las gráficas) y repaso de todas las pantallas. Falta que David lo vea en el iPhone* → [[Decisiones#Rediseño, ronda 1]]

## 🧠 IA que aprende de ti (opción 2: sin entrenar el modelo) → [[Decisiones#IA que aprende de ti]]
- [x] Bloque 1 · Valoraciones (pulgar arriba/abajo con motivo) y memoria de preferencias que leen las tres IA; el chat apunta solo lo que le cuentas — *hecho 2026-10-10, pendiente de comprobar*
- [x] Bloque 2 · Ejemplos buenos en las instrucciones (few-shot), y las respuestas que valoras como ejemplos de lo que gusta y lo que no; el chat entrena con el material que nombras — *hecho 2026-10-11, pendiente de comprobar*
- [x] Bloque 3 · Que consulte el Estudio de entrenamiento (solo los apartados que vengan al caso) — *hecho 2026-10-11, pendiente de comprobar*

## 🧪 Batería de pruebas — *hecha 2026-10-10* → [[Decisiones#Batería de pruebas completa]]
- [x] Tests de la lógica: 236 (antes 96), con 120 combinaciones del planificador
- [x] Recorrido de todas las páginas en Chrome (móvil claro y oscuro, ordenador; usuario con datos, vacío, sin sesión y enlaces rotos)
- [x] Flujos de uso reales, también con la IA de verdad
- [x] Revocar la clave de OpenRouter de local que se pegó en el chat y crear otra (hecho 2026-10-10)
- [ ] Recargar saldo en OpenRouter: gpt-4o responde «sin saldo» y la fuerza con IA usa el modelo barato

## 🔧 Pendientes técnicos

- [x] Rotar el secreto de Google: el nuevo está en `.env.local` y en Vercel, y el antiguo se borró → [[Configuración#Google Cloud]]
- [x] Página `/privacidad` (pública) + **borrar mi cuenta** en Perfil → Editar
- [x] `CONTACT_EMAIL` en Vercel (se lee en cada visita) y app **publicada** en Google Cloud (En producción)
- [x] `OPENROUTER_API_KEY` en Vercel: comprobado en producción el 2026-10-09 («Ajustar con IA ahora» ajustó 3 sesiones). En `.env.local` no está, así que en local la IA no ajusta.
- [x] Región de funciones de Vercel = región de Upstash Redis (las dos en iad1)
- [x] Borrar el proyecto duplicado `stats-run` en Vercel (David dice que ya lo ha hecho)
