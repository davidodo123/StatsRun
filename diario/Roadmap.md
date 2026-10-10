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
- [ ] Ampliar el atajo con VFC, pulso en reposo y sueño (para el diagnóstico de la IA)

### Carrera objetivo — *hecho 2026-10-09* → [[Decisiones#Recorrido de la carrera]]
- [x] Subir el recorrido de la carrera (.kmz, .kml, .gpx) → mapa con salida, meta y avituallamientos, distancia y desnivel
- [-] ~~Adjuntar PDFs de la carrera~~: descartado, no hace falta
- [x] Más de un plan → **temporada**: carreras secundarias B (a tope) y C (como entreno) dentro del plan de la principal → [[Decisiones#Temporada con varias carreras]]

### IA / ciencia (salido del estudio)
- [x] Carga por sRPE (RPE × minutos) cuando no hay FC — *ya existía en `load.ts`*
- [x] El planificador aplica también el tope por sesión de Frandsen: la tirada larga sube como mucho un 10 % (mín. 0,5 km)
- [ ] Desacople aeróbico (Pa:FC) en tiradas largas — necesita los streams de Strava
- [ ] VFC (HRV) diaria si se conecta con la app de Salud

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
- [x] Crear, editar, duplicar y borrar rutinas (las carpetas quedan para más adelante)
- [x] Empezar entreno (vacío o desde rutina): series con «anterior», kg, repeticiones, RIR y ✓; tipos de serie (calentamiento, normal, descendente, al fallo)
- [/] Temporizador de descanso ✓ · superseries y notas por ejercicio pendientes
- [x] Se guarda como actividad de fuerza (cuenta en la carga, el feed y los logros)

### 4.3 · Progreso — *hecho 2026-10-10, pendiente de comprobar* → [[Decisiones#Progresión doble y récords de fuerza]]
- [x] Por ejercicio: 1RM estimado, mejor serie, volumen, historial y récords — *en la ficha de cada ejercicio; pendiente de comprobar* → [[Decisiones#Progreso por ejercicio]]
- [x] Progresión doble: peso y repeticiones propuestos al empezar — *pendiente de comprobar*
- [x] Series por músculo a la semana y mapa de músculos (portada de Fuerza) → [[Decisiones#Series por músculo, medidas y discos]]
- [x] Medidas corporales (peso, % de grasa, perímetros) y calculadora de discos

### 4.4 · Entrenador IA de fuerza (chat)
- [x] En el plan: «Fuerza con IA» (material + lo que sabe hacer) → rutinas base y fuerza por tipo que el plan coloca solas → [[Decisiones#Fuerza con IA en el plan]]
- [ ] Chat de fuerza también para quien no corre (sección Fuerza)
- [x] Con plan de carrera: encaja la fuerza en el plan (hasta 4 días; pierna, posterior + pliometría, superior + core; nunca antes de la tirada larga o de una sesión clave)
- [x] El planificador usa las rutinas del usuario (por zona) y plantillas distintas por tipo; hasta 3 días → [[Decisiones#Fuerza del plan con tus rutinas]]

### 4.5 · Usuarios que solo hacen fuerza
- [ ] Alta sin carrera ni plan de running; Inicio y menú según lo que haga cada uno

---

## ⚡ Repaso de rendimiento y sin emojis — *hecho 2026-10-10, pendiente de comprobar* → [[Decisiones#Sin emojis y app más rápida]]
- [x] Quitar todos los emojis: iconos SVG propios (`components/icons.tsx`)
- [x] Gráficas sin Recharts (SVG propio): unos 400 KB menos de JS en Inicio, Perfil, Estadísticas y rutinas
- [x] Lista de ejercicios en el JS en caché en vez de en cada página (Ejercicios 211 → 66 KB, Entreno 183 → 39 KB)
- [x] Caché de navegación de 30 s y precarga de páginas en el service worker
- [-] ~~Mover Vercel y Redis a Europa~~: descartado, la base de Upstash en Europa no tiene plan gratis en Vercel y David prefiere seguir gratis en iad1

## 🔧 Pendientes técnicos

- [x] Rotar el secreto de Google: el nuevo está en `.env.local` y en Vercel, y el antiguo se borró → [[Configuración#Google Cloud]]
- [x] Página `/privacidad` (pública) + **borrar mi cuenta** en Perfil → Editar
- [x] `CONTACT_EMAIL` en Vercel (se lee en cada visita) y app **publicada** en Google Cloud (En producción)
- [x] `OPENROUTER_API_KEY` en Vercel: comprobado en producción el 2026-10-09 («Ajustar con IA ahora» ajustó 3 sesiones). En `.env.local` no está, así que en local la IA no ajusta.
- [x] Región de funciones de Vercel = región de Upstash Redis (las dos en iad1)
- [x] Borrar el proyecto duplicado `stats-run` en Vercel (David dice que ya lo ha hecho)
