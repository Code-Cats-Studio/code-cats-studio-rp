# Cursos, ediciones y clases: todo desde la web

Los cursos viven en la base de datos. Todo se hace desde la página; no hace falta SQL ni tocar archivos.

| Quién | Dónde | Qué hace |
|---|---|---|
| Admin | `/admin` → **Cursos** | Crea, importa y edita cursos; crea ediciones; asigna docentes, grupos y horarios |
| Docente principal | `/docente` → **5. Mis cursos** | Edita el contenido de su curso, programa clases, pasa lista, crea tareas y material, ve a sus estudiantes |
| Docente de apoyo | `/docente` → **4. Clases y horario** | Programa las clases de su grupo y pasa lista |
| Estudiante | `/mis-cursos` | Ve sus clases, entra a Meet, marca asistencia con el código, entrega tareas |

## 0. Si el curso ya existe en la página pero no en la base
Los cursos antiguos (Git y GitHub, HTML y CSS) vivían como archivos del código, por eso no se podían editar.
`/admin` → **Cursos**: aparece el aviso «Cursos que todavía viven en el código» con el botón **Importar a la base**.
Copia sus módulos y lecciones; desde ese momento la base manda y se editan en la web. Los textos de las lecciones
quedan como estaban (muchas dicen «Contenido en desarrollo»: ahí los docentes escriben el contenido real).

## 1. Crear un curso nuevo
`/admin` → **Cursos** → **Crear curso**.

| Campo | Para qué sirve |
|---|---|
| Título y **enlace** | El enlace es la dirección: `javascript-basico` → `/javascript-basico`. Solo minúsculas, números y guiones. No puede repetirse ni llamarse como una página de la plataforma (`admin`, `login`, `cursos`…). |
| Subtítulo y descripción | Se ven en la tarjeta y en la página del curso. |
| Nivel, tema, duración | Ej. duración: `4 semanas · 12 clases · 18 horas`. |
| Mascota y color | Imagen de la tarjeta y color de acento. |
| Qué aprenderás | Una línea por objetivo. Si lo dejas vacío se muestran los nombres de los módulos. |

**Módulos y lecciones:** cada lección tiene título, tipo, duración, descripción, temas, contenido en Markdown y, si quieres,
un video de YouTube «No listado» (con video el avance se mide por lo que ve el estudiante; sin video, el estudiante pulsa
«Marcar como completada»). «Vista previa gratuita» la deja leer a cualquiera. **Importar archivo .mdx** carga una lección
escrita con el formato de los archivos del proyecto. Markdown que entiende: `#` títulos, listas, `**negrita**`, `*cursiva*`,
`` `código` ``, bloques con ```` ``` ````, citas con `>`, enlaces e imágenes con https.

Marca **Publicado** y pulsa **Guardar curso**. Para publicar necesita al menos un módulo con una lección.

## 2. Edición y gestión (admin)
En la misma página, sección **Ediciones** → **Nueva edición** (nombre, cupo, fechas, nota mínima, asistencia o avance mínimos).
Con **Gestionar** se abre todo lo de esa edición:

1. **Docentes y horarios:** agrega al **docente principal** y a los de apoyo; crea un grupo por docente con sus días, hora y
   enlace de clase (Meet, Zoom o Teams). Los estudiantes eligen horario al inscribirse.
2. **Clases y asistencia:** programa clases para un grupo o para toda la edición (avisa por correo con el enlace y el
   calendario) y abre la lista de asistencia de cada clase.
3. **Estudiantes:** avance y asistencia de cada uno; el admin cambia su grupo o los da de baja.
4. **Tareas y material:** crea tareas (fecha, puntaje, peso, grupo) y material (enlaces a Drive, GitHub…).

Estado **Inscripciones abiertas** → el curso aparece en la home y en `/cursos` con el botón de inscribirse, y se avisa por correo
a todos los usuarios (el curso debe estar publicado).

## 3. Durante y después
- **Asistencia:** el docente genera un código de 6 dígitos en `/docente` (1. Asistencia en vivo); el estudiante lo escribe en
  **Mis cursos → Próximas clases**. También se puede marcar a mano en la lista.
- **Notas y certificados:** `/admin` → **Ediciones de cursos** → **Cerrar notas** y **Emitir certificados**.

## Permisos del docente principal
Puede editar títulos, descripciones, módulos y lecciones de su curso. No puede cambiar el enlace, el nivel, el tema, la
publicación ni las ediciones, y no puede quitar lecciones que ya tienen progreso de estudiantes.
