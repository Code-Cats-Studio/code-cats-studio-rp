import { Link } from 'react-router-dom';
import LegalLayout, { LegalH2, LegalList } from '../components/global/LegalLayout';

const mail = (
  <a href="mailto:code.cats.studio@gmail.com" style={{ color: 'var(--azul-gatuno)' }}>code.cats.studio@gmail.com</a>
);

export default function PrivacidadPage() {
  return (
    <LegalLayout
      title="Política de privacidad"
      description="Qué datos recopila Code Cats Studio, para qué los usa, con quién los comparte y cómo ejercer tus derechos"
      updated="19 de octubre de 2026"
      current="privacidad"
    >
      <p>
        Esta política explica cómo <strong>Code Cats Studio</strong> («nosotros»), con sede en La Paz, Bolivia, trata
        los datos personales de quienes usan su plataforma de cursos y eventos. Es parte de los{' '}
        <Link to="/terminos" style={{ color: 'var(--azul-gatuno)' }}>Términos y condiciones</Link>.
      </p>

      <LegalH2>1. Quién es el responsable</LegalH2>
      <p>Code Cats Studio es responsable del tratamiento. Contacto para temas de privacidad: {mail}.</p>

      <LegalH2>2. Qué datos recopilamos</LegalH2>
      <LegalList
        items={[
          <><strong>Al iniciar sesión con Google:</strong> tu nombre, correo electrónico y foto de perfil. No recibimos tu contraseña de Google ni acceso a tu Gmail, tus contactos o tu Drive.</>,
          <><strong>Perfil (lo completas tú):</strong> nombre completo, número de documento de identidad con complemento y departamento de emisión, fecha de nacimiento, teléfono, institución y carrera (opcionales) y la fecha en que aceptaste los términos.</>,
          <><strong>Actividad académica:</strong> inscripciones, avance en lecciones y videos, asistencia a clases en vivo, tareas entregadas, archivos que subes, notas, comentarios del docente, insignias y certificados.</>,
          <><strong>Eventos:</strong> tu registro y los datos del formulario de cada evento (por ejemplo tipo de participante, institución u organización, talla de polera, nivel de experiencia, intereses, necesidades de alimentación y si aceptas el uso de fotos).</>,
          <><strong>Solicitud de docente:</strong> el texto, la experiencia y los enlaces que escribas.</>,
          <><strong>Técnicos y de seguridad:</strong> registros de acciones administrativas (quién hizo qué y cuándo) y datos mínimos de conexión que genera nuestro proveedor de hosting.</>,
        ]}
      />

      <LegalH2>3. Para qué los usamos</LegalH2>
      <LegalList
        items={[
          'Crear y mantener tu cuenta, e identificarte al inscribirte.',
          'Gestionar cursos: cupos, grupos, asistencia, tareas, notas y aprobación.',
          'Emitir certificados con tus datos reales y permitir que se verifiquen.',
          'Organizar eventos y atender necesidades como alimentación.',
          'Enviarte correos y notificaciones del servicio (certificados, recordatorios, avisos de cupo) y, si no los desactivas, novedades y saludo de cumpleaños.',
          'Evaluar solicitudes de docentes, prevenir fraudes y proteger la plataforma.',
          'Mejorar los cursos con valoraciones y estadísticas agregadas.',
        ]}
      />
      <p>No vendemos tus datos ni los usamos para publicidad de terceros.</p>

      <LegalH2>4. Uso de datos de usuarios de Google</LegalH2>
      <p>
        Usamos «Iniciar sesión con Google» solo para autenticarte y obtener tu nombre, correo y foto. Además, la
        plataforma usa la API de Google Drive con <strong>una cuenta propia de la organización</strong> y el permiso{' '}
        <code>drive.file</code> (acceso únicamente a los archivos y carpetas que la propia plataforma crea) para
        guardar las tareas que los estudiantes suben. A los estudiantes no se les pide acceso a su Drive.
      </p>
      <p>
        El uso y la transferencia de la información recibida de las API de Google se ajustan a la{' '}
        <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--azul-gatuno)' }}>
          Política de datos de usuario de los servicios de API de Google
        </a>
        , incluidos los requisitos de uso limitado. Los datos de Google solo se usan para las funciones descritas
        aquí, no se transfieren a terceros salvo los proveedores indicados en la sección 5, no se usan para
        publicidad y no los lee ninguna persona salvo lo necesario para la corrección académica o por obligación
        legal.
      </p>

      <LegalH2>5. Con quién los compartimos</LegalH2>
      <p>Solo con los servicios que hacen funcionar la plataforma, obligados a proteger la información:</p>
      <LegalList
        items={[
          <>Nuestro servidor y base de datos, donde se guardan tu cuenta, tus inscripciones y tu avance.</>,
          <>Los servicios que entregan la página y envían los correos de la plataforma.</>,
          <>El almacenamiento de las entregas y la reproducción de los videos de las clases.</>,
          <>Estadísticas internas del uso de los cursos (asistencia, avance y participación), sin fines publicitarios.</>,
        ]}
      />
      <p>
        Estos servicios pueden almacenar datos fuera de Bolivia. Más allá de ellos, solo entregaremos datos si lo
        exige una autoridad competente conforme a la ley.
      </p>

      <LegalH2>6. Qué es visible para otras personas</LegalH2>
      <LegalList
        items={[
          <><strong>Docentes</strong> ven nombre, correo, avance, asistencia y entregas de los estudiantes de su grupo. No ven tu documento de identidad ni tu fecha de nacimiento.</>,
          <><strong>Administradores</strong> pueden ver los datos necesarios para gestionar cuentas, cursos, eventos y certificados.</>,
          <><strong>Verificación de certificados (pública):</strong> quien tenga el código de un certificado puede ver tu nombre, el curso y la fecha de emisión. Nada más.</>,
          'Los demás estudiantes no ven tus datos.',
        ]}
      />

      <LegalH2>7. Cuánto tiempo los conservamos</LegalH2>
      <LegalList
        items={[
          'Los datos de tu cuenta, mientras la mantengas activa.',
          'Los certificados y su registro de verificación, mientras exista la plataforma, para que sigan siendo verificables.',
          'Los archivos de tareas, hasta 2 años después del cierre de la edición, salvo que pidas antes su eliminación y no haya un motivo académico para conservarlos.',
          'Los registros administrativos, el tiempo necesario por seguridad y obligaciones legales.',
        ]}
      />

      <LegalH2>8. Seguridad</LegalH2>
      <p>
        Usamos conexiones cifradas (HTTPS), reglas de acceso a nivel de base de datos para que cada persona vea solo
        lo que le corresponde, archivos en carpetas privadas y credenciales guardadas fuera del código. Ningún sistema
        es infalible; si detectamos un incidente que te afecte, te lo comunicaremos.
      </p>

      <LegalH2>9. Tus derechos</LegalH2>
      <p>Puedes pedirnos, escribiendo a {mail}:</p>
      <LegalList
        items={[
          'Acceder a los datos que tenemos sobre ti.',
          'Corregir datos inexactos (el nombre de un certificado ya emitido se corrige reemitiéndolo).',
          'Eliminar tu cuenta y tus datos, salvo lo que debamos conservar por razones académicas o legales, como el registro del certificado.',
          'Oponerte a correos opcionales (también puedes desactivarlos en tu perfil) o retirar el consentimiento de uso de fotos de eventos.',
        ]}
      />
      <p>Respondemos en un plazo razonable, normalmente dentro de 15 días hábiles.</p>

      <LegalH2>10. Menores de edad</LegalH2>
      <p>
        La plataforma está dirigida a personas de 16 años o más. Si eres menor de 18 años necesitas la autorización de
        tu madre, padre o tutor. Si crees que un menor se registró sin ella, escríbenos y eliminaremos la cuenta.
      </p>

      <LegalH2>11. Cookies y almacenamiento local</LegalH2>
      <p>
        Usamos almacenamiento del navegador solo para mantener tu sesión y recordar tu progreso de lecciones en tu
        dispositivo. No usamos cookies de publicidad ni de seguimiento. Los videos se cargan con el modo de privacidad
        ampliada de YouTube.
      </p>

      <LegalH2>12. Cambios en esta política</LegalH2>
      <p>
        Si la actualizamos, publicaremos la nueva versión aquí con su fecha y, si el cambio es importante, te lo
        avisaremos por la plataforma o por correo.
      </p>

      <LegalH2>13. Contacto</LegalH2>
      <p>
        {mail}
      </p>
    </LegalLayout>
  );
}
