---
tags: [suscripcion]
---
# 💳 Suscripción: qué es gratis y qué de pago

Propuesta para decidir (2026-10-23). Nada está hecho todavía; las tareas están en el [[Roadmap]] (sección «Suscripción»). Los costes de servidor y base de datos, en [[Infraestructura]].

> [!info] Criterio
> De pago: lo que **cuesta dinero por usuario** (la IA) y lo **avanzado**. Gratis: todo lo necesario para entrenar y apuntar. Si la versión gratis no sirve para entrenar, la gente se va antes de probar lo bueno.

## Propuesta: Gratis vs Premium

| | **Gratis** | **Premium** |
|---|---|---|
| **Plan de carrera** | Un plan hacia una carrera (VDOT, fases, ritmos) | Temporada con varias carreras (A, B, C) |
| **Ajustes del plan** | «No puedo ese día», «Cambiar de día» | **La IA reajusta los próximos 14 días** con tus datos, sensaciones y salud |
| **Entrenador IA (chat)** | 3 mensajes de prueba | Sin límite: registra entrenos, crea rutinas, cambia el plan |
| **Fuerza** | Catálogo completo, rutinas (hasta 3), entreno en vivo, EMOM | Rutinas sin límite, **Fuerza con IA** (rutinas hechas para tu material), fuerza encajada en el plan |
| **Registrar** | Manual, GPS (también con la pantalla apagada en Android), importar archivos | Importar todo el historial de Strava de una vez |
| **Estadísticas** | Semana, mes, mejores tiempos | Forma y fatiga, diagnóstico de estado (descargar, recuperar…), desacople aeróbico, tabla de mejora, previsión de tiempo |
| **Salud** | Pasos y calorías | VFC, pulso en reposo y sueño en el diagnóstico de la IA |
| **Compartir** | Imagen de historia | Sticker sin fondo y vídeo del recorrido |
| **Amigos** | Todo (cuanta más gente, mejor para todos) | — |
| **Carreras** | Buscar y ver recorridos | Subir el recorrido de tu carrera |

**Por qué así**
- La **IA es lo único que cuesta dinero por usuario** (OpenRouter): sin suscripción, cada usuario gratis que la usa mucho es una pérdida.
- **Amigos y registrar** deben ser gratis: es lo que hace que la gente entre e invite a otros.
- Lo «de análisis» (forma y fatiga, diagnóstico) es lo que pagan los corredores que ya entrenan en serio.

## Precio (orientativo)
- Referencias (aprox., comprobar antes de decidir): Strava ~12 €/mes, Runna ~20 €/mes, apps de fuerza tipo Hevy ~8 €/mes.
- Propuesta: **3,99 €/mes o 29,99 €/año**, con **14 días de prueba** gratis.
- Coste por usuario Premium: IA (según uso, céntimos a 1-2 €/mes) + su parte de servidor y base de datos.

## Cómo se cobraría
- **RevenueCat** (propuesta 2026-10-23 → [[Decisiones#Herramientas: ScreensDesign, PostHog y RevenueCat]]): junta en un único «premium» la web/iPhone (su Web SDK cobra con tu cuenta de Stripe e incluye pantalla de pago y portal para cancelar) y Android (Google Play Billing). Gratis hasta 2.500 $/mes de ingresos; después, 1 %. Más la comisión de Stripe en Europa: ~1,5 % + 0,25 € por pago.
- Alternativa sin RevenueCat: **Stripe** a mano (Checkout + portal del cliente + webhook); solo vale para la web.
- **iPhone**: la app es una web instalada, no está en la App Store → se cobra con Stripe **sin la comisión de Apple**.
- **Android (Google Play)**: ⚠️ Google obliga a cobrar las suscripciones digitales **dentro de la app** con **Google Play Billing** (15 % en suscripciones). Opciones: (a) en la app de Android no enseñar «Suscribirse», que se haga desde la web; (b) usar Play Billing en la app. Decidir antes de publicar en Play.
- En el código: `Db.subscription` (o lo que diga RevenueCat por su webhook) y una comprobación `isPremium()` en servidor para cada función de pago (nunca solo en la pantalla).
- **Diseño de la pantalla de pago**: tomar de modelo la de **Runna** (ScreensDesign).

## Antes de cobrar (requisitos)
- **Darse de alta para facturar** (autónomo o empresa) y el **IVA** de cada país de la UE (Stripe Tax o ventanilla única OSS).
- **Vercel Pro** (20 $/mes): el plan Hobby no permite uso comercial → [[Infraestructura]].
- **Condiciones de uso** y actualizar la **política de privacidad** (pagos, Stripe).
- Política de **cancelación y devoluciones** (en la UE, 14 días de desistimiento salvo que se renuncie al empezar a usarlo).
- Los usuarios actuales (David y amigos): Premium gratis para siempre o un tiempo.

## Preguntas abiertas
- ¿Qué entra de verdad en Premium? (la tabla es una propuesta)
- ¿Precio y prueba gratis?
- ¿Android: cobrar con Play Billing o solo desde la web?
- ¿Cuándo? Tiene sentido cuando haya usuarios fuera del grupo de amigos.
