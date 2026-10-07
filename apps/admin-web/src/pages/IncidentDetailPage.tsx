import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { LazyIncidentMap } from '../components/LazyIncidentMap';
import { StatusBadge } from '../components/StatusBadge';
import { useIncidentStore } from '../context/IncidentStoreContext';
import { nextStatusOptions } from '../data/workflow';
import { formatDate, formatDateTime } from '../lib/format';
import { INCIDENT_CATEGORY_LABELS, INCIDENT_STATUS_LABELS, type IncidentStatus } from '../types/incident';

// RF-003 / RF-010 / §11.2: full incident detail with workflow actions
// (change status, delete) for operators/administrators. §13 grants both
// roles full status-change and delete rights in this scaffold.
export function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getIncident, loadIncident, setStatus, deleteIncident, municipalities } = useIncidentStore();
  const [note, setNote] = useState('');
  const [state, setState] = useState<'loading' | 'ready' | 'notFound' | 'error'>('loading');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    loadIncident(id)
      .then((found) => !cancelled && setState(found ? 'ready' : 'notFound'))
      .catch(() => !cancelled && setState('error'));
    return () => {
      cancelled = true;
    };
  }, [id, loadIncident]);

  const incident = id ? getIncident(id) : undefined;

  if (!incident) {
    return (
      <div className="page">
        <AppHeader />
        <main className="page__content">
          <p>
            {state === 'loading'
              ? 'Cargando incidencia…'
              : state === 'error'
                ? 'No se pudo cargar la incidencia. Inténtalo de nuevo.'
                : 'No se ha encontrado la incidencia.'}
          </p>
          <Link to="/dashboard" className="button button--ghost">
            Volver a la bandeja
          </Link>
        </main>
      </div>
    );
  }

  const municipality = municipalities.find((m) => m.id === incident.municipalityId);
  const options = nextStatusOptions(incident.status);
  const comments = incident.comments ?? [];

  const runAction = async (action: () => Promise<void>) => {
    setBusy(true);
    setActionError(null);
    try {
      await action();
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleStatusChange = (status: IncidentStatus) => {
    const requiresNote = status === 'resolved' || status === 'declined';
    if (requiresNote && note.trim().length === 0) {
      setActionError('Añade una nota antes de resolver o declinar la incidencia.');
      return;
    }
    void runAction(async () => {
      await setStatus(incident.id, status, note.trim() || undefined);
      setNote('');
    });
  };

  const handleDelete = () => {
    const confirmed = window.confirm(`¿Eliminar la incidencia "${incident.title}"? Esta acción no se puede deshacer.`);
    if (!confirmed) return;
    void runAction(async () => {
      await deleteIncident(incident.id);
      navigate('/dashboard', { replace: true });
    });
  };

  return (
    <div className="page">
      <AppHeader />
      <main className="page__content">
        <Link to="/dashboard" className="back-link">
          ← Volver a la bandeja
        </Link>

        <div className="detail-header">
          <div>
            <h1 className="page__title">{incident.title}</h1>
            <p className="page__subtitle">
              {INCIDENT_CATEGORY_LABELS[incident.category]} · {municipality?.name ?? incident.municipalityId} ·{' '}
              {formatDate(incident.date)} · {incident.authorName}
            </p>
          </div>
          <div className="detail-header__meta">
            <StatusBadge status={incident.status} />
            <span className="priority-pill">Prioridad {incident.priorityScore.toFixed(1)}</span>
          </div>
        </div>

        <div className="detail-grid">
          <section className="card">
            <h2 className="card__title">Imágenes</h2>
            {incident.photos.length === 0 ? (
              <p className="card__empty">El vecino no adjuntó fotos.</p>
            ) : (
              <div className="photo-grid">
                {incident.photos.map((url, index) => (
                  <a key={url} href={url} target="_blank" rel="noreferrer" className="photo-grid__item">
                    <img src={url} alt={`Foto ${index + 1} de la incidencia`} loading="lazy" />
                  </a>
                ))}
              </div>
            )}
          </section>

          <section className="card">
            <h2 className="card__title">Descripción</h2>
            <p>{incident.description}</p>
          </section>

          <section className="card">
            <h2 className="card__title">Ubicación</h2>
            <p>{incident.location.address}</p>
            <p className="card__muted">
              lat {incident.location.lat.toFixed(4)}, lng {incident.location.lng.toFixed(4)}
            </p>
            <LazyIncidentMap
              incidents={[incident]}
              center={incident.location}
              zoom={16}
              className="incident-map--small"
            />
          </section>

          <section className="card">
            <h2 className="card__title">Actividad</h2>
            <ul className="stat-list">
              <li>{incident.likes} apoyos</li>
              <li>{incident.watchersCount} seguidores</li>
              <li>{incident.commentsCount} comentarios</li>
            </ul>
          </section>

          <section className="card">
            <h2 className="card__title">Comentarios</h2>
            {comments.length === 0 ? (
              <p className="card__empty">Aún no hay comentarios.</p>
            ) : (
              <ul className="comment-list">
                {comments.map((comment) => (
                  <li key={comment.id} className="comment-list__item">
                    <div className="comment-list__meta">
                      <strong>{comment.author}</strong>
                      {comment.isMunicipality && <span className="tag">Ayuntamiento</span>}
                      <span className="card__muted">{formatDateTime(comment.date)}</span>
                    </div>
                    <p>{comment.text}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card">
            <h2 className="card__title">Historial</h2>
            <ol className="history-list">
              {incident.history.map((entry, index) => (
                <li key={`${entry.status}-${index}`} className="history-list__item">
                  <StatusBadge status={entry.status} />
                  <span className="card__muted">{formatDateTime(entry.date)}</span>
                  {entry.note && <p className="history-list__note">{entry.note}</p>}
                </li>
              ))}
            </ol>
          </section>

          <section className="card card--actions">
            <h2 className="card__title">Acciones</h2>

            {actionError && (
              <p className="alert alert--error" role="alert">
                {actionError}
              </p>
            )}

            {options.length > 0 ? (
              <>
                <label className="field">
                  <span className="field__label">Nota (obligatoria para resolver o declinar)</span>
                  <textarea
                    className="field__input field__input--textarea"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Motivo del cambio de estado…"
                    rows={3}
                  />
                </label>

                <div className="action-buttons">
                  {options.map((status) => (
                    <button
                      key={status}
                      type="button"
                      className={
                        status === 'declined' ? 'button button--danger-outline' : 'button button--primary'
                      }
                      onClick={() => handleStatusChange(status)}
                      disabled={busy}
                    >
                      Marcar como {INCIDENT_STATUS_LABELS[status]}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p className="card__empty">Esta incidencia está en un estado final ({INCIDENT_STATUS_LABELS[incident.status]}).</p>
            )}

            <hr className="divider" />

            <button type="button" className="button button--danger" onClick={handleDelete} disabled={busy}>
              Eliminar incidencia
            </button>
          </section>
        </div>
      </main>
    </div>
  );
}
