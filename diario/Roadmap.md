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
- [x] *Extra:* fallos de seguridad y datos (secreto de sesión, escrituras simultáneas en Redis)

Detalle en [[2026-10-09]].

---

## ⏳ Fase 2 · Importante — *siguiente*

- [/] Añadir amigos — ya existe con **código de amigo** (6 letras); falta poder **buscar perfiles**
- [ ] Sección de sesiones de amigos (ver sus entrenos)
- [ ] Sesiones compartidas: al registrar, «añadir a otra persona» buscando su perfil → aparece con quién lo hiciste
- [ ] Imagen de la sesión: **el mapa** del recorrido

---

## 🔮 Fase 3 · Futuro

### Perfil
- [ ] Mejores tiempos
- [ ] Sesiones recientes
- [ ] Apartados Running y Fuerza
- [ ] Apartado con todas las sesiones hechas
- [ ] Tabla de mejora con medias a partir de los datos
- [ ] Ver la preparación (plan) que estás haciendo
- [ ] Logros
- [ ] Modificación del perfil (promedios)

### Hacer aplicación
- [ ] Diseño
- [ ] Conectar con la app de Salud para datos más precisos

### Experiencias de la app
- [ ] Flyover estilo Strava con la ruta seguida
- [ ] Etiquetas: nuevo récord, mejor puntuación, etc.

---

## 🔧 Pendientes técnicos

- [ ] Rotar el secreto de Google (se compartió en una captura) → [[Configuración#Google Cloud]]
- [ ] Página `/privacidad` para poder **publicar** la app en Google (ahora solo entran usuarios de prueba)
- [ ] Comprobar `OPENROUTER_API_KEY` en Vercel (sin ella la IA no ajusta nada)
- [ ] Región de funciones de Vercel = región de Upstash Redis
- [ ] Borrar el proyecto duplicado `stats-run` en Vercel (si no se usa)
