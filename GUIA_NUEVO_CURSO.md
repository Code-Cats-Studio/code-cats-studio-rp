# Cómo crear un curso nuevo (desde la web, sin SQL)

Todo se hace en **`/admin`** con una cuenta de administrador. Los cursos viven en la base de datos: el catálogo, la página
del curso, las lecciones, las inscripciones, los grupos, las clases y los certificados salen de ahí.

## 1. Crear el curso
`/admin` → sección **Cursos** → **Crear curso**. Los campos siguen el formato de los cursos del proyecto:

| Campo | Para qué sirve |
|---|---|
| Título y **enlace** | El enlace es la dirección: `javascript-basico` → `/javascript-basico`. Solo minúsculas, números y guiones. No puede repetirse ni llamarse como una página de la plataforma (`admin`, `login`, `cursos`…). |
| Subtítulo y descripción | Se ven en la tarjeta y en la página del curso. |
| Nivel, tema, duración | Ej. duración: `4 semanas · 12 clases · 18 horas`. |
| Mascota y color | Imagen de la tarjeta (`public/images/mascot/`) y color de acento. |
| Qué aprenderás | Una línea por objetivo. Si lo dejas vacío se muestran los nombres de los módulos. |

## 2. Módulos y lecciones
- **Agregar módulo** (sección del curso: título, duración y color) y **Agregar lección** dentro de cada módulo.
- Cada lección tiene título, tipo (teoría, práctica, desafío…), duración, descripción corta, **temas** (uno por línea),
  **contenido en Markdown** y, si quieres, un **video de YouTube** (pega el enlace del video «No listado»).
- Con video, el avance se mide por lo que el estudiante ve. Sin video, el estudiante pulsa «Marcar como completada».
- «Vista previa gratuita» deja que cualquiera lea esa lección sin inscribirse.
- Con **↑ ↓** reordenas módulos y lecciones. **Importar archivo .mdx** carga una lección escrita con el formato de los
  archivos del proyecto (frontmatter con `title`, `description`, `type`, `duration`, `topics` y el texto).
- Markdown que entiende: `#` títulos, listas con `-` o `1.`, `**negrita**`, `*cursiva*`, `` `código` ``, bloques con ```` ``` ````,
  citas con `>`, enlaces `[texto](https://…)` e imágenes `![alt](https://…)`.

## 3. Guardar y publicar
- **Guardar curso** crea o actualiza todo de una vez. Mientras no marques **Publicado**, solo lo ves tú.
- Para publicar necesita al menos un módulo con una lección.
- Puedes editar el curso cuando quieras. Si ya hay estudiantes con progreso, no se pueden quitar las lecciones que ya vieron.

## 4. Edición (cuándo se dicta y cuántos cupos hay)
En la misma página, sección **Ediciones** → **Nueva edición**: nombre, cupo, fechas de inscripción y del curso, nota mínima
para aprobar y, si quieres, asistencia o avance mínimos.
- Estado **Borrador**: nadie la ve. **Inscripciones abiertas**: aparece en el catálogo con el botón de inscribirse y se avisa
  por correo a todos los usuarios (el curso debe estar publicado).

## 5. Después de abrir
1. `/admin` → **Grupos y horarios**: un grupo por docente con sus días, hora y enlace de clase (Meet, Zoom o Teams).
2. Los estudiantes se inscriben en `/<enlace>` eligiendo horario.
3. El docente programa las clases en `/docente` → **Clases y horario**. Cada clase avisa por correo al grupo.
4. En clase: el docente genera un código de asistencia (o marca la lista a mano).
5. Al terminar: `/admin` → **Cerrar notas** y **Emitir certificados**.

## Nota para quienes programan
Los cursos que viven como archivos (`src/content/courses/*.json` y `src/content/lessons/…`) siguen funcionando, pero ya no
hace falta crear cursos así. Un curso de la base no debe usar el mismo enlace que uno de esos archivos.
