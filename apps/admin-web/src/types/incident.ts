// Data model per DOCUMENTO_VIACLARA.md §9.2 — English field names (target model),
// unlike the mobile app prototype (src/data/incidencias.ts), which still uses
// Spanish field names pending the future backend rename (RF-009).

export type IncidentCategory =
  | 'lighting'
  | 'road'
  | 'cleaning'
  | 'furniture'
  | 'green_areas'
  | 'other';

export type IncidentStatus = 'submitted' | 'open' | 'in_progress' | 'resolved' | 'declined';

export type UserRole = 'citizen' | 'operator' | 'administrator';

export type User = {
  id: string;
  name: string;
  phone: string;
  points: number;
  municipality: string;
  role: UserRole;
};

export type Comment = {
  id: string;
  author: string;
  text: string;
  date: string;
  isMunicipality?: boolean;
  likes: number;
};

export type HistoryEntry = {
  status: IncidentStatus;
  date: string;
  note?: string;
};

export type Verification = {
  result: 'verified' | 'not_resolved';
  date: string;
};

export type Resolution = {
  date: string;
  note: string;
};

export type Location = {
  address: string;
  lat: number;
  lng: number;
};

export type Incident = {
  id: string;
  title: string;
  date: string;
  location: Location;
  images: string[];
  category: IncidentCategory;
  description: string;
  createdBy: string;
  status: IncidentStatus;
  comments: Comment[];
  likes: number;
  watchers: string[];
  history: HistoryEntry[];
  resolution?: Resolution;
  verification?: Verification;
  municipalityId: string;
  priorityScore: number;
};

export type Municipality = {
  id: string;
  name: string;
  province: string;
  center: { lat: number; lng: number };
};

export const INCIDENT_CATEGORY_LABELS: Record<IncidentCategory, string> = {
  lighting: 'Alumbrado',
  road: 'Calzada',
  cleaning: 'Limpieza',
  furniture: 'Mobiliario urbano',
  green_areas: 'Zonas verdes',
  other: 'Otros',
};

export const INCIDENT_STATUS_LABELS: Record<IncidentStatus, string> = {
  submitted: 'Registrada',
  open: 'Abierta',
  in_progress: 'En curso',
  resolved: 'Resuelta',
  declined: 'Declinada',
};

// RF-002 workflow order: submitted -> open -> in_progress -> resolved, with an
// optional branch to `declined` from `submitted` or `open` (§10 regla 3).
export const STATUS_WORKFLOW_ORDER: IncidentStatus[] = [
  'submitted',
  'open',
  'in_progress',
  'resolved',
];
