---
name: subir
description: Subir a GitHub (y desplegar en Vercel) un cambio de Zancavolt — pruebas, diario al día, commit con las reglas de David y push. Úsala cuando David diga «súbelo», «sí» a subirlo, o pida subir lo hecho.
---

# Subir

Solo si David lo ha pedido o ha dicho «sí» a subirlo (o ha dejado dicho que se vaya subiendo). Cada push a `main` despliega solo en Vercel.

## 1. Comprobaciones
```bash
npx tsc --noEmit && npx eslint src && npx vitest run && npm run build
```
Si algo falla, no se sube: se arregla o se le dice a David.

## 2. Diario al día (`diario/`)
- `Roadmap.md`: marca lo hecho (`[x]`, o `[/]` si queda a medias, con fecha y «pendiente de comprobar» si David no lo ha visto). Lo nuevo, a su fase o a `Ideas.md`.
- `Decisiones.md`: cada decisión con alternativas, con fecha (`## Título` + `*AAAA-MM-DD*`), y enlázala desde la tarea: `→ [[Decisiones#Título]]`.
- `Diario/AAAA-MM-DD.md` (plantilla en `Plantillas/Día.md`): qué se ha hecho, problemas, desplegado (commits) y siguiente paso.
- Si cambia la fase, actualiza «Fase actual» en `Inicio.md`.
- Nada de claves, contraseñas ni tokens en el diario.

## 3. Commit y push
```bash
git add -A -- . ":!diario/Prompt nuevo chat.md" ":!capacitor-web/index.html" ":!src/lib/knowledge/estudio.json"
git commit -m "Qué cambia para David, en español"
git push
```
- **Nunca** `git add diario` ni subir `diario/Prompt nuevo chat.md`.
- Mensaje en español, sin prefijos («feat:», «fix:»…) y **sin `Co-Authored-By` ni ninguna atribución a Claude**.
- Antes de hacer commit, mira `git status --short`: que no vaya nada raro (datos de `data/`, capturas, `.env*`).

## 4. Después
- Apunta el hash del commit en «Desplegado» de la nota del día (va en el siguiente commit).
- Dile a David qué se ha subido y qué tiene que comprobar en el móvil.
