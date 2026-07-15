import { IncidentCategory, IncidentStatus } from '@/theme/tokens';

export type Comment = {
  id: string;
  author: string;
  text: string;
  date: string;
  isMunicipality?: boolean;
  // RF: comment likes — global counter + current user's local like state.
  likes: number;
  likedByMe?: boolean;
};

export type HistoryEntry = {
  status: IncidentStatus;
  date: string;
  note?: string;
};

// RF-013 / CU-004: citizen verification of an incident's closure.
export type Verification = {
  result: 'verified' | 'not_resolved';
  date: string;
};

export type Incident = {
  id: string;
  title: string;
  category: IncidentCategory;
  status: IncidentStatus;
  description: string;
  address: string;
  // Approximate coordinates within Almuñécar (for the map).
  lat: number;
  lng: number;
  date: string;
  // RF-017 / CU-007: real timestamp (ms since epoch) so "My reports" can be
  // sorted reliably by descending date, since `date` is just a display string
  // ("2 days ago") and can't be used for sorting.
  createdAt: number;
  createdBy: string;
  likes: number;
  comments: Comment[];
  history: HistoryEntry[];
  // Local demo state
  liked: boolean;
  watching: boolean;
  isMine: boolean;
  resolution?: { date: string; note: string };
  // RF-014: every incident belongs to a municipality (tenant).
  municipalityId: string;
  // RF-015: global watcher count (distinct from the current user's local `watching` boolean).
  watchersCount: number;
  // RF-013: author's response after the operator closes the incident.
  verification?: Verification;
};

export type Municipality = {
  id: string;
  name: string;
  province: string;
  center: { lat: number; lng: number };
};

// RF-014: list of available municipalities (tenants) for the Profile selector.
export const MUNICIPALITIES: Municipality[] = [
  { id: 'almunecar', name: 'Almuñécar', province: 'Granada', center: { lat: 36.7339, lng: -3.6907 } },
  { id: 'salobrena', name: 'Salobreña', province: 'Granada', center: { lat: 36.7429, lng: -3.5859 } },
  { id: 'motril', name: 'Motril', province: 'Granada', center: { lat: 36.7495, lng: -3.5197 } },
];

// RF-015 / RF-018: incident priority score.
// priorityScore = (likes·1 + watchersCount·1.5 + comments.length·2) × tierMultiplier(createdBy, municipality)
export function getPriorityScore(inc: Incident, tierMultiplier: number = 1): number {
  const base = inc.likes * 1 + inc.watchersCount * 1.5 + inc.comments.length * 2;
  return base * tierMultiplier;
}

export type Tier = 'bronze' | 'silver' | 'gold';

// RF-018 / CU-008: point-based tier ranking. Proposed thresholds (§10 rule 13), to be
// calibrated with real data. Demo simplification: fixed thresholds are applied over
// `points` instead of percentiles relative to the municipality (that requires comparing
// against every citizen's points in the municipality, which only the real backend can
// compute from aggregated data).
export function getTier(points: number): Tier {
  if (points >= 200) return 'gold';
  if (points >= 50) return 'silver';
  return 'bronze';
}

export function getTierMultiplier(tier: Tier): number {
  return { bronze: 1, silver: 1.25, gold: 1.5 }[tier];
}

export const TIER_LABELS: Record<Tier, string> = {
  bronze: 'Bronce',
  silver: 'Plata',
  gold: 'Oro',
};

