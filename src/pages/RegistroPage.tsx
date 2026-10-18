import { useState, useEffect, useId, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { setPageMeta } from '../utils/seo';
import type { UserProfileUpdateInput } from '../types/auth';

// Departamentos oficiales de emisión de cédula de identidad en Bolivia (tabla regions)
export const BOLIVIA_REGIONS = [
  { id: 1, code: 'LP', name: 'La Paz' },
  { id: 2, code: 'OR', name: 'Oruro' },
  { id: 3, code: 'PO', name: 'Potosí' },
  { id: 4, code: 'CB', name: 'Cochabamba' },
  { id: 5, code: 'CH', name: 'Chuquisaca' },
  { id: 6, code: 'TJ', name: 'Tarija' },
  { id: 7, code: 'SC', name: 'Santa Cruz' },
  { id: 8, code: 'BE', name: 'Beni' },
  { id: 9, code: 'PD', name: 'Pando' },
] as const;

interface FormData {
  full_name: string;
  document_number: string;
  document_complement: string;
  document_issued_region_id: number | '';
  birth_date: string;
  phone: string;
  institution: string;
  degree: string;
  terms_accepted: boolean;
}

export default function RegistroPage() {
  const { user, profile, isProfileComplete, isLoading, updateProfile, signInWithGoogle } =
    useAuth();

  const [formData, setFormData] = useState<FormData>({
    full_name: '',
    document_number: '',
    document_complement: '',
    document_issued_region_id: '',
    birth_date: '',
    phone: '',
    institution: '',
    degree: '',
    terms_accepted: false,
  });

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showEditMode, setShowEditMode] = useState<boolean>(false);

  const fullNameId = useId();
  const docNumberId = useId();
  const docComplementId = useId();
  const regionId = useId();
  const birthDateId = useId();
  const phoneId = useId();
  const institutionId = useId();
  const degreeId = useId();
  const termsId = useId();

  useEffect(() => {
    setPageMeta(
      'Completa tu Perfil',
      'Completa tus datos personales para acceder a los cursos y certificados de Code Cats Studio'
    );
  }, []);

  // Pre-llenar formulario cuando se cargan los datos de sesión y perfil
  useEffect(() => {
    if (user) {
      setFormData({
        full_name:
          profile?.full_name ||
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          '',
        document_number: profile?.document_number || '',
        document_complement: profile?.document_complement || '',
        document_issued_region_id: profile?.document_issued_region_id ?? '',
        birth_date: profile?.birth_date || '',
        phone: profile?.phone || '',
        institution: profile?.institution || '',
        degree: profile?.degree || '',
        terms_accepted: Boolean(profile?.terms_accepted_at),
      });
    }
  }, [user, profile]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const { checked } = e.target as HTMLInputElement;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else if (name === 'document_issued_region_id') {
      setFormData((prev) => ({
        ...prev,
        [name]: value === '' ? '' : Number(value),
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Validaciones del lado del cliente
    if (!formData.full_name.trim()) {
      setErrorMessage('Por favor ingresa tu nombre completo.');
      return;
    }
    if (!formData.document_number.trim()) {
      setErrorMessage('Por favor ingresa tu número de documento (CI).');
      return;
    }
    if (formData.document_issued_region_id === '') {
      setErrorMessage('Por favor selecciona el departamento de emisión de tu documento.');
      return;
    }
    if (!formData.birth_date) {
      setErrorMessage('Por favor ingresa tu fecha de nacimiento.');
      return;
    }
    if (!formData.terms_accepted) {
      setErrorMessage('Debes aceptar los términos y políticas para continuar.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: UserProfileUpdateInput = {
        full_name: formData.full_name.trim(),
        document_number: formData.document_number.trim(),
        document_complement: formData.document_complement.trim() || undefined,
        document_issued_region_id: Number(formData.document_issued_region_id),
        birth_date: formData.birth_date,
        phone: formData.phone.trim() || undefined,
        institution: formData.institution.trim() || undefined,
        degree: formData.degree.trim() || undefined,
        terms_accepted_at: new Date().toISOString(),
      };

      const result = await updateProfile(payload);

      if (result.error) {
        setErrorMessage(result.error.message);
      } else {
        setSuccessMessage('¡Perfil guardado con éxito! Ya puedes inscribirte a cualquier curso.');
        setShowEditMode(false);
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error inesperado al actualizar tu perfil.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // 1. Estado de carga inicial
  if (isLoading) {
    return (
      <main
        className="min-h-[calc(100vh-8rem)] px-6 py-16 flex items-center justify-center"
        style={{ background: 'var(--bg-secondary)' }}
      >
        <div className="text-center">
          <div
            className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4"
            style={{
              borderColor: 'var(--azul-gatuno)',
              borderTopColor: 'transparent',
            }}
          />
          <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-heading)' }}>
            Cargando información...
          </p>
        </div>
      </main>
    );
  }

  // 2. Si no ha iniciado sesión con Google
  if (!user) {
    return (
      <main
        className="min-h-[calc(100vh-8rem)] px-6 py-16 flex items-center justify-center"
        style={{ background: 'var(--bg-secondary)' }}
      >
        <section
          className="max-w-md w-full p-8 rounded-2xl text-center"
          style={{
            background: 'var(--bg-primary)',
            border: '1.5px solid var(--border)',
          }}
        >
          <div className="text-4xl mb-3">🐱</div>
          <h1
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1.5rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: '0 0 0.5rem',
            }}
          >
            Inicia sesión primero
          </h1>
          <p
            style={{
              fontSize: '0.9375rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
              marginBottom: '1.75rem',
            }}
          >
            Para registrarte y completar tu perfil de estudiante en Code Cats Studio,
            necesitas iniciar sesión con tu cuenta de Google.
          </p>
          <button
            type="button"
            onClick={() => void signInWithGoogle()}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm cursor-pointer transition-all duration-200"
            style={{
              fontFamily: 'var(--font-heading)',
              background: 'var(--azul-gatuno)',
              color: 'white',
              border: 'none',
            }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#ffffff"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#ffffff"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#ffffff"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#ffffff"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continuar con Google</span>
          </button>
        </section>
      </main>
    );
  }

  // 3. Si el perfil ya está completo y no está en modo de edición manual
  if (isProfileComplete && !showEditMode) {
    return (
      <main
        className="min-h-[calc(100vh-8rem)] px-6 py-16 flex items-center justify-center"
        style={{ background: 'var(--bg-secondary)' }}
      >
        <section
          className="max-w-lg w-full p-8 rounded-2xl text-center"
          style={{
            background: 'var(--bg-primary)',
            border: '1.5px solid var(--border)',
          }}
        >
          <div
            className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl font-bold"
            style={{ background: '#DCFCE7', color: '#16A34A' }}
          >
            ✓
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1.5rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: '0 0 0.75rem',
            }}
          >
            Tu perfil ya está completo. ¡Puedes ir al catálogo a inscribirte!
          </h1>
          <p
            style={{
              fontSize: '0.9375rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
              marginBottom: '1.75rem',
            }}
          >
            Hola <strong>{profile?.full_name || user.email}</strong>, tus datos han sido
            verificados y cumples con los requisitos para inscribirte a los cursos y
            recibir tus certificados oficiales.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/"
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold text-sm no-underline transition-all"
              style={{
                fontFamily: 'var(--font-heading)',
                background: 'var(--azul-gatuno)',
                color: 'white',
              }}
            >
              Explorar cursos →
            </Link>
            <button
              type="button"
              onClick={() => setShowEditMode(true)}
              className="inline-flex items-center justify-center px-4 py-3 rounded-xl font-semibold text-sm cursor-pointer transition-all"
              style={{
                fontFamily: 'var(--font-heading)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border)',
              }}
            >
              Editar mis datos
            </button>
          </div>
        </section>
      </main>
    );
  }

  // 4. Formulario de llenado o actualización de perfil
  return (
    <main
      className="min-h-[calc(100vh-8rem)] px-6 py-12"
      style={{ background: 'var(--bg-secondary)' }}
    >
      <section className="max-w-2xl mx-auto">
        {/* Cabecera */}
        <div className="mb-8">
          <p
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--azul-gatuno)',
              margin: '0 0 0.5rem',
            }}
          >
            Estudiante
          </p>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 5vw, 3rem)',
              margin: '0 0 0.5rem',
              color: 'var(--text-primary)',
            }}
          >
            {isProfileComplete ? 'Actualizar Perfil' : 'Completa tu Perfil'}
          </h1>
          <p
            style={{
              fontSize: '1rem',
              color: 'var(--text-secondary)',
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            Para inscribirte en cursos y emitir tus certificados oficiales, ingresa
            tus datos reales tal como figuran en tu Cédula de Identidad.
          </p>
        </div>

        {/* Mensajes de Alerta */}
        {errorMessage && (
          <div
            role="alert"
            className="mb-6 p-4 rounded-xl text-sm flex items-start gap-2"
            style={{
              background: '#FEF2F2',
              border: '1.5px solid #FCA5A5',
              color: '#991B1B',
              fontFamily: 'var(--font-heading)',
            }}
          >
            <span className="font-bold flex-shrink-0">✕</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div
            role="status"
            className="mb-6 p-4 rounded-xl text-sm flex items-start gap-2"
            style={{
              background: '#F0FDF4',
              border: '1.5px solid #86EFAC',
              color: '#166534',
              fontFamily: 'var(--font-heading)',
            }}
          >
            <span className="font-bold flex-shrink-0">✓</span>
            <span>{successMessage}</span>
          </div>
        )}

        {/* Formulario */}
        <form
          onSubmit={handleSubmit}
          className="p-6 md:p-8 rounded-2xl flex flex-col gap-5"
          style={{
            background: 'var(--bg-primary)',
            border: '1.5px solid var(--border)',
          }}
        >
          {/* Correo (de solo lectura proveniente de Google) */}
          <div>
            <label
              className="block text-xs font-bold uppercase mb-1"
              style={{
                fontFamily: 'var(--font-heading)',
                color: 'var(--text-muted)',
              }}
            >
              Correo Electrónico (Google)
            </label>
            <input
              type="text"
              value={user.email || ''}
              disabled
              className="w-full px-3.5 py-2.5 rounded-lg text-sm bg-gray-100 text-gray-500 border border-gray-300 cursor-not-allowed"
            />
            <span className="text-xs text-gray-400 mt-1 block">
              El correo está vinculado a tu cuenta y no se puede modificar.
            </span>
          </div>

          {/* 1. Nombre Completo */}
          <div>
            <label
              htmlFor={fullNameId}
              className="block text-xs font-bold uppercase mb-1"
              style={{
                fontFamily: 'var(--font-heading)',
                color: 'var(--text-primary)',
              }}
            >
              Nombre Completo *
            </label>
            <input
              id={fullNameId}
              name="full_name"
              type="text"
              required
              placeholder="Ej: María Quispe Mamani"
              value={formData.full_name}
              onChange={handleChange}
              disabled={isSubmitting}
              className="w-full px-3.5 py-2.5 rounded-lg text-sm bg-white border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* 2, 3 y 4. Documento de Identidad (CI), Complemento y Departamento */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* CI */}
            <div className="md:col-span-5">
              <label
                htmlFor={docNumberId}
                className="block text-xs font-bold uppercase mb-1"
                style={{
                  fontFamily: 'var(--font-heading)',
                  color: 'var(--text-primary)',
                }}
              >
                Cédula de Identidad (CI) *
              </label>
              <input
                id={docNumberId}
                name="document_number"
                type="text"
                required
                placeholder="Ej: 1234567"
                value={formData.document_number}
                onChange={handleChange}
                disabled={isSubmitting}
                className="w-full px-3.5 py-2.5 rounded-lg text-sm bg-white border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              />
            </div>

            {/* Complemento (Opcional) */}
            <div className="md:col-span-3">
              <label
                htmlFor={docComplementId}
                className="block text-xs font-bold uppercase mb-1"
                style={{
                  fontFamily: 'var(--font-heading)',
                  color: 'var(--text-secondary)',
                }}
              >
                Compl. (Opcional)
              </label>
              <input
                id={docComplementId}
                name="document_complement"
                type="text"
                maxLength={4}
                placeholder="Ej: 1A"
                value={formData.document_complement}
                onChange={handleChange}
                disabled={isSubmitting}
                className="w-full px-3.5 py-2.5 rounded-lg text-sm bg-white border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              />
            </div>

            {/* Departamento de Emisión */}
            <div className="md:col-span-4">
              <label
                htmlFor={regionId}
                className="block text-xs font-bold uppercase mb-1"
                style={{
                  fontFamily: 'var(--font-heading)',
                  color: 'var(--text-primary)',
                }}
              >
                Emisión (Depto.) *
              </label>
              <select
                id={regionId}
                name="document_issued_region_id"
                required
                value={formData.document_issued_region_id}
                onChange={handleChange}
                disabled={isSubmitting}
                className="w-full px-3.5 py-2.5 rounded-lg text-sm bg-white border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              >
                <option value="">Selecciona...</option>
                {BOLIVIA_REGIONS.map((region) => (
                  <option key={region.id} value={region.id}>
                    {region.name} ({region.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 5 y 6. Fecha de Nacimiento y Teléfono */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor={birthDateId}
                className="block text-xs font-bold uppercase mb-1"
                style={{
                  fontFamily: 'var(--font-heading)',
                  color: 'var(--text-primary)',
                }}
              >
                Fecha de Nacimiento *
              </label>
              <input
                id={birthDateId}
                name="birth_date"
                type="date"
                required
                value={formData.birth_date}
                onChange={handleChange}
                disabled={isSubmitting}
                className="w-full px-3.5 py-2.5 rounded-lg text-sm bg-white border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor={phoneId}
                className="block text-xs font-bold uppercase mb-1"
                style={{
                  fontFamily: 'var(--font-heading)',
                  color: 'var(--text-secondary)',
                }}
              >
                Teléfono / WhatsApp (Opcional)
              </label>
              <input
                id={phoneId}
                name="phone"
                type="tel"
                placeholder="Ej: 70000000"
                value={formData.phone}
                onChange={handleChange}
                disabled={isSubmitting}
                className="w-full px-3.5 py-2.5 rounded-lg text-sm bg-white border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          {/* 7. Institución y Carrera (Opcionales) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor={institutionId}
                className="block text-xs font-bold uppercase mb-1"
                style={{
                  fontFamily: 'var(--font-heading)',
                  color: 'var(--text-secondary)',
                }}
              >
                Universidad / Colegio (Opcional)
              </label>
              <input
                id={institutionId}
                name="institution"
                type="text"
                placeholder="Ej: UMSA, UCB, etc."
                value={formData.institution}
                onChange={handleChange}
                disabled={isSubmitting}
                className="w-full px-3.5 py-2.5 rounded-lg text-sm bg-white border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor={degreeId}
                className="block text-xs font-bold uppercase mb-1"
                style={{
                  fontFamily: 'var(--font-heading)',
                  color: 'var(--text-secondary)',
                }}
              >
                Carrera / Grado (Opcional)
              </label>
              <input
                id={degreeId}
                name="degree"
                type="text"
                placeholder="Ej: Informática, Bachiller..."
                value={formData.degree}
                onChange={handleChange}
                disabled={isSubmitting}
                className="w-full px-3.5 py-2.5 rounded-lg text-sm bg-white border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          {/* 8. Términos y Condiciones */}
          <div className="pt-2">
            <label htmlFor={termsId} className="flex items-start gap-3 cursor-pointer select-none">
              <input
                id={termsId}
                name="terms_accepted"
                type="checkbox"
                required
                checked={formData.terms_accepted}
                onChange={handleChange}
                disabled={isSubmitting}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span className="text-xs text-gray-700 leading-relaxed">
                Acepto los términos de servicio y las políticas de privacidad de Code Cats
                Studio. Confirmo que los datos proporcionados son fidedignos para la emisión de
                certificados oficiales. *
              </span>
            </label>
          </div>

          {/* Botones de Acción */}
          <div className="pt-4 flex items-center justify-end gap-3">
            {showEditMode && (
              <button
                type="button"
                onClick={() => setShowEditMode(false)}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-150 cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                fontFamily: 'var(--font-heading)',
                background: 'var(--azul-gatuno)',
                boxShadow: isSubmitting ? 'none' : '0 2px 8px rgba(65,66,245,0.25)',
              }}
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <span>{isProfileComplete ? 'Actualizar Perfil' : 'Completar Perfil'}</span>
              )}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
