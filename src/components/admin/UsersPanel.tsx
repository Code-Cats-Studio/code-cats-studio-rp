
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  fetchAdminUsers,
  suspendAdminUser,
  reactivateAdminUser,
  type AdminUser,
} from '../../services/adminUsers';

interface UsersPanelProps {
  isAdmin: boolean;
}

export default function UsersPanel({ isAdmin }: UsersPanelProps) {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);

  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Cargar cuentas únicamente con permisos administrativos
  useEffect(() => {
    if (!isAdmin) {
      setUsers([]);
      return;
    }

    let active = true;

    async function loadUsers() {
      setLoading(true);
      setError('');

      try {
        const data = await fetchAdminUsers();

        if (active) setUsers(data);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : 'No se pudieron consultar los usuarios.'
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadUsers();

    return () => {
      active = false;
    };
  }, [isAdmin, refresh]);

  // Filtros de búsqueda
  const filteredUsers = users.filter((account) => {
    const text = `${account.full_name ?? ''} ${account.email ?? ''}`
      .toLowerCase();

    const matchesSearch = text.includes(search.toLowerCase());

    const matchesStatus =
      filter === 'all' || account.status === filter;

    return matchesSearch && matchesStatus;
  });

  // Confirmar suspensión
  async function handleSuspend() {
    if (!selected || !reason.trim() || !isAdmin || busy) return;

    const confirmed = window.confirm(
      `¿Confirmas la suspensión de ${selected.full_name || selected.email || 'esta cuenta'}?`
    );

    if (!confirmed) return;

    setBusy(true);
    setError('');
    setMessage('');

    try {
      await suspendAdminUser(selected.id, reason);

      setSelected(null);
      setReason('');
      setMessage('La cuenta fue suspendida correctamente.');
      setRefresh((value) => value + 1);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo suspender la cuenta.'
      );
    } finally {
      setBusy(false);
    }
  }

  // Confirmar reactivación
  async function handleReactivate(account: AdminUser) {
    if (!isAdmin || busy) return;

    if (!window.confirm(
      `¿Reactivar la cuenta de ${account.full_name || account.email || 'este usuario'}?`
    )) return;

    setBusy(true);
    setError('');
    setMessage('');

    try {
      await reactivateAdminUser(account.id);

      setMessage('La cuenta fue reactivada correctamente.');
      setRefresh((value) => value + 1);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo reactivar la cuenta.'
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">

      {/* BÚSQUEDA Y FILTROS */}
      <div className="flex flex-col gap-3 sm:flex-row">

        <input
          type="search"
          placeholder="Buscar por nombre o correo..."
          aria-label="Buscar usuarios"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="min-w-0 flex-1 rounded-xl border px-4 py-3 text-sm"
          style={{ borderColor: 'var(--border)' }}
        />

        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          aria-label="Filtrar por estado"
          className="rounded-xl border px-4 py-3 text-sm"
          style={{ borderColor: 'var(--border)' }}
        >
          <option value="all">Todos</option>
          <option value="active">Activos</option>
          <option value="suspended">Suspendidos</option>
        </select>

        <button
          type="button"
          disabled={!isAdmin || loading || busy}
          onClick={() => setRefresh((value) => value + 1)}
          className="rounded-xl border px-4 py-3 text-sm font-bold disabled:opacity-50"
        >
          Actualizar
        </button>
      </div>

      {/* MENSAJES */}
      {message && (
        <p role="status" className="rounded-xl bg-green-50 p-3 text-sm text-green-800">
          {message}
        </p>
      )}

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {!isAdmin && (
        <p role="status" className="rounded-xl bg-gray-50 p-3 text-sm text-gray-600">
          Vista previa. La consulta y las acciones sobre cuentas requieren acceso administrativo.
        </p>
      )}

      {/* TABLA DE USUARIOS */}
      <div
        className="overflow-x-auto rounded-xl border"
        style={{ borderColor: 'var(--border)' }}
      >
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-4">Usuario</th>
              <th className="p-4">Rol</th>
              <th className="p-4">Estado</th>
              <th className="p-4">Acción</th>
            </tr>
          </thead>

          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-500">
                  {loading
                    ? 'Cargando usuarios...'
                    : isAdmin
                      ? 'No se encontraron usuarios.'
                      : 'Sin datos cargados.'}
                </td>
              </tr>
            ) : (
              filteredUsers.map((account) => (
                <tr key={account.id} className="border-t">
                  <td className="p-4">
                    <p className="font-semibold">
                      {account.full_name || 'Sin nombre'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {account.email || 'Sin correo'}
                    </p>
                  </td>

                  <td className="p-4">
                    {account.roles.join(', ') || 'Sin rol'}
                  </td>

                  <td className="p-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        account.status === 'active'
                          ? 'bg-lime-100 text-green-900'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {account.status === 'active'
                        ? 'Activo'
                        : 'Suspendido'}
                    </span>
                  </td>

                  <td className="p-4">
                    {account.status === 'active' ? (
                      <button
                        type="button"
                        disabled={!isAdmin || busy || account.id === currentUser?.id}
                        onClick={() => {
                          setSelected(account);
                          setReason('');
                          setMessage('');
                          setError('');
                        }}
                        className="rounded-lg border px-3 py-2 font-semibold disabled:opacity-40"
                      >
                        Suspender
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={!isAdmin || busy}
                        onClick={() => void handleReactivate(account)}
                        className="rounded-lg border px-3 py-2 font-semibold disabled:opacity-40"
                      >
                        Reactivar
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isAdmin && (
        <p className="text-xs text-gray-500">
          Consulta inicial limitada a 200 cuentas.
        </p>
      )}

      {/* CONFIRMACIÓN DE SUSPENSIÓN */}
      {selected && (
        <form
          className="rounded-xl border p-5"
          style={{ borderColor: 'var(--border)' }}
          onSubmit={(event) => {
            event.preventDefault();
            void handleSuspend();
          }}
        >
          <h3 className="mb-3 text-lg font-bold">
            Suspender cuenta
          </h3>

          <p className="mb-3 text-sm">
            {selected.full_name || selected.email}
          </p>

          <label htmlFor="suspension-reason" className="mb-2 block text-sm font-bold">
            Motivo de suspensión
          </label>

          <textarea
            id="suspension-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            required
            rows={3}
            className="w-full rounded-xl border p-3 text-sm"
            placeholder="Escribe el motivo..."
          />

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={!reason.trim() || busy}
              className="rounded-xl px-5 py-3 font-bold text-white disabled:opacity-50"
              style={{ background: 'var(--azul-gatuno)' }}
            >
              {busy ? 'Procesando...' : 'Confirmar suspensión'}
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={() => setSelected(null)}
              className="rounded-xl border px-5 py-3 font-bold"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
