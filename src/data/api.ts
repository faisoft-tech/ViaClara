import type { IncidentCategory, IncidentStatus } from '@/theme/tokens';

import type { Comment, HistoryEntry, Incident, Verification } from './incidents';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

type ApiComment = Omit<Comment, 'date'> & { date: string };

export type ApiIncident = {
  id: string;
  title: string;
  category: IncidentCategory;
  status: IncidentStatus;
  description: string;
  address: string;
  lat: number;
  lng: number;
  municipalityId: string;
  createdBy: string;
  authorName?: string;
  createdAt: number;
  date: string;
  likes: number;
  watchersCount: number;
  commentsCount: number;
  history: HistoryEntry[];
  photos?: string[];
  resolution?: { date: string; note: string };
  verification?: Verification;
  comments?: ApiComment[];
};

async function get<T>(path: string): Promise<T | null> {
  const res = await fetch(`${API_URL}${path}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

export async function fetchMunicipalityIncidents(municipalityId: string): Promise<ApiIncident[]> {
  return (await get<ApiIncident[]>(`/municipalities/${encodeURIComponent(municipalityId)}/incidents`)) ?? [];
}

export function fetchIncident(id: string): Promise<ApiIncident | null> {
  return get<ApiIncident>(`/incidents/${encodeURIComponent(id)}`);
}

export function formatRelativeDate(iso: string, language: 'es' | 'en'): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const minutes = Math.floor((Date.now() - date.getTime()) / 60_000);
  const es = language === 'es';
  if (minutes < 1) return es ? 'ahora' : 'now';
  if (minutes < 60) return es ? `hace ${minutes} min` : `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return es ? `hace ${hours} h` : `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return es ? `hace ${days} ${days === 1 ? 'día' : 'días'}` : `${days} ${days === 1 ? 'day' : 'days'} ago`;
  return date.toLocaleDateString(es ? 'es-ES' : 'en-GB');
}

// Server data wins for everything shared; per-user flags (liked, watching,
// isMine) and already-loaded comments are carried over from the local copy.
export function toIncident(api: ApiIncident, language: 'es' | 'en', previous?: Incident): Incident {
  const fmt = (iso: string) => formatRelativeDate(iso, language);
  const comments = api.comments
    ? api.comments.map((c) => ({ ...c, date: fmt(c.date) }))
    : (previous?.comments ?? []);
  return {
    id: api.id,
    title: api.title,
    category: api.category,
    status: api.status,
    description: api.description,
    address: api.address,
    lat: Number(api.lat),
    lng: Number(api.lng),
    municipalityId: api.municipalityId,
    createdBy: api.authorName ?? previous?.createdBy ?? (language === 'es' ? 'Ciudadano' : 'Citizen'),
    createdAt: api.createdAt,
    date: fmt(api.date),
    likes: api.likes,
    watchersCount: api.watchersCount,
    commentsCount: api.commentsCount ?? comments.length,
    comments,
    history: (api.history ?? []).map((h) => ({ ...h, date: fmt(h.date) })),
    photos: api.photos ?? [],
    resolution: api.resolution ? { ...api.resolution, date: fmt(api.resolution.date) } : undefined,
    verification: api.verification
      ? { ...api.verification, date: fmt(api.verification.date) }
      : previous?.verification,
    liked: previous?.liked ?? false,
    watching: previous?.watching ?? false,
    isMine: previous?.isMine ?? false,
  };
}
