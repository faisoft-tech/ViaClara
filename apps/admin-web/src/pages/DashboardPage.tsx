import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { LazyIncidentMap } from '../components/LazyIncidentMap';
import { StatusBadge } from '../components/StatusBadge';
import { useIncidentStore } from '../context/IncidentStoreContext';
import { formatDate } from '../lib/format';
import {
  INCIDENT_CATEGORY_LABELS,
  INCIDENT_STATUS_LABELS,
  type IncidentCategory,
  type IncidentStatus,
} from '../types/incident';

const STATUS_FILTERS: (IncidentStatus | 'all')[] = ['all', 'submitted', 'open', 'in_progress', 'resolved', 'declined'];
const CATEGORY_FILTERS: (IncidentCategory | 'all')[] = [
  'all',
  'lighting',
  'road',
  'cleaning',
  'furniture',
  'green_areas',
  'other',
];

// RF-010 / §8.2: incident inbox for operators/administrators. RF-015 (§10
// regla 10) requires the default sort to be priorityScore descending — this
// is called out as very important in the spec, mirroring the citizen-facing
// "Inicio" screen in the mobile app.
export function DashboardPage() {
  const { incidents, municipalities, municipalityId, setMunicipalityId, loading, error, lastUpdated, refresh } =
    useIncidentStore();
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<IncidentCategory | 'all'>('all');
  const [view, setView] = useState<'list' | 'map'>('list');
  const navigate = useNavigate();
  const municipality = municipalities.find((m) => m.id === municipalityId);

  const visibleIncidents = useMemo(() => {
    return incidents
      .filter((incident) => incident.municipalityId === municipalityId)
      .filter((incident) => statusFilter === 'all' || incident.status === statusFilter)
      .filter((incident) => categoryFilter === 'all' || incident.category === categoryFilter)
      .sort((a, b) => b.priorityScore - a.priorityScore);
  }, [incidents, municipalityId, statusFilter, categoryFilter]);

  return (
    <div className="page">
      <AppHeader />
      <main className="page__content">
        <div className="dashboard-toolbar">
          <div>
            <h1 className="page__title">Bandeja de incidencias</h1>
            <p className="page__subtitle">
              Ordenada por puntuación de prioridad (apoyos, seguidores y comentarios) — RF-015.
            </p>
          </div>

          <label className="field field--inline">
            <span className="field__label">Municipio</span>
            <select
              className="field__input"
              value={municipalityId}
              onChange={(e) => setMunicipalityId(e.target.value)}
            >
              {municipalities.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="filters-bar">
          <label className="field field--inline">
            <span className="field__label">Estado</span>
            <select
              className="field__input"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as IncidentStatus | 'all')}
            >
              {STATUS_FILTERS.map((status) => (
                <option key={status} value={status}>
                  {status === 'all' ? 'Todos' : INCIDENT_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </label>

          <label className="field field--inline">
            <span className="field__label">Categoría</span>
            <select
              className="field__input"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as IncidentCategory | 'all')}
            >
              {CATEGORY_FILTERS.map((category) => (
                <option key={category} value={category}>
                  {category === 'all' ? 'Todas' : INCIDENT_CATEGORY_LABELS[category]}
                </option>
              ))}
            </select>
          </label>

          <div className="view-toggle" role="group" aria-label="Vista">
            {(['list', 'map'] as const).map((option) => (
              <button
                key={option}
                type="button"
                className={`view-toggle__option${view === option ? ' view-toggle__option--active' : ''}`}
                aria-pressed={view === option}
                onClick={() => setView(option)}
              >
                {option === 'list' ? 'Lista' : 'Mapa'}
              </button>
            ))}
          </div>

          <span className="filters-bar__count">
            {visibleIncidents.length} incidencia{visibleIncidents.length === 1 ? '' : 's'}
            {lastUpdated && ` · actualizado ${lastUpdated.toLocaleTimeString('es-ES')}`}
          </span>
          <button type="button" className="button button--ghost" onClick={() => void refresh()} disabled={loading}>
            {loading ? 'Actualizando…' : 'Actualizar'}
          </button>
        </div>

        {error && (
          <p className="alert alert--error" role="alert">
            No se pudieron cargar las incidencias: {error}
          </p>
        )}

        {view === 'map' && municipality && (
          <LazyIncidentMap
            incidents={visibleIncidents}
            center={municipality.center}
            onOpen={(id) => navigate(`/incidents/${id}`)}
          />
        )}

        {view === 'list' && (
          <div className="incident-table">
            <div className="incident-table__row incident-table__row--header">
              <span>Título</span>
              <span>Categoría</span>
              <span>Estado</span>
              <span>Prioridad</span>
              <span>Fecha</span>
            </div>

            {visibleIncidents.length === 0 && (
              <div className="incident-table__empty">
                {loading && !lastUpdated ? 'Cargando incidencias…' : 'No hay incidencias que coincidan con estos filtros.'}
              </div>
            )}

            {visibleIncidents.map((incident) => (
              <Link key={incident.id} to={`/incidents/${incident.id}`} className="incident-table__row">
                <span className="incident-table__title">
                  {incident.photos[0] ? (
                    <img className="incident-table__thumb" src={incident.photos[0]} alt="" loading="lazy" />
                  ) : (
                    <span className="incident-table__thumb incident-table__thumb--empty" aria-hidden="true" />
                  )}
                  {incident.title}
                </span>
                <span>{INCIDENT_CATEGORY_LABELS[incident.category]}</span>
                <span>
                  <StatusBadge status={incident.status} />
                </span>
                <span className="incident-table__priority">{incident.priorityScore.toFixed(1)}</span>
                <span>{formatDate(incident.date)}</span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
