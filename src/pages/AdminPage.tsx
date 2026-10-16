
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import UsersPanel from '../components/admin/UsersPanel';
import CertificatesPanel from '../components/admin/CertificatesPanel';
import { useAuth } from '../context/AuthContext';
import {
  createAdminGroups,
  fetchAdminGroups,
  fetchAdminOfferings,
  fetchAdminTeachers,
  type AdminGroup,
  type AdminOffering,
  type AdminTeacher,
} from '../services/admin';

type Section = 'grupos' | 'usuarios' | 'certificados';

const sections: { id: Section; label: string }[] = [
  { id: 'grupos', label: 'Grupos' },
  { id: 'usuarios', label: 'Usuarios' },
  { id: 'certificados', label: 'Certificados' },
];

export default function AdminPage() {
  const location = useLocation();
  const { user, roles, isLoading: authLoading } = useAuth();

  const preview =
    import.meta.env.DEV &&
    location.pathname === '/admin-preview';

  const isAdmin =
    !preview &&
    !authLoading &&
    !!user &&
    roles.includes('admin');

  const [section, setSection] = useState<Section>('grupos');

  const [offerings, setOfferings] = useState<AdminOffering[]>([]);
  const [teachers, setTeachers] = useState<AdminTeacher[]>([]);
  const [groups, setGroups] = useState<AdminGroup[]>([]);

  const [offeringId, setOfferingId] = useState('');
  const [teacherIds, setTeacherIds] = useState<string[]>([]);
  const [groupSize, setGroupSize] = useState('40');

  const [loading, setLoading] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [groupsLoaded, setGroupsLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [groupsVersion, setGroupsVersion] = useState(0);
  const [alreadyCreated, setAlreadyCreated] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const validSize = /^[1-9]\d*$/.test(groupSize);

  const selectedOffering = offerings.find(
    (item) => item.id === offeringId
  );

  const canCreate =
    isAdmin &&
    !loading &&
    !loadingGroups &&
    !saving &&
    groupsLoaded &&
    !alreadyCreated &&
    !!offeringId &&
    teacherIds.length > 0 &&
    validSize &&
    groups.length === 0;

  // Cargar cursos y docentes solamente con permisos de admin
  useEffect(() => {
    if (!isAdmin) return;

    let current = true;
    setLoading(true);
    setError('');

    Promise.all([
      fetchAdminOfferings(),
      fetchAdminTeachers(),
    ])
      .then(([newOfferings, newTeachers]) => {
        if (!current) return;

        setOfferings(newOfferings);
        setTeachers(newTeachers);
      })
      .catch((err: unknown) => {
        if (!current) return;

        setError(
          err instanceof Error
            ? err.message
            : 'No se pudieron cargar los datos.'
        );
      })
      .finally(() => {
        if (current) setLoading(false);
      });

    return () => {
      current = false;
    };
  }, [isAdmin]);

  // Consultar grupos existentes
  useEffect(() => {
    if (!isAdmin || !offeringId) {
      setGroups([]);
      setGroupsLoaded(false);
      return;
    }

    let current = true;

    setLoadingGroups(true);
    setGroupsLoaded(false);
    setError('');

    fetchAdminGroups(offeringId)
      .then((data) => {
        if (!current) return;

        setGroups(data);
        setGroupsLoaded(true);
      })
      .catch((err: unknown) => {
        if (!current) return;

        setError(
          err instanceof Error
            ? err.message
            : 'No se pudieron consultar los grupos.'
        );
      })
      .finally(() => {
        if (current) setLoadingGroups(false);
      });

    return () => {
      current = false;
    };
  }, [isAdmin, offeringId, groupsVersion]);

  // Seleccionar varios docentes
  function toggleTeacher(id: string) {
    setTeacherIds((previous) =>
      previous.includes(id)
        ? previous.filter((teacherId) => teacherId !== id)
        : [...previous, id]
    );
  }

  // Crear grupos con confirmación
  async function handleCreateGroups() {
    if (!canCreate || !selectedOffering) return;

    const confirmed = window.confirm(
      `¿Crear ${teacherIds.length} grupo(s) en ` +
      `"${selectedOffering.courseTitle} — ${selectedOffering.label}" ` +
      `con hasta ${groupSize} estudiantes por grupo?`
    );

    if (!confirmed) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await createAdminGroups(
        offeringId,
        teacherIds,
        Number(groupSize)
      );

      setAlreadyCreated(true);
      setSuccess('Los grupos se crearon correctamente.');

      // Volver a consultar los grupos
      setGroupsVersion((value) => value + 1);

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudieron crear los grupos.'
      );

    } finally {
      setSaving(false);
    }
  }

  return (
    <main
      className="min-h-screen"
      style={{ background: 'var(--bg-secondary)' }}
    >
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-6">

        {/* ENCABEZADO */}
        <header className="mb-8">
          <span
            className="inline-block rounded-full px-4 py-2 text-xs font-bold"
            style={{
              background: 'var(--verde-limon)',
              fontFamily: 'var(--font-heading)',
            }}
          >
            CODE CATS STUDIO
          </span>

          <h1
            className="mt-5 text-5xl leading-none sm:text-6xl"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            PANEL DE{' '}
            <span style={{ color: 'var(--azul-gatuno)' }}>
              ADMINISTRACIÓN
            </span>
          </h1>
        </header>

        {/* NAVEGACIÓN */}
        <nav
          aria-label="Secciones del panel"
          className="mb-6 grid grid-cols-3 gap-2 sm:gap-3"
        >
          {sections.map((item, index) => {
            const selected = section === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                aria-pressed={selected}
                className="rounded-xl border px-3 py-4 text-left transition-colors sm:px-5"
                style={{
                  background: selected
                    ? 'var(--azul-gatuno)'
                    : '#FFFFFF',
                  borderColor: selected
                    ? 'var(--azul-gatuno)'
                    : 'var(--border)',
                  color: selected
                    ? '#FFFFFF'
                    : 'var(--text-primary)',
                }}
              >
                <span className="block text-xs opacity-70">
                  0{index + 1}
                </span>
                <span
                  className="mt-1 block text-sm font-bold sm:text-lg"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* PANEL */}
        <section
          className="overflow-hidden rounded-2xl border bg-white"
          style={{ borderColor: 'var(--border)' }}
        >
          <div
            className="border-b px-6 py-5"
            style={{ borderColor: 'var(--border)' }}
          >
            <h2
              className="text-2xl font-bold"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {section === 'grupos'
                ? 'Gestión de grupos'
                : section === 'usuarios'
                  ? 'Gestión de usuarios'
                  : 'Certificados'}
            </h2>
          </div>

          <div className="p-6">

            {/* ESTADO DE ACCESO */}
            {preview && (
              <p
                role="status"
                className="mb-5 rounded-xl bg-gray-100 px-4 py-3 text-sm text-gray-700"
              >
                Vista previa. Las operaciones reales están deshabilitadas.
              </p>
            )}

            {!preview && !isAdmin && (
              <p
                role="status"
                className="mb-5 rounded-xl bg-gray-100 px-4 py-3 text-sm"
              >
                {authLoading
                  ? 'Verificando acceso...'
                  : 'Se requiere acceso de administrador.'}
              </p>
            )}

            {error && (
              <p
                role="alert"
                className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700"
              >
                {error}
              </p>
            )}

            {success && (
              <p
                role="status"
                className="mb-5 rounded-xl bg-green-50 p-4 text-sm text-green-800"
              >
                {success}
              </p>
            )}

            {/* GRUPOS */}
            {section === 'grupos' && (
              <div className="space-y-6">

                <div className="grid gap-5 md:grid-cols-2">

                  {/* EDICIÓN */}
                  <div className="md:col-span-2">
                    <label
                      htmlFor="admin-offering"
                      className="mb-2 block text-sm font-bold"
                    >
                      Edición del curso
                    </label>

                    <select
                      id="admin-offering"
                      value={offeringId}
                      disabled={!isAdmin || loading}
                      onChange={(event) => {
                        setOfferingId(event.target.value);
                        setTeacherIds([]);
                        setGroups([]);
                        setGroupsLoaded(false);
                        setAlreadyCreated(false);
                        setSuccess('');
                      }}
                      className="w-full rounded-xl border bg-white px-4 py-3 text-sm disabled:bg-gray-50"
                    >
                      <option value="">
                        {loading
                          ? 'Cargando ediciones...'
                          : 'Seleccionar edición'}
                      </option>

                      {offerings.map((offering) => (
                        <option
                          key={offering.id}
                          value={offering.id}
                        >
                          {offering.courseTitle} — {offering.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* DOCENTES */}
                  <div>
                    <p className="mb-2 text-sm font-bold">
                      Docentes responsables
                    </p>

                    <div className="max-h-44 min-h-12 overflow-y-auto rounded-xl border p-3">
                      {teachers.length === 0 ? (
                        <p className="text-sm text-gray-500">
                          {loading
                            ? 'Cargando docentes...'
                            : 'Sin docentes para mostrar'}
                        </p>
                      ) : (
                        teachers.map((teacher) => (
                          <label
                            key={teacher.id}
                            className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-gray-50"
                          >
                            <input
                              type="checkbox"
                              disabled={!isAdmin || groups.length > 0}
                              checked={teacherIds.includes(teacher.id)}
                              onChange={() => toggleTeacher(teacher.id)}
                            />
                            <span>{teacher.full_name}</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>

                  {/* TAMAÑO */}
                  <div>
                    <label
                      htmlFor="admin-group-size"
                      className="mb-2 block text-sm font-bold"
                    >
                      Estudiantes por grupo
                    </label>

                    <input
                      id="admin-group-size"
                      type="number"
                      min={1}
                      step={1}
                      value={groupSize}
                      onChange={(event) =>
                        setGroupSize(event.target.value)
                      }
                      aria-invalid={!validSize}
                      className="w-full rounded-xl border px-4 py-3 text-sm"
                      style={{
                        borderColor: validSize
                          ? 'var(--border)'
                          : '#DC2626',
                      }}
                    />

                    {!validSize && (
                      <p
                        role="alert"
                        className="mt-2 text-xs text-red-600"
                      >
                        Ingresa un número entero mayor que cero.
                      </p>
                    )}
                  </div>
                </div>

                {/* CREAR GRUPOS */}
                <button
                  type="button"
                  disabled={!canCreate}
                  onClick={() => void handleCreateGroups()}
                  className="rounded-xl px-6 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    background: 'var(--azul-gatuno)',
                    fontFamily: 'var(--font-heading)',
                  }}
                >
                  {saving ? 'Creando grupos...' : 'Crear grupos'}
                </button>

                {/* GRUPOS EXISTENTES */}
                {offeringId && (
                  <div>
                    <h3
                      className="mb-3 text-lg font-bold"
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      Grupos existentes
                    </h3>

                    {loadingGroups ? (
                      <p className="text-sm text-gray-500">
                        Consultando grupos...
                      </p>
                    ) : groups.length === 0 ? (
                      <p className="text-sm text-gray-500">
                        Esta edición no tiene grupos registrados.
                      </p>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="p-3">Grupo</th>
                              <th className="p-3">Capacidad</th>
                            </tr>
                          </thead>
                          <tbody>
                            {groups.map((group) => (
                              <tr key={group.id} className="border-t">
                                <td className="p-3">{group.name}</td>
                                <td className="p-3">
                                  {group.capacity ?? '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* USUARIOS: SIGUIENTE ETAPA */}
            {section === 'usuarios' && (
                <UsersPanel isAdmin={isAdmin} />
            )}

            {/* CERTIFICADOS: SIGUIENTE ETAPA */}
            {section === 'certificados' && (
            <CertificatesPanel
                isAdmin={isAdmin}
                offerings={offerings}
                offeringsLoading={loading}
            />
            )}

          </div>
        </section>
      </div>
    </main>
  );
}
