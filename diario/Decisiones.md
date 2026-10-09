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

## Registro manual en vez de captura
*2026-10-09*

- Se quitó «rellenar desde captura» (IA leyendo imágenes). Los datos se copian de Strava a mano: más fiable y sin gastar IA.
- Con dos de distancia / tiempo / ritmo se calcula el tercero. La cadencia sale de los pasos.

## Datos en Redis con control de versiones
*2026-10-09*

- Un documento JSON por usuario en Upstash Redis. Cada escritura comprueba que nadie ha escrito entre medias (si no, reintenta): evita que la IA y el usuario se pisen cambios.
