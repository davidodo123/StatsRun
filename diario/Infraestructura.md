---
tags: [infraestructura]
---
# 🏗️ Infraestructura: base de datos, servidor y costes

Qué hay ahora, hasta dónde llega gratis y qué cambiar según crezca la app. Las tareas concretas están en el [[Roadmap]] (sección «Infraestructura»).

> [!info] Resumen
> Con los planes gratis aguanta **unas decenas de usuarios que entren a diario** (20-50). Con unos pocos euros al mes, **cientos**. Para miles, o si se cobra, hay que cambiar la base de datos y el plan de Vercel.

## Cómo está montado hoy

| Pieza | Qué es | Plan |
|---|---|---|
| **Vercel** (iad1, EE. UU.) | El servidor: la web y la API | Hobby (gratis) |
| **Upstash Redis** (iad1) | La base de datos: un documento JSON por usuario + uno con **todos** los usuarios y amistades | Gratis |
| **Fotos** | En Redis también, aparte del documento (`photoStore`) | — |
| **OpenRouter** | La IA (plan, Entrenador, fuerza) | De pago por uso (saldo) |
| **GitHub** (repo privado) | Copia de seguridad cifrada cada noche | Gratis |
| **Google Cloud** | Iniciar sesión con Google | Gratis |

Más detalles (variables, servicios): [[Configuración]].

## Dónde está el límite

### 1. Peticiones a la base de datos (lo primero que se acaba)
- Cada pantalla lee tus datos; con la precarga (2026-10-23), cada pantalla precarga también las secciones del menú.
- Cálculo aproximado: **500-800 peticiones al día** por usuario que la use a diario.
- El plan gratis de Upstash (cuando se miró: unas **500.000 al mes**) da para **20-30 usuarios diarios**.
- 👉 Mirar en el panel de Upstash las peticiones del mes y el espacio usado para saber el margen real.

### 2. Espacio
- Un año de entrenos ≈ **100-500 kB** por usuario (más si llevan recorrido GPS). Las fotos ocupan más.
- Plan gratis (cuando se miró: **256 MB**) → **varios cientos de usuarios**.

### 3. Servidor (Vercel)
- Hobby incluye 1 millón de llamadas al mes: sobra para cientos de usuarios.
- ⚠️ **Hobby solo permite uso no comercial.** Si se cobra o crece mucho → **Pro, 20 $/mes**.
- Servidor y base de datos están en EE. UU. y David en España: ~300 ms por petición. La precarga lo tapa casi siempre. Pasarlo a Europa se descartó por coste → [[Decisiones#Sin emojis y app más rápida]].

### 4. IA
- No limita usuarios, pero **cada ajuste y cada mensaje cuesta saldo**. Con muchos usuarios es lo más caro.
- Medidas posibles: límite de mensajes al día por usuario, modelo barato por defecto, ajuste del plan solo cuando cambian datos.

### 5. El propio código
- **Un único documento con todos los usuarios**: bien hasta unos cientos o pocos miles; después, buscar amigos y las solicitudes se vuelven lentos y las escrituras chocan.
- Cada usuario guarda **todo en un JSON**: se lee entero en cada pantalla. Con años de actividades con GPS, cada lectura pesa más.
- Sin panel de administración: no hay forma de ver usuarios, uso o errores sin entrar en Upstash o Vercel.

## Qué hacer según crezca

| Usuarios activos | Qué cambiar | Coste aprox. |
|---|---|---|
| **Hasta ~20** (David y amigos) | Nada | 0 € + IA |
| **20-100** | Upstash a **pago por uso**; vigilar el panel | Pocos €/mes + IA |
| **100-500** | Vercel **Pro**; separar actividades con GPS del documento del usuario; límite de uso de la IA | ~20-40 €/mes + IA |
| **Más de 500** o cobrar | Base de datos de verdad (**Postgres**: Neon o Supabase, tienen plan gratis) con tablas de usuarios, amistades, actividades y planes; fotos en un almacén de archivos (Vercel Blob o R2) | ~30-60 €/mes + IA |

## Herramientas de administración que faltan
- **Panel de administración** (solo David): nº de usuarios, activos esta semana, tamaño de cada documento, uso de la IA, última copia de seguridad.
- **Métricas y avisos de errores: PostHog** (gratis: 1 M de eventos, 5.000 grabaciones y 100.000 errores al mes) → [[Decisiones#Herramientas: ScreensDesign, PostHog y RevenueCat]]. Sin datos de salud, con consentimiento y en servidor de Europa.
- **Alertas de límites**: Upstash y Vercel avisan por correo al acercarse al límite; activarlas.
- **Prueba de restaurar la copia** de vez en cuando (`scripts/backup-restore.mjs`).
