import { Link } from 'react-router-dom';
import LegalLayout, { LegalH2, LegalList } from '../components/global/LegalLayout';

export default function TerminosPage() {
  return (
    <LegalLayout
      title="Términos y condiciones"
      description="Condiciones de uso de la plataforma de cursos y eventos de Code Cats Studio"
      updated="18 de octubre de 2026"
    >
      <p>
        Estos términos regulan el uso de la plataforma de cursos y eventos de <strong>Code Cats Studio</strong> («la
        plataforma», «nosotros»). Al crear una cuenta y marcar la casilla de aceptación en tu perfil, confirmas que
        los leíste y aceptas. Si no estás de acuerdo, no uses la plataforma.
      </p>

      <LegalH2>1. Qué ofrecemos</LegalH2>
      <p>
        Cursos en línea con lecciones, clases en vivo, material y tareas; eventos (como Code Cats Days); insignias y
        certificados verificables. Los contenidos y fechas pueden cambiar. Un curso se abre en «ediciones» con cupo
        limitado; si el cupo se llena, quedas en lista de espera.
      </p>

      <LegalH2>2. Tu cuenta</LegalH2>
      <LegalList
        items={[
          <>Entras con tu cuenta de Google. Una persona, una cuenta; no la compartas.</>,
          <>Debes completar tu perfil con datos verdaderos (nombre, documento de identidad, fecha de nacimiento). Los certificados se emiten con esos datos; si son falsos, podemos revocar el certificado.</>,
          <>La plataforma está dirigida a personas de 16 años o más. Si eres menor de 18, necesitas la autorización de tu madre, padre o tutor.</>,
          <>Eres responsable de lo que ocurre con tu cuenta. Avísanos si sospechas un uso no autorizado.</>,
        ]}
      />

      <LegalH2>3. Roles: estudiante, docente y administrador</LegalH2>
      <p>
        Todas las cuentas empiezan como <em>estudiante</em>. Para postular como docente u organizador hay que haber
        aprobado al menos 3 cursos con nota mínima de 90 y contar con el certificado de cada uno; la solicitud la
        revisa un administrador, que puede aprobarla o rechazarla. Los roles no se pueden autoasignar.
      </p>

      <LegalH2>4. Uso aceptable</LegalH2>
      <p>Al usar la plataforma te comprometes a no:</p>
      <LegalList
        items={[
          'Suplantar a otra persona ni entregar trabajos ajenos como propios.',
          'Subir archivos con virus, contenido ilegal, ofensivo o que infrinja derechos de terceros.',
          'Intentar acceder a datos de otras personas, saltarte controles de seguridad o saturar el servicio.',
          'Compartir los códigos de asistencia, los enlaces de clases o el material con quienes no estén inscritos.',
          'Falsear tu asistencia o tus notas.',
        ]}
      />
      <p>
        Podemos suspender o dar de baja una cuenta que incumpla estas reglas, quitar contenido y, si corresponde,
        revocar certificados. Las advertencias y sanciones internas pueden quedar registradas.
      </p>

      <LegalH2>5. Tareas y archivos que subes</LegalH2>
      <LegalList
        items={[
          'Puedes subir hasta 10 archivos por tarea, de hasta 50 MB cada uno.',
          'Conservas la propiedad de lo que entregas. Nos autorizas a almacenarlo y a mostrarlo a los docentes y administradores que corrigen tu trabajo, y solo para ese fin.',
          'Tus archivos se guardan en Google Drive, en una cuenta de la organización, no en carpetas públicas.',
          'Declaras que tu entrega es tuya o que tienes derecho a usarla.',
        ]}
      />

      <LegalH2>6. Contenido del curso</LegalH2>
      <p>
        Las lecciones, el material, los videos, el diseño y las marcas de Code Cats Studio son nuestros o de sus
        autores. Puedes usarlos para tu aprendizaje personal. No puedes revenderlos, redistribuirlos ni publicarlos
        sin permiso por escrito. El código de ejemplo puede tener su propia licencia, indicada en el material.
      </p>

      <LegalH2>7. Asistencia, notas y certificados</LegalH2>
      <LegalList
        items={[
          'Cada edición define su nota mínima de aprobación y, si corresponde, un porcentaje mínimo de asistencia y de avance.',
          'El certificado se emite a quienes aprueban. Tiene un código de verificación público: cualquiera puede comprobar con ese código tu nombre, el curso y la fecha de emisión.',
          'Podemos revocar un certificado emitido por error, por fraude o por datos falsos.',
        ]}
      />

      <LegalH2>8. Eventos</LegalH2>
      <p>
        La inscripción a un evento es gratuita salvo que se indique lo contrario y depende del cupo. En la
        inscripción te pedimos datos para organizar el evento (por ejemplo talla de polera o necesidades de
        alimentación). Si indicas que aceptas fotos, podremos usar imágenes tomadas en el evento en nuestras
        comunicaciones; puedes retirar ese consentimiento escribiéndonos. Podemos cambiar fecha, lugar o formato por
        razones de organización, avisándote por la plataforma o por correo.
      </p>

      <LegalH2>9. Correos y notificaciones</LegalH2>
      <p>
        Te enviamos correos necesarios para el servicio (certificados, recordatorios de clase, avisos de cupo,
        avisos de tus cursos) y otros opcionales (novedades, cumpleaños). Puedes cambiar estas preferencias en tu
        perfil.
      </p>

      <LegalH2>10. Disponibilidad y responsabilidad</LegalH2>
      <p>
        Hacemos lo posible por mantener la plataforma disponible, pero se ofrece «tal cual», sin garantía de
        funcionamiento ininterrumpido. Puede haber mantenimientos o fallos de servicios de terceros (Google,
        Supabase, Cloudflare, YouTube). Dentro de lo que permita la ley, no respondemos por daños indirectos ni por
        pérdidas derivadas del uso o la imposibilidad de uso de la plataforma. Guarda copia de tus trabajos.
      </p>

      <LegalH2>11. Datos personales</LegalH2>
      <p>
        El tratamiento de tus datos se explica en la <Link to="/privacidad" style={{ color: 'var(--azul-gatuno)' }}>Política de privacidad</Link>,
        que forma parte de estos términos.
      </p>

      <LegalH2>12. Cambios en estos términos</LegalH2>
      <p>
        Podemos actualizarlos. Publicaremos la nueva versión aquí con su fecha y, si el cambio es importante, te lo
        avisaremos por la plataforma o por correo. Si sigues usando la plataforma después, entendemos que aceptas la
        versión vigente.
      </p>

      <LegalH2>13. Ley aplicable</LegalH2>
      <p>
        Estos términos se rigen por la legislación boliviana. Ante cualquier controversia, intentaremos primero
        resolverla de buena fe; si no es posible, serán competentes los tribunales de la ciudad de La Paz, Bolivia.
      </p>

      <LegalH2>14. Contacto</LegalH2>
      <LegalList
        items={[
          <>Correo: <a href="mailto:code.cats.studio@gmail.com" style={{ color: 'var(--azul-gatuno)' }}>code.cats.studio@gmail.com</a></>,
          <>WhatsApp: <a href="https://wa.me/59175268812" style={{ color: 'var(--azul-gatuno)' }}>+591 75268812</a></>,
        ]}
      />
    </LegalLayout>
  );
}
