# Guía para el frontend (React + Vite + supabase-js)

El backend es Supabase. **No hay un servidor propio**: el frontend habla directo con Supabase usando la *anon key*. Las reglas de seguridad (quién puede ver y hacer qué) viven en la base de datos, así que si una llamada no está permitida, Supabase devuelve error o una lista vacía.

Los errores de negocio llegan en español en `error.message` (ej. "Ya estás inscrito en esta edición", "Completa tu perfil…"): se pueden mostrar tal cual.

> **Cobros: ignorar por ahora.** Las columnas `price_cents`, `currency` y la tabla `orders` existen pero el frontend no debe mostrarlas ni usarlas.

## 0. Instalación

```bash
npm i @supabase/supabase-js
```

```js
// src/lib/supabase.js
import { createClient } from "@supabase/supabase-js";
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);
export const FUNCTIONS_URL = import.meta.env.VITE_FUNCTIONS_URL;
```

## 1. Rutas que los correos esperan

| Ruta | Para qué |
|---|---|
| `/verificar/:code` | Verificación pública de un certificado (también va en el QR del PDF) |
| `/cursos` | Catálogo (enlace del correo "nuevo curso") |
| `/mis-cursos` | Cursos del estudiante |
| `/perfil` | Perfil y preferencias de notificación |

## 2. Login y perfil

```js
// Login con Google
await supabase.auth.signInWithOAuth({
  provider: "google",
  options: { redirectTo: window.location.origin },
});

// Sesión actual
const { data: { session } } = await supabase.auth.getSession();
supabase.auth.onAuthStateChange((_event, session) => { /* actualizar estado */ });

// Cerrar sesión
await supabase.auth.signOut();
```

Al primer login se crea el perfil solo (con nombre, correo y foto de Google). **Antes de inscribirse**, el usuario debe completar su perfil: `profile_completed` es `true` solo cuando hay nombre, CI, fecha de nacimiento y términos aceptados.

```js
const { data: me } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
if (!me.profile_completed) { /* mostrar formulario "Completa tu perfil" */ }

await supabase.from("profiles").update({
  full_name: "María Quispe Mamani",
  document_number: "1234567",
  document_complement: "1A",                // opcional
  document_issued_region_id: 1,             // departamento de emisión (tabla regions)
  birth_date: "2001-05-14",
  phone: "70000000",                        // opcional
  institution: "UMSA", degree: "Informática", // opcionales
  terms_accepted_at: new Date().toISOString(), // al marcar "acepto términos y privacidad"
}).eq("id", session.user.id);
```

El usuario **no puede** cambiar su correo, estado ni roles (la base lo ignora). Para saber si es admin/docente:

```js
const { data: roles } = await supabase.from("user_roles").select("role");  // ['student','teacher','admin']
```

Preferencias de notificación: tabla `notification_preferences` (una fila por usuario):
`email_course_news`, `email_class_reminders`, `email_certificates`, `email_birthday`.

## 3. Catálogo público (funciona sin login)

```js
// Cursos publicados con sus ediciones
const { data } = await supabase.from("courses")
  .select("*, topics(name), course_offerings(id,label,status,modality,capacity,starts_on,ends_on,enrollment_closes_at)")
  .eq("is_published", true);

// Sílabo (módulos y lecciones, solo títulos y duración)
await supabase.from("course_syllabus").select("*").eq("course_id", courseId)
  .order("module_position").order("lesson_position");

// Docentes de una edición
await supabase.from("offering_teachers").select("*").eq("offering_id", offeringId);

// Rutas de aprendizaje y eventos
await supabase.from("tracks").select("*, track_courses(position, courses(*))");
await supabase.from("events").select("*").eq("is_published", true).order("starts_at");
```

Cupos disponibles de una edición (público, solo cifras):

```js
await supabase.from("offering_availability").select("capacity,taken,available").eq("offering_id", offeringId);
```
Si `available` es 0, muestren "Lista de espera": la inscripción igual funciona y queda en `waitlisted`.

## 4. Inscripción

```js
const { data: status, error } = await supabase.rpc("enroll_in_offering", { p_offering: offeringId });
// status: 'active' | 'waitlisted'  (| 'pending_payment' cuando existan cobros)
// error.message en español si el curso no está abierto, el cupo, la cuenta suspendida, etc.

await supabase.rpc("drop_my_enrollment", { p_offering: offeringId });   // darse de baja

// Mis inscripciones
await supabase.from("enrollments")
  .select("id,status,group_id,final_score, course_offerings(id,label,status, courses(title,slug,cover_url))")
  .order("enrolled_at", { ascending: false });

// Mi avance en una edición
const { data } = await supabase.rpc("get_my_progress", { p_offering: offeringId });
// [{ enrollment_id, status, group_id, group_name, progress_pct, attendance_pct, final_score }]
```

