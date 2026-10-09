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

### Hacer aplicación
- [ ] Diseño
- [ ] Conectar con la app de Salud para datos más precisos

### IA / ciencia (salido del estudio)
- [ ] Carga por sRPE (RPE × minutos) cuando no hay FC — *candidato a Importante*
- [ ] El planificador aplica también el tope por sesión de Frandsen (no solo la IA)
- [ ] Desacople aeróbico (Pa:FC) en tiradas largas — necesita los streams de Strava
- [ ] VFC (HRV) diaria si se conecta con la app de Salud

### Experiencias de la app — *hecho 2026-10-09, pendiente de comprobar* → [[Decisiones#Etiquetas y repetición del recorrido]]
- [x] Flyover estilo Strava con la ruta seguida (repetición animada en 2D, cámara que sigue al corredor)
- [x] Etiquetas: nuevo récord, primer 5K/10K…, carrera más larga, más desnivel, mejor ritmo del mes, mayor carga

---

## 🔧 Pendientes técnicos

- [ ] Rotar el secreto de Google (se compartió en una captura) → [[Configuración#Google Cloud]]
- [ ] Página `/privacidad` para poder **publicar** la app en Google (ahora solo entran usuarios de prueba)
- [ ] Comprobar `OPENROUTER_API_KEY` en Vercel (sin ella la IA no ajusta nada)
- [ ] Región de funciones de Vercel = región de Upstash Redis
- [ ] Borrar el proyecto duplicado `stats-run` en Vercel (si no se usa)
