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
      <main className="min-h-[calc(100vh-8rem)] flex items-center justify-center bg-gray-50 px-6 py-16">
        <section className="max-w-md w-full p-8 rounded-2xl bg-white shadow-sm ring-1 ring-gray-900/5 text-center">
          <img 
            src="/images/mascot/cat-peek.png" 
            alt="Mascota Code Cats" 
            className="h-16 w-auto mx-auto mb-4 object-contain"
          />
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-2">
            Inicia sesión primero
          </h1>
          <p className="text-sm text-gray-600 mb-6 leading-relaxed">
            Para registrarte y completar tu perfil de estudiante en Code Cats Studio,
            necesitas iniciar sesión con tu cuenta de Google.
          </p>
          <button
            type="button"
            onClick={() => void signInWithGoogle()}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
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
  // 4. Formulario de llenado o actualización de perfil
  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Encabezado del Formulario */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Completar Perfil
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Esta información es requerida para habilitar tu inscripción en las ofertas de cursos y emitir tus certificados oficiales.
          </p>
        </div>

        {/* Alertas de Feedback del Backend */}
        {errorMessage && (
          <div className="rounded-md bg-red-50 p-4 border border-red-200" role="alert">
            <p className="text-sm font-medium text-red-800">{errorMessage}</p>
          </div>
        )}
        
        {successMessage && (
          <div className="rounded-md bg-green-50 p-4 border border-green-200" role="status">
            <p className="text-sm font-medium text-green-800">{successMessage}</p>
          </div>
        )}

        {/* Contenedor Principal */}
        <form 
          onSubmit={handleSubmit}
          className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl"
        >
          <div className="px-4 py-6 sm:p-8">
            <div className="grid max-w-2xl grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
              
              {/* Nombre Completo */}
              <div className="sm:col-span-full">
                <label htmlFor={fullNameId} className="block text-sm font-medium leading-6 text-gray-900">
                  Nombre Completo <span className="text-red-500">*</span>
                </label>
                <div className="mt-2">
                  <input
                    type="text"
                    id={fullNameId}
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                    placeholder="Ej. María Quispe Mamani"
                    required
                  />
                </div>
              </div>

              {/* Documento de Identidad (CI) */}
              <div className="sm:col-span-2">
                <label htmlFor={docNumberId} className="block text-sm font-medium leading-6 text-gray-900">
                  Carnet de Identidad <span className="text-red-500">*</span>
                </label>
                <div className="mt-2">
                  <input
                    type="text"
                    id={docNumberId}
                    name="document_number"
                    value={formData.document_number}
                    onChange={handleChange}
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                    placeholder="Ej. 1234567"
                    required
                  />
                </div>
              </div>

              {/* Complemento */}
              <div className="sm:col-span-1">
                <label htmlFor={docComplementId} className="block text-sm font-medium leading-6 text-gray-900">
                  Comp.
                </label>
                <div className="mt-2">
                  <input
                    type="text"
                    id={docComplementId}
                    name="document_complement"
                    value={formData.document_complement}
                    onChange={handleChange}
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 uppercase"
                    placeholder="1A"
                    maxLength={3}
                  />
                </div>
              </div>

              {/* Expedido en (Región) */}
              <div className="sm:col-span-3">
                <label htmlFor={regionId} className="block text-sm font-medium leading-6 text-gray-900">
                  Expedido en <span className="text-red-500">*</span>
                </label>
                <div className="mt-2">
                  <select
                    id={regionId}
                    name="document_issued_region_id"
                    value={formData.document_issued_region_id}
                    onChange={handleChange}
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                    required
                  >
                    <option value="">Selecciona un departamento</option>
                    {BOLIVIA_REGIONS.map((region) => (
                      <option key={region.id} value={region.id}>
                        {region.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Fecha de Nacimiento */}
              <div className="sm:col-span-3">
                <label htmlFor={birthDateId} className="block text-sm font-medium leading-6 text-gray-900">
                  Fecha de Nacimiento <span className="text-red-500">*</span>
                </label>
                <div className="mt-2">
                  <input
                    type="date"
                    id={birthDateId}
                    name="birth_date"
                    value={formData.birth_date}
                    onChange={handleChange}
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                    required
                  />
                </div>
              </div>

              {/* Teléfono */}
              <div className="sm:col-span-3">
                <label htmlFor={phoneId} className="block text-sm font-medium leading-6 text-gray-900">
                  Teléfono / WhatsApp
                </label>
                <div className="mt-2">
                  <input
                    type="tel"
                    id={phoneId}
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                    placeholder="Ej. 70000000"
                  />
                </div>
              </div>

              {/* Institución / Universidad */}
              <div className="sm:col-span-3">
                <label htmlFor={institutionId} className="block text-sm font-medium leading-6 text-gray-900">
                  Institución Educativa
                </label>
                <div className="mt-2">
                  <input
                    type="text"
                    id={institutionId}
                    name="institution"
                    value={formData.institution}
                    onChange={handleChange}
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                    placeholder="Ej. UMSA"
                  />
                </div>
              </div>

              {/* Carrera / Grado */}
              <div className="sm:col-span-3">
                <label htmlFor={degreeId} className="block text-sm font-medium leading-6 text-gray-900">
                  Carrera o Grado
                </label>
                <div className="mt-2">
                  <input
                    type="text"
                    id={degreeId}
                    name="degree"
                    value={formData.degree}
                    onChange={handleChange}
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                    placeholder="Ej. Informática"
                  />
                </div>
              </div>

              {/* Checkbox Términos */}
              <div className="sm:col-span-full mt-4">
                <div className="relative flex gap-x-3">
                  <div className="flex h-6 items-center">
                    <input
                      id={termsId}
                      name="terms_accepted"
                      type="checkbox"
                      checked={formData.terms_accepted}
                      onChange={handleChange}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                      required
                    />
                  </div>
                  <div className="text-sm leading-6">
                    <label htmlFor={termsId} className="font-medium text-gray-900">
                      Acepto los términos y condiciones
                    </label>
                    <p className="text-gray-500">
                      Consiento el uso de mis datos para la emisión de certificados de Code Cats Studio.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Footer del Formulario */}
          <div className="flex items-center justify-end gap-x-6 border-t border-gray-900/10 px-4 py-4 sm:px-8">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-blue-600 px-8 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Guardando...' : 'Guardar Perfil'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
