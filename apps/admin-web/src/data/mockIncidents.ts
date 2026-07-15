import type { Incident } from '../types/incident';
import { computePriorityScore } from './priority';

// In-memory mock data — no backend yet (RF-009 is pending). Mirrors the
// shape and Almuñécar/Salobreña/Motril flavor of the mobile app's
// src/data/incidencias.ts, but using the target English field names from
// DOCUMENTO_VIACLARA.md §9.2.

function withPriorityScore(incident: Omit<Incident, 'priorityScore'>): Incident {
  return { ...incident, priorityScore: computePriorityScore(incident) };
}

const RAW_INCIDENTS: Omit<Incident, 'priorityScore'>[] = [
  {
    id: 'inc-001',
    title: 'Farola fundida en el Paseo del Altillo',
    date: '2026-07-11',
    location: { address: 'Paseo del Altillo, junto al banco azul', lat: 36.7361, lng: -3.6884 },
    images: [],
    category: 'lighting',
    description:
      'La farola lleva tres noches apagada. La zona del paseo queda muy oscura y da inseguridad al pasear.',
    createdBy: 'María J.',
    status: 'in_progress',
    likes: 23,
    watchers: Array.from({ length: 12 }, (_, i) => `watcher-${i + 1}`),
    comments: [
      { id: 'c1', author: 'Pedro R.', text: 'Confirmo, ayer pasé por allí y sigue apagada.', date: '2026-07-12', likes: 3 },
      {
        id: 'c2',
        author: 'Ayuntamiento de Almuñécar',
        text: 'Aviso asignado a la brigada de mantenimiento. Lo revisamos esta semana.',
        date: '2026-07-12',
        isMunicipality: true,
        likes: 5,
      },
    ],
    history: [
      { status: 'submitted', date: '2026-07-11' },
      { status: 'open', date: '2026-07-12' },
      { status: 'in_progress', date: '2026-07-12', note: 'Asignado a brigada de mantenimiento' },
    ],
    municipalityId: 'almunecar',
  },
  {
    id: 'inc-002',
    title: 'Bache grande en la Avenida de Andalucía',
    date: '2026-07-09',
    location: { address: 'Avenida de Andalucía, 45', lat: 36.7312, lng: -3.6921 },
    images: [],
    category: 'road',
    description: 'Bache profundo cerca del paso de peatones. Varios coches han dado un golpe fuerte.',
    createdBy: 'Anónimo',
    status: 'open',
    likes: 41,
    watchers: Array.from({ length: 18 }, (_, i) => `watcher-${i + 1}`),
    comments: [
      { id: 'c3', author: 'Lucía M.', text: 'A mí casi me revienta una rueda. Urge arreglarlo.', date: '2026-07-10', likes: 7 },
    ],
    history: [
      { status: 'submitted', date: '2026-07-09' },
      { status: 'open', date: '2026-07-10', note: 'Validado, pendiente de asignar' },
    ],
    municipalityId: 'almunecar',
  },
  {
    id: 'inc-003',
    title: 'Contenedor desbordado en la Plaza Mayor',
    date: '2026-07-05',
    location: { address: 'Plaza Mayor', lat: 36.7345, lng: -3.6899 },
    images: [],
    category: 'cleaning',
    description: 'El contenedor de la plaza lleva días sin vaciarse y hay basura alrededor.',
    createdBy: 'Antonio G.',
    status: 'resolved',
    likes: 17,
    watchers: Array.from({ length: 6 }, (_, i) => `watcher-${i + 1}`),
    comments: [
      {
        id: 'c4',
        author: 'Ayuntamiento de Almuñécar',
        text: 'Resuelto. Gracias por el aviso, hemos reforzado la recogida en la plaza.',
        date: '2026-07-08',
        isMunicipality: true,
        likes: 2,
      },
    ],
    history: [
      { status: 'submitted', date: '2026-07-05' },
      { status: 'open', date: '2026-07-06' },
      { status: 'in_progress', date: '2026-07-07' },
      { status: 'resolved', date: '2026-07-08', note: 'Zona limpiada' },
    ],
    resolution: {
      date: '2026-07-08',
      note: 'Contenedor vaciado y zona limpiada. Hemos reforzado la frecuencia de recogida en esta plaza.',
    },
    municipalityId: 'almunecar',
  },
  {
    id: 'inc-004',
    title: 'Banco roto en el parque del Majuelo',
    date: '2026-07-13',
    location: { address: 'Parque del Majuelo', lat: 36.7301, lng: -3.6936 },
    images: [],
    category: 'furniture',
    description: 'Un banco de madera tiene dos listones partidos. Puede ser peligroso para los niños.',
    createdBy: 'Carmen L.',
    status: 'submitted',
    likes: 4,
    watchers: ['watcher-1'],
    comments: [],
    history: [{ status: 'submitted', date: '2026-07-13' }],
    municipalityId: 'almunecar',
  },
  {
    id: 'inc-005',
    title: 'Setos sin podar tapan una señal de stop',
    date: '2026-07-01',
    location: { address: 'Rotonda de acceso a Salobreña', lat: 36.7429, lng: -3.5859 },
    images: [],
    category: 'green_areas',
    description: 'Los setos de la rotonda han crecido mucho y casi no se ve la señal de stop.',
    createdBy: 'Anónimo',
    status: 'declined',
    likes: 9,
    watchers: ['watcher-1', 'watcher-2'],
    comments: [],
    history: [
      { status: 'submitted', date: '2026-07-01' },
      { status: 'open', date: '2026-07-02' },
      { status: 'declined', date: '2026-07-04', note: 'No es competencia municipal' },
    ],
    resolution: {
      date: '2026-07-04',
      note: 'Esta rotonda pertenece a la carretera nacional (Ministerio de Fomento). Hemos trasladado el aviso al organismo competente.',
    },
    municipalityId: 'salobrena',
  },
  {
    id: 'inc-006',
    title: 'Pintada en la fachada del mercado municipal',
    date: '2026-07-10',
    location: { address: 'Mercado Municipal de Motril', lat: 36.7495, lng: -3.5197 },
    images: [],
    category: 'other',
    description: 'Han hecho una pintada grande en la pared lateral del mercado municipal.',
    createdBy: 'Vecino del centro',
    status: 'open',
    likes: 6,
    watchers: Array.from({ length: 4 }, (_, i) => `watcher-${i + 1}`),
    comments: [],
    history: [
      { status: 'submitted', date: '2026-07-10' },
      { status: 'open', date: '2026-07-11' },
    ],
    municipalityId: 'motril',
  },
];

export const MOCK_INCIDENTS: Incident[] = RAW_INCIDENTS.map(withPriorityScore);