Reglas que aplica la base: cupo (y lista de espera automática), ventana de inscripción, máximo de cursos activos por estudiante (configurable) y que un docente no puede ser estudiante de su misma edición. Si alguien se da de baja, el primero de la lista de espera sube solo y recibe aviso.

## 5. Contenido, videos de YouTube y progreso

Solo los inscritos pueden leer módulos, lecciones, videos y materiales (si no, vienen vacíos).

```js
const { data } = await supabase.from("modules")
  .select("id,title,position, lessons(id,title,position,content_md,completion_threshold,is_preview, videos(external_id,duration_seconds))")
  .eq("course_id", courseId).order("position");
```

**Reproductor**: usar YouTube IFrame API con dominio de privacidad ampliada y reportar solo los segundos realmente reproducidos (el servidor limita a 60 s por envío y cuenta la lección como vista al llegar al % configurado):

```js
// <iframe src="https://www.youtube-nocookie.com/embed/VIDEO_ID?enablejsapi=1" ...>
let playing = false, last = 0;
const flush = async (player, lessonId) => {
  if (!last) return;
  const delta = Math.round((Date.now() - last) / 1000);
  last = playing ? Date.now() : 0;
  if (delta > 0) {
    const { data: completed } = await supabase.rpc("report_watch_time", {
      p_lesson: lessonId,
      p_delta_seconds: delta,
      p_duration_seconds: Math.round(player.getDuration()),   // la 1.ª vez fija la duración del video
    });
    if (completed) { /* marcar la lección como completada en la UI */ }
  }
};
// onStateChange: PLAYING -> playing = true; last = Date.now();   otro estado -> playing = false; flush(...)
// además: setInterval(() => flush(player, lessonId), 15000) mientras playing sea true
```

Los videos se suben a YouTube como **"No listado"** y en la base solo se guarda su ID (`videos.external_id`).

## 6. Clases en vivo y asistencia

```js
// Próximas clases
await supabase.from("live_sessions").select("*").eq("offering_id", offeringId).order("starts_at");

// Estudiante: registrar asistencia con el código que dicta el docente en clase (6 dígitos)
await supabase.rpc("checkin", { p_session: sessionId, p_code: "123456" });

// Docente: generar código y marcar asistencia de SU grupo
const { data: code } = await supabase.rpc("rotate_checkin_code", { p_session: sessionId });
const { data: lista } = await supabase.rpc("get_session_attendance", { p_session: sessionId });
// [{ enrollment_id, full_name, group_id, present }]  (solo su grupo; el docente principal y admin ven todos)
await supabase.rpc("mark_attendance_bulk", { p_session: sessionId, p_enrollments: [id1, id2], p_present: true });
await supabase.rpc("mark_attendance", { p_session: sessionId, p_enrollment: id, p_present: false });
```

**Agregar al calendario de Google** (sin API, solo un enlace):

```js
const fmt = (d) => new Date(d).toISOString().replace(/[-:]|\.\d{3}/g, "");
const url = `https://calendar.google.com/calendar/render?action=TEMPLATE`
  + `&text=${encodeURIComponent(s.title)}&dates=${fmt(s.starts_at)}/${fmt(s.ends_at)}`
  + `&details=${encodeURIComponent("Curso: ...")}&location=${encodeURIComponent(s.meet_url ?? "")}`;
```

## 7. Material y tareas (Google Drive por enlace)

```js
// Material (solo inscritos de la edición/curso, y de su grupo si el material es por grupo)
await supabase.from("materials").select("*").eq("offering_id", offeringId);

// Tareas
await supabase.from("assignments").select("*").eq("offering_id", offeringId).order("due_at");

// Entregar: el estudiante pega el enlace de Drive ("cualquiera con el enlace")
await supabase.from("submissions").insert({
  assignment_id: assignmentId, user_id: session.user.id,
  file_url: "https://drive.google.com/...", content_text: "comentario opcional",
});
// Reenviar: .update({ file_url, content_text }).eq("assignment_id", assignmentId)
// El estudiante NO puede ponerse nota (score/feedback se ignoran si los envía).

// Mi entrega y su nota
await supabase.from("submissions").select("*").eq("assignment_id", assignmentId);
```

Validen en el formulario que el enlace empiece con `https://drive.google.com/` o `https://docs.google.com/`.

## 7.1 Panel de docente

