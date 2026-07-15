import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { StatusBadge } from '../components/StatusBadge';
import { useIncidentStore } from '../context/IncidentStoreContext';
import { MUNICIPALITIES } from '../data/municipalities';
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
  const { incidents, municipalityId, setMunicipalityId } = useIncidentStore();
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<IncidentCategory | 'all'>('all');

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
              {MUNICIPALITIES.map((m) => (
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

          <span className="filters-bar__count">
            {visibleIncidents.length} incidencia{visibleIncidents.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="incident-table">
          <div className="incident-table__row incident-table__row--header">
            <span>Título</span>
            <span>Categoría</span>
            <span>Estado</span>
            <span>Prioridad</span>
            <span>Fecha</span>
          </div>

          {visibleIncidents.length === 0 && (
            <div className="incident-table__empty">No hay incidencias que coincidan con estos filtros.</div>
          )}

          {visibleIncidents.map((incident) => (
            <Link key={incident.id} to={`/incidents/${incident.id}`} className="incident-table__row">
              <span className="incident-table__title">{incident.title}</span>
              <span>{INCIDENT_CATEGORY_LABELS[incident.category]}</span>
              <span>
                <StatusBadge status={incident.status} />
              </span>
              <span className="incident-table__priority">{incident.priorityScore.toFixed(1)}</span>
              <span>{incident.date}</span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
