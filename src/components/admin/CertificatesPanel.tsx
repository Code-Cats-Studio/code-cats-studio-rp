
import { useEffect, useState } from 'react';
import type { AdminOffering } from '../../services/admin';
import {
  fetchCertificateOverview,
  issueCertificatesForOffering,
  type CertificateOverview,
} from '../../services/adminCertificates';

interface CertificatesPanelProps {
  isAdmin: boolean;
  offerings: AdminOffering[];
  offeringsLoading: boolean;
}

export default function CertificatesPanel({
  isAdmin,
  offerings,
  offeringsLoading,
}: CertificatesPanelProps) {
  const [offeringId, setOfferingId] = useState('');
  const [overview, setOverview] =
    useState<CertificateOverview | null>(null);

  const [loading, setLoading] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setOverview(null);

    if (!isAdmin || !offeringId) return;

    let active = true;

    async function loadCertificates() {
      setLoading(true);
      setError('');

      try {
        const data = await fetchCertificateOverview(offeringId);

        if (active) setOverview(data);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : 'No se pudieron cargar los certificados.'
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadCertificates();

    return () => {
      active = false;
    };
  }, [isAdmin, offeringId, refresh]);

  async function handleIssue() {
    if (
      !isAdmin ||
      !offeringId ||
      !overview ||
      overview.approved === 0 ||
      issuing ||
      loading
    ) return;

    const offering = offerings.find(
      (item) => item.id === offeringId
    );

    const confirmed = window.confirm(
      `¿Confirmas la emisión de certificados para ` +
      `"${offering?.courseTitle ?? 'esta edición'}"?\n\n` +
      `Solo se emitirán certificados de estudiantes ` +
      `aprobados que aún no tengan uno.`
    );

    if (!confirmed) return;

    setIssuing(true);
    setError('');
    setSuccess('');

    try {
      const count = await issueCertificatesForOffering(
        offeringId
      );

      setSuccess(
        count === 0
          ? 'No había certificados nuevos por emitir.'
          : `Se emitieron ${count} certificado(s) correctamente.`
      );

      setRefresh((value) => value + 1);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudieron emitir los certificados.'
      );
    } finally {
      setIssuing(false);
    }
  }

  return (
    <div className="space-y-6">

      {/* SELECCIÓN DE EDICIÓN */}
      <div>
        <label
          htmlFor="cert-offering"
          className="mb-2 block text-sm font-bold"
        >
          Edición del curso
        </label>

        <select
          id="cert-offering"
          value={offeringId}
          disabled={!isAdmin || offeringsLoading || issuing}
          onChange={(event) => {
            setOfferingId(event.target.value);
            setOverview(null);
            setSuccess('');
            setError('');
          }}
          className="w-full rounded-xl border bg-white px-4 py-3 text-sm disabled:bg-gray-50"
          style={{ borderColor: 'var(--border)' }}
        >
          <option value="">
            {offeringsLoading
              ? 'Cargando ediciones...'
              : 'Seleccionar edición'}
          </option>

          {offerings.map((offering) => (
            <option key={offering.id} value={offering.id}>
              {offering.courseTitle} — {offering.label}
            </option>
          ))}
        </select>
      </div>

      {/* MENSAJES */}
      {!isAdmin && (
        <p className="rounded-xl bg-gray-50 p-3 text-sm text-gray-600">
          Vista de prueba. Se requiere una cuenta administradora
          para consultar y emitir certificados.
        </p>
      )}

      {loading && (
        <p role="status" className="text-sm text-gray-500">
          Consultando resultados...
        </p>
      )}

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {success && (
        <p role="status" className="rounded-xl bg-green-50 p-3 text-sm text-green-800">
          {success}
        </p>
      )}

      {/* RESUMEN */}
      {overview && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border p-5">
            <p className="text-sm text-gray-500">
              Estudiantes aprobados
            </p>
            <p
              className="mt-2 text-4xl"
              style={{
                color: 'var(--azul-gatuno)',
                fontFamily: 'var(--font-display)',
              }}
            >
              {overview.approved}
            </p>
          </div>

          <div className="rounded-xl border p-5">
            <p className="text-sm text-gray-500">
              Certificados registrados
            </p>
            <p
              className="mt-2 text-4xl"
              style={{
                color: 'var(--azul-gatuno)',
                fontFamily: 'var(--font-display)',
              }}
            >
              {overview.issued}
            </p>
          </div>
        </div>
      )}

      {/* TABLA */}
      <div
        className="overflow-x-auto rounded-xl border"
        style={{ borderColor: 'var(--border)' }}
      >
        <table className="w-full min-w-[420px] text-left text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-4">Estudiante</th>
              <th className="p-4">Fecha de emisión</th>
              <th className="p-4">Estado</th>
            </tr>
          </thead>

          <tbody>
            {!overview || overview.certificates.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="p-8 text-center text-gray-500"
                >
                  {!offeringId
                    ? 'Selecciona una edición.'
                    : 'No hay certificados para mostrar.'}
                </td>
              </tr>
            ) : (
              overview.certificates.map((certificate) => (
                <tr key={certificate.id} className="border-t">
                  <td className="p-4 font-medium">
                    {certificate.user_name_snapshot}
                  </td>

                  <td className="p-4">
                    {new Intl.DateTimeFormat('es-BO', {
                      timeZone: 'America/La_Paz',
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    }).format(new Date(certificate.issued_at))}
                  </td>

                  <td className="p-4">
                    <span
                      className={
                        certificate.revoked_at
                          ? 'rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-800'
                          : 'rounded-full bg-lime-100 px-3 py-1 text-xs font-bold text-green-900'
                      }
                    >
                      {certificate.revoked_at
                        ? 'Revocado'
                        : 'Emitido'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {overview && overview.issued > 100 && (
        <p className="text-xs text-gray-500">
          Se muestran los 100 certificados más recientes.
        </p>
      )}

      {/* ACCIÓN PRINCIPAL */}
      <button
        type="button"
        disabled={
          !isAdmin ||
          !offeringId ||
          !overview ||
          overview.approved === 0 ||
          loading ||
          issuing
        }
        onClick={() => void handleIssue()}
        className="rounded-xl px-6 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
        style={{
          background: 'var(--azul-gatuno)',
          fontFamily: 'var(--font-heading)',
        }}
      >
        {issuing
          ? 'Emitiendo certificados...'
          : 'Emitir certificados'}
      </button>

    </div>
  );
}