```js
// Lista de su grupo (nombre, correo, avance, asistencia). NO incluye CI ni fecha de nacimiento
const { data } = await supabase.rpc("get_roster", { p_offering: offeringId, p_group: null });
// Entregas de su grupo
await supabase.from("submissions").select("*, assignments(title,max_score)").eq("assignment_id", assignmentId);
// Calificar
await supabase.rpc("grade_submission", { p_submission: id, p_score: 85, p_feedback: "Buen trabajo" });
// Crear material/tarea para su grupo (group_id obligatorio) o, si es docente principal, para toda la edición
await supabase.from("materials").insert({ offering_id, group_id, title, kind: "drive", url });
await supabase.from("assignments").insert({ offering_id, group_id, title, description, due_at, max_score: 100, weight: 1 });
// Recomendar un estudiante para ser docente (lo aprueba un admin)
await supabase.rpc("recommend_student", { p_student: userId, p_note: "Ayudó mucho al grupo" });
// Docente principal: avisos, y cerrar la edición
await supabase.from("announcements").insert({ offering_id, author_id: me, title, body, send_email: true });
```

## 7.2 Panel de administrador

Los admins pueden leer y escribir **todas** las tablas directamente (cursos, ediciones, módulos, lecciones, videos, sesiones, eventos, insignias, roles, ajustes…), y además tienen estas funciones:

| Función (`supabase.rpc`) | Para qué |
|---|---|
| `create_groups(p_offering, p_teacher_ids[], p_group_size)` | Divide la edición en grupos de N (40 por defecto), uno por docente, por orden de inscripción |
| `auto_assign_unassigned(p_offering)` | Reparte a los inscritos nuevos en los grupos con espacio |
| `assign_to_group(p_enrollment, p_group)` | Mover a alguien de grupo |
| `remove_student(p_enrollment, p_reason)` | Dar de baja con motivo (no borra; sube la lista de espera) |
| `suspend_user(p_user, p_reason)` / `reactivate_user(p_user)` | Suspender o reactivar una cuenta |
| `add_student_flag(p_user, p_kind, p_note, p_offering)` | Nota interna / advertencia / sanción (`'note' \| 'warning' \| 'sanction'`; solo admins las ven, tabla `student_flags`) |
| `review_recommendation(p_id, p_accept)` | Aceptar o rechazar una recomendación a docente (si acepta, le da el rol) |
| `get_offering_stats(p_offering)` | Inscritos, lista de espera, aprobados, promedios de avance/asistencia y calificación |
| `finalize_offering(p_offering)` | Calcula notas finales y aprueba/reprueba según las reglas de la edición |
| `issue_certificates_for_offering(p_offering)` | Emite los certificados de los aprobados y les envía el correo |

Cupo: cada edición tiene `capacity` (por defecto 100, ver tabla `platform_settings`). **Solo un admin puede cambiarlo**; no se puede bajar por debajo de los inscritos actuales y, al subirlo, sube gente de la lista de espera.

Reglas de aprobación por edición: `pass_score`, `min_attendance_pct`, `min_progress_pct`.

Estadísticas de asistencia de todos: `get_roster(p_offering)` devuelve `progress_pct` y `attendance_pct` por estudiante.

## 8. Insignias, certificados y notificaciones

```js
// Mis insignias
await supabase.from("user_badges").select("awarded_at, badges(code,name,description,icon_url)");
// Catálogo de insignias (para mostrar las que faltan)
await supabase.from("badges").select("*");

// Mis certificados y descarga del PDF
const { data: certs } = await supabase.from("certificates").select("*");
const pdfUrl = `${FUNCTIONS_URL}/certificate-pdf?code=${cert.verification_code}`;

// Verificación pública (página /verificar/:code, sin login)
const { data } = await supabase.rpc("verify_certificate", { p_code: code });
// [{ user_name, course_title, issued_at, valid }]  (vacío si no existe)

// Notificaciones dentro de la plataforma
await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(30);
await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
```

Cumpleaños: el correo y la notificación se envían solos a las 07:00 (hora Bolivia). Si quieren un saludo en pantalla, comparen `profiles.birth_date` (día y mes) con hoy.

## 9. Eventos (independientes de los cursos)

```js
const { data: status } = await supabase.rpc("register_for_event", { p_event: eventId }); // 'registered' | 'waitlisted'
await supabase.rpc("cancel_event_registration", { p_event: eventId });
await supabase.from("event_registrations").select("*, events(*)");   // mis registros
```

## 10. Encuesta de satisfacción (al terminar la edición)

```js
await supabase.from("offering_feedback").insert({ offering_id, user_id: me, rating: 5, comment: "Excelente" });
```
Solo pueden responder los aprobados, una vez por edición.

## Datos y conceptos útiles

- **Estados de inscripción**: `active`, `waitlisted`, `completed` (aprobó), `failed`, `dropped`, `pending_payment` (futuro).
- **Estados de edición**: `draft` (no visible), `open` (inscripciones), `in_progress`, `finished`, `cancelled`.
- **Tipos de curso**: `course`, `bootcamp`, `workshop`. Un bootcamp es un curso cuyas lecciones son grabaciones de clases en vivo (`live_sessions.recording_video_id`).
- Horas: la base guarda todo en UTC; muéstrenlo en `America/La_Paz`.
- No usen la *service role key* en el frontend bajo ninguna circunstancia.
