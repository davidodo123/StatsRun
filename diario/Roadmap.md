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

## ⏳ Fase 2 · Importante — *hecha 2026-10-09, pendiente de que David la compruebe* → [[Decisiones#Amigos, sesiones compartidas y mapas]]

- [x] Añadir amigos: **buscar perfiles** por nombre o @usuario con **solicitud de amistad** (el código de amigo sigue sirviendo)
- [x] Sección de sesiones de amigos: «Actividad de tus amigos» (14 días)
- [x] Sesiones compartidas: al registrar, «¿Con quién has entrenado?» → sale «👥 con Ana» y a Ana le aparece para añadirla a sus entrenos
- [x] Imagen de la sesión: **el mapa** del recorrido (Strava, GPX, TCX y FIT) en una página de detalle nueva

---

## 🔮 Fase 3 · Futuro

### Perfil — *hecho 2026-10-09, pendiente de que David lo compruebe* → [[Decisiones#Perfil con pestañas]]
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

### Experiencias de la app — *hecho 2026-10-09, pendiente de comprobar* → [[Decisiones#Etiquetas y repetición del recorrido]]
- [x] Flyover estilo Strava con la ruta seguida (repetición animada en 2D, cámara que sigue al corredor)
- [x] Etiquetas: nuevo récord, primer 5K/10K…, carrera más larga, más desnivel, mejor ritmo del mes, mayor carga

---

## 🔧 Pendientes técnicos

- [x] Rotar el secreto de Google: el nuevo está en `.env.local` y en Vercel, y el antiguo se borró → [[Configuración#Google Cloud]]
- [x] Página `/privacidad` (pública) + **borrar mi cuenta** en Perfil → Editar
- [x] `CONTACT_EMAIL` en Vercel (se lee en cada visita) y app **publicada** en Google Cloud (En producción)
- [x] `OPENROUTER_API_KEY` en Vercel: comprobado en producción el 2026-10-09 («Ajustar con IA ahora» ajustó 3 sesiones). En `.env.local` no está, así que en local la IA no ajusta.
- [x] Región de funciones de Vercel = región de Upstash Redis (las dos en iad1)
- [x] Borrar el proyecto duplicado `stats-run` en Vercel (David dice que ya lo ha hecho)
