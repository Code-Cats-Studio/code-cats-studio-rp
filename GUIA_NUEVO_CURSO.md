# Cómo crear un curso nuevo (ejemplo: JavaScript)

Un curso vive en **dos lugares** que se enlazan por el `slug`:
- **Frontend (este repo):** el contenido que se lee (lecciones MDX) y la tarjeta del curso.
- **Base de datos (Supabase):** el curso y sus *ediciones*, que permiten inscripciones, grupos, tareas, notas y certificados.

## 1. Frontend: archivos
1. **Imagen de la mascota:** `public/images/mascot/<nombre>.png` (en kebab-case, sin espacios).
2. **Ficha del curso:** `src/content/courses/<slug>.json`
   ```json
   {
     "slug": "javascript", "title": "JavaScript", "subtitle": "…", "description": "…",
     "duration": "4 semanas · 12 clases · 18 horas", "level": "No se requiere experiencia previa",
     "mascotImage": "gato-js-1", "accentColor": "#F7DF1E",
     "sections": 4, "lessons": 12, "comingSoon": true, "startDate": "Por definir"
   }
   ```
   `mascotImage` es el nombre del PNG sin la extensión. `sections` y `lessons` se cuentan a mano.
3. **Secciones:** una carpeta por sección, `src/content/lessons/<slug>/NN-nombre-seccion/section.json`
   ```json
   { "title": "Fundamentos de JavaScript", "order": 1, "duration": "4h 30min", "color": "#facc15" }
   ```
4. **Lecciones:** `src/content/lessons/<slug>/NN-nombre-seccion/NN-nombre-leccion.mdx`
   ```mdx
   ---
   title: "Variables y tipos"
   description: "Una línea que resume la lección."
   order: 1
   section: "fundamentos-javascript"   # nombre de la carpeta de la sección SIN el número
   type: "theory"                      # theory | practice | challenge | setup | tool
   duration: "1h 30min"
   topics:
     - "let y const"
   ---
   Aquí va el contenido en Markdown…
   ```
   El orden sale de `order`. Los slugs de URL salen de los nombres de carpeta y archivo.
5. Comprueba con `npm run build` y abre `/<slug>`.

## 2. Base de datos: curso y edición
- Ejecuta un seed como `supabase/seeds/curso_javascript.sql` (copia y cambia el slug y los textos). Crea el curso publicado y una edición en **borrador**.
- El `slug` debe ser **idéntico** al del JSON.

## 3. Abrir inscripciones (desde la página, sin SQL)
1. `/admin` → **Ediciones de cursos** → cambia el estado a *Inscripciones abiertas* (esto avisa por correo a todos los usuarios) y ajusta el cupo.
2. `/admin` → **Grupos y horarios**: crea un grupo por docente con sus días, hora y enlace de clase.
3. Los estudiantes se inscriben en `/<slug>` eligiendo su horario.
4. El docente programa las clases en `/docente` → **Clases y horario**.
5. Al terminar: **Cerrar notas** y **Emitir certificados** en `/admin`.

## Lista de revisión
- [ ] `slug` igual en el JSON, la carpeta de lecciones y la base de datos
- [ ] `section` del frontmatter = carpeta de la sección sin número
- [ ] La imagen está en `public/images/mascot/` y el nombre coincide con `mascotImage`
- [ ] `npm run build` pasa
- [ ] Edición creada en la base y abierta desde `/admin`
