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
- [ ] Desacople aeróbico (Pa:FC) en tiradas largas — necesita los streams de Strava
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

- [x] **Sección Sueño** en «Más»: a qué hora despertarse por ciclos de 90 min, o a qué hora acostarse — *hecho 2026-10-12, pendiente de comprobar*

## 📲 Fase 6 · Compartir la app (2026-10-12) → [[Decisiones#iPhone por enlace, Android por Play Store]]
**iPhone (David y sus amigos): enlace web + atajo, sin App Store (99 €/año)**
- [ ] 6.1 Atajo compartido por enlace de iCloud: David prepara una copia sin su clave y la comparte
- [ ] 6.2 En Perfil → Salud: «Copiar mi clave» + «Instalar el atajo» (enlace de iCloud) + guía corta de las dos automatizaciones
- [ ] 6.3 Bienvenida en Safari: cómo añadir la app a la pantalla de inicio en dos pasos

**Android: Google Play (25 $ una vez)**
- [ ] 6.4 Android Studio en el PC de David; Capacitor con la app actual dentro
- [ ] 6.5 Entrar con Google desde la app (pestaña del sistema y vuelta a la app; Google bloquea el inicio de sesión en vistas web)
- [ ] 6.6 Health Connect: pasos, calorías, sueño y pulso al abrir la app (sin atajos)
- [ ] 6.7 Prueba cerrada en Play (12 personas, 14 días, obligatorio en cuentas nuevas) y publicación

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