// RF-017: used only to compute `createdAt` for the sample data, kept roughly
// consistent with each entry's `date` display text ("X days/hours ago").
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export const INCIDENTS: Incident[] = [
  {
    id: 'inc-001',
    title: 'Farola fundida en el Paseo del Altillo',
    category: 'lighting',
    status: 'in_progress',
    description:
      'La farola lleva tres noches apagada. La zona del paseo queda muy oscura y da inseguridad al pasear.',
    address: 'Paseo del Altillo, junto al banco azul',
    lat: 36.7361,
    lng: -3.6884,
    date: 'hace 2 días',
    createdAt: Date.now() - 2 * DAY_MS,
    createdBy: 'María J.',
    likes: 23,
    liked: true,
    watching: true,
    isMine: false,
    municipalityId: 'almunecar',
    watchersCount: 12,
    comments: [
      {
        id: 'c1',
        author: 'Pedro R.',
        text: 'Confirmo, ayer pasé por allí y sigue apagada.',
        date: 'hace 1 día',
        likes: 3,
      },
      {
        id: 'c2',
        author: 'Ayuntamiento de Almuñécar',
        text: 'Aviso asignado a la brigada de mantenimiento. Lo revisamos esta semana.',
        date: 'hace 20 horas',
        isMunicipality: true,
        likes: 5,
      },
    ],
    history: [
      { status: 'submitted', date: 'hace 2 días' },
      { status: 'open', date: 'hace 1 día' },
      { status: 'in_progress', date: 'hace 20 horas', note: 'Asignado a brigada de mantenimiento' },
    ],
  },
  {
    id: 'inc-002',
    title: 'Bache grande en la Avenida de Andalucía',
    category: 'road',
    status: 'open',
    description:
      'Bache profundo cerca del paso de peatones. Varios coches han dado un golpe fuerte.',
    address: 'Avenida de Andalucía, 45',
    lat: 36.7312,
    lng: -3.6921,
    date: 'hace 4 días',
    createdAt: Date.now() - 4 * DAY_MS,
    createdBy: 'Anónimo',
    likes: 41,
    liked: false,
    watching: false,
    isMine: false,
    municipalityId: 'almunecar',
    watchersCount: 18,
    comments: [
      {
        id: 'c3',
        author: 'Lucía M.',
        text: 'A mí casi me revienta una rueda. Urge arreglarlo.',
        date: 'hace 3 días',
        likes: 7,
      },
    ],
    history: [
      { status: 'submitted', date: 'hace 4 días' },
      { status: 'open', date: 'hace 3 días', note: 'Validado, pendiente de asignar' },
    ],
  },
  {
    id: 'inc-003',
    title: 'Contenedor desbordado en la Plaza Mayor',
    category: 'cleaning',
    status: 'resolved',
    description:
      'El contenedor de la plaza lleva días sin vaciarse y hay basura alrededor.',
    address: 'Plaza Mayor',
    lat: 36.7345,
    lng: -3.6899,
    date: 'hace 8 días',
    createdAt: Date.now() - 8 * DAY_MS,
    createdBy: 'Antonio G.',
    likes: 17,
    liked: true,
    watching: false,
    isMine: true,
    municipalityId: 'almunecar',
    watchersCount: 6,
    resolution: {
      date: 'hace 5 días',
      note: 'Contenedor vaciado y zona limpiada. Hemos reforzado la frecuencia de recogida en esta plaza.',
    },
    comments: [
      {
        id: 'c4',
        author: 'Ayuntamiento de Almuñécar',
        text: 'Resuelto. Gracias por el aviso, hemos reforzado la recogida en la plaza.',
        date: 'hace 5 días',
        isMunicipality: true,
        likes: 2,
      },
    ],
    history: [
      { status: 'submitted', date: 'hace 8 días' },
      { status: 'open', date: 'hace 7 días' },
      { status: 'in_progress', date: 'hace 6 días' },
      { status: 'resolved', date: 'hace 5 días', note: 'Zona limpiada' },
    ],
  },
  {
    id: 'inc-004',
    title: 'Banco roto en el parque del Majuelo',
    category: 'furniture',
    status: 'submitted',
    description:
      'Un banco de madera tiene dos listones partidos. Puede ser peligroso para los niños.',
    address: 'Parque del Majuelo',
    lat: 36.7301,
    lng: -3.6936,
    date: 'hace 6 horas',
    createdAt: Date.now() - 6 * HOUR_MS,
    createdBy: 'Carmen L.',
    likes: 4,
    liked: false,
    watching: false,
    isMine: true,
    municipalityId: 'almunecar',
    watchersCount: 1,
    comments: [],
    history: [{ status: 'submitted', date: 'hace 6 horas' }],
  },
  {
    id: 'inc-005',
    title: 'Setos sin podar tapan una señal de stop',
    category: 'green_areas',
    status: 'declined',
    description:
      'Los setos de la rotonda han crecido mucho y casi no se ve la señal de stop.',
    address: 'Rotonda de la N-340',
    lat: 36.7388,
    lng: -3.6952,
    date: 'hace 12 días',
    createdAt: Date.now() - 12 * DAY_MS,
    createdBy: 'Anónimo',
    likes: 9,
    liked: false,
    watching: false,
    isMine: false,
    municipalityId: 'almunecar',
    watchersCount: 2,
    resolution: {
      date: 'hace 9 días',
      note: 'Esta rotonda pertenece a la carretera nacional (Ministerio de Fomento). Hemos trasladado el aviso al organismo competente.',
    },
    comments: [],
    history: [
      { status: 'submitted', date: 'hace 12 días' },
      { status: 'open', date: 'hace 11 días' },
      { status: 'declined', date: 'hace 9 días', note: 'No es competencia municipal' },
    ],
  },
  {
    id: 'inc-006',
    title: 'Pintada en la fachada del mercado',
    category: 'other',
    status: 'open',
    description: 'Han hecho una pintada grande en la pared lateral del mercado municipal.',
    address: 'Mercado Municipal',
    lat: 36.7333,
    lng: -3.6912,
    date: 'hace 3 días',
    createdAt: Date.now() - 3 * DAY_MS,
    createdBy: 'Vecino del centro',
    likes: 6,
    liked: false,
    watching: true,
    isMine: false,
    municipalityId: 'almunecar',
    watchersCount: 4,
    comments: [],
    history: [
      { status: 'submitted', date: 'hace 3 días' },
      { status: 'open', date: 'hace 2 días' },
    ],
  },
  {
    id: 'inc-007',
    title: 'Papelera volcada en el Paseo Marítimo',
    category: 'furniture',
    status: 'resolved',
    description: 'Una papelera se ha caído y nadie la ha vuelto a colocar.',
    address: 'Paseo Marítimo, Salobreña',
    lat: 36.7429,
    lng: -3.5859,
    date: 'hace 10 días',
    createdAt: Date.now() - 10 * DAY_MS,
    createdBy: 'Rosa P.',
    likes: 5,
    liked: false,
    watching: false,
    isMine: true,
    municipalityId: 'salobrena',
    watchersCount: 2,
    resolution: { date: 'hace 6 días', note: 'Papelera repuesta.' },
    comments: [],
    history: [
      { status: 'submitted', date: 'hace 10 días' },
      { status: 'open', date: 'hace 9 días' },
      { status: 'in_progress', date: 'hace 7 días' },
      { status: 'resolved', date: 'hace 6 días' },
    ],
  },
];

export function getIncident(id: string): Incident | undefined {
  return INCIDENTS.find((i) => i.id === id);
}
