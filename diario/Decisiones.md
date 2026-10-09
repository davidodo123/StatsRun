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

## Registro manual en vez de captura
*2026-10-09*

- Se quitó «rellenar desde captura» (IA leyendo imágenes). Los datos se copian de Strava a mano: más fiable y sin gastar IA.
- Con dos de distancia / tiempo / ritmo se calcula el tercero. La cadencia sale de los pasos.

## Datos en Redis con control de versiones
*2026-10-09*

- Un documento JSON por usuario en Upstash Redis. Cada escritura comprueba que nadie ha escrito entre medias (si no, reintenta): evita que la IA y el usuario se pisen cambios.
