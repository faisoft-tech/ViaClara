import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { StatusBadge } from '../components/StatusBadge';
import { useIncidentStore } from '../context/IncidentStoreContext';
import { getMunicipality } from '../data/municipalities';
import { nextStatusOptions } from '../data/workflow';
import { INCIDENT_CATEGORY_LABELS, INCIDENT_STATUS_LABELS, type IncidentStatus } from '../types/incident';

// RF-003 / RF-010 / §11.2: full incident detail with workflow actions
// (change status, delete) for operators/administrators. §13 grants both
// roles full status-change and delete rights in this scaffold.
export function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getIncident, setStatus, deleteIncident } = useIncidentStore();
  const [note, setNote] = useState('');

  const incident = id ? getIncident(id) : undefined;

  if (!incident) {
    return (
      <div className="page">
        <AppHeader />
        <main className="page__content">
          <p>No se ha encontrado la incidencia.</p>
          <Link to="/dashboard" className="button button--ghost">
            Volver a la bandeja
          </Link>
        </main>
      </div>
    );
  }

  const municipality = getMunicipality(incident.municipalityId);
  const options = nextStatusOptions(incident.status);

  const handleStatusChange = (status: IncidentStatus) => {
    const requiresNote = status === 'resolved' || status === 'declined';
    if (requiresNote && note.trim().length === 0) {
      window.alert('Añade una nota antes de resolver o declinar la incidencia.');
      return;
    }
    setStatus(incident.id, status, note.trim() || undefined);
    setNote('');
  };

  const handleDelete = () => {
    const confirmed = window.confirm(`¿Eliminar la incidencia "${incident.title}"? Esta acción no se puede deshacer.`);
    if (!confirmed) return;
    deleteIncident(incident.id);
    navigate('/dashboard', { replace: true });
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
              {incident.date}
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
            {incident.images.length === 0 ? (
              <p className="card__empty">Sin imágenes adjuntas (simulado en este prototipo).</p>
            ) : (
              <ul className="image-list">
                {incident.images.map((src) => (
                  <li key={src} className="image-list__item">
                    {src}
                  </li>
                ))}
              </ul>
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
          </section>

          <section className="card">
            <h2 className="card__title">Actividad</h2>
            <ul className="stat-list">
              <li>{incident.likes} apoyos</li>
              <li>{incident.watchers.length} seguidores</li>
              <li>{incident.comments.length} comentarios</li>
            </ul>
          </section>

          <section className="card">
            <h2 className="card__title">Comentarios</h2>
            {incident.comments.length === 0 ? (
              <p className="card__empty">Aún no hay comentarios.</p>
            ) : (
              <ul className="comment-list">
                {incident.comments.map((comment) => (
                  <li key={comment.id} className="comment-list__item">
                    <div className="comment-list__meta">
                      <strong>{comment.author}</strong>
                      {comment.isMunicipality && <span className="tag">Ayuntamiento</span>}
                      <span className="card__muted">{comment.date}</span>
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
                  <span className="card__muted">{entry.date}</span>
                  {entry.note && <p className="history-list__note">{entry.note}</p>}
                </li>
              ))}
            </ol>
          </section>

          <section className="card card--actions">
            <h2 className="card__title">Acciones</h2>

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

            <button type="button" className="button button--danger" onClick={handleDelete}>
              Eliminar incidencia
            </button>
          </section>
        </div>
      </main>
    </div>
  );
}
