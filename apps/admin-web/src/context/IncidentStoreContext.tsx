import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ApiError, apiFetch } from '../lib/api';
import type { Comment, HistoryEntry, Incident, IncidentStatus, Municipality, Resolution, Verification } from '../types/incident';
import { useAuth } from './AuthContext';

// Incident inbox backed by the API (apps/api). The list is refreshed
// periodically and whenever the tab regains focus, so changes made from the
// mobile app show up without reloading.

const POLL_INTERVAL_MS = 30_000;

type ApiIncident = Omit<Incident, 'location' | 'authorName' | 'photos'> & {
  photos?: string[];
  address: string;
  lat: number;
  lng: number;
  authorName?: string;
  comments?: Comment[];
};

function toIncident(api: ApiIncident): Incident {
  const { address, lat, lng, authorName, ...rest } = api;
  return {
    ...rest,
    location: { address, lat, lng },
    authorName: authorName ?? 'Ciudadano',
    history: (api.history ?? []) as HistoryEntry[],
    photos: api.photos ?? [],
    resolution: api.resolution as Resolution | undefined,
    verification: api.verification as Verification | undefined,
    commentsCount: api.commentsCount ?? api.comments?.length ?? 0,
  };
}

type IncidentStoreValue = {
  municipalities: Municipality[];
  municipalityId: string;
  setMunicipalityId: (id: string) => void;
  incidents: Incident[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
  getIncident: (id: string) => Incident | undefined;
  loadIncident: (id: string) => Promise<Incident | null>;
  setStatus: (id: string, status: IncidentStatus, note?: string) => Promise<void>;
  deleteIncident: (id: string) => Promise<void>;
};

const IncidentStoreContext = createContext<IncidentStoreValue | null>(null);

export function IncidentStoreProvider({ children }: { children: ReactNode }) {
  const { user, getAccessToken, logout } = useAuth();
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [municipalityId, setMunicipalityId] = useState<string>('');
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [details, setDetails] = useState<Record<string, Incident>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const municipalityRef = useRef(municipalityId);
  municipalityRef.current = municipalityId;

  const request = useCallback(
    async <T,>(path: string, init?: { method?: string; body?: unknown }) => {
      try {
        return await apiFetch<T>(path, getAccessToken, init);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) logout();
        throw err;
      }
    },
    [getAccessToken, logout],
  );

  useEffect(() => {
    if (!user) return;
    request<Municipality[]>('/municipalities')
      .then((list) => {
        const sorted = [...list].sort((a, b) => a.name.localeCompare(b.name, 'es'));
        setMunicipalities(sorted);
        setMunicipalityId((current) => current || sorted[0]?.id || '');
      })
      .catch((err: Error) => setError(err.message));
  }, [user, request]);

  const refresh = useCallback(async () => {
    const id = municipalityRef.current;
    if (!id) return;
    setLoading(true);
    try {
      const list = await request<ApiIncident[]>(`/municipalities/${encodeURIComponent(id)}/incidents`);
      if (municipalityRef.current !== id) return;
      setIncidents(list.map(toIncident));
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    if (!user || !municipalityId) return;
    setIncidents([]);
    void refresh();
    const timer = window.setInterval(() => void refresh(), POLL_INTERVAL_MS);
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [user, municipalityId, refresh]);

  const storeIncident = useCallback((incident: Incident) => {
    setIncidents((prev) => prev.map((i) => (i.id === incident.id ? { ...i, ...incident } : i)));
    setDetails((prev) => ({ ...prev, [incident.id]: { ...prev[incident.id], ...incident } }));
  }, []);

  const value = useMemo<IncidentStoreValue>(
    () => ({
      municipalities,
      municipalityId,
      setMunicipalityId,
      incidents,
      loading,
      error,
      lastUpdated,
      refresh,
      getIncident: (id) => details[id] ?? incidents.find((i) => i.id === id),
      loadIncident: async (id) => {
        try {
          const incident = toIncident(await request<ApiIncident>(`/incidents/${encodeURIComponent(id)}`));
          storeIncident(incident);
          return incident;
        } catch (err) {
          if (err instanceof ApiError && err.status === 404) return null;
          throw err;
        }
      },
      setStatus: async (id, status, note) => {
        const updated = await request<ApiIncident>(`/incidents/${encodeURIComponent(id)}/status`, {
          method: 'PUT',
          body: { status, ...(note ? { note } : {}) },
        });
        storeIncident(toIncident(updated));
      },
      deleteIncident: async (id) => {
        await request(`/incidents/${encodeURIComponent(id)}`, { method: 'DELETE' });
        setIncidents((prev) => prev.filter((i) => i.id !== id));
        setDetails((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      },
    }),
    [municipalities, municipalityId, incidents, details, loading, error, lastUpdated, refresh, request, storeIncident],
  );

  return <IncidentStoreContext.Provider value={value}>{children}</IncidentStoreContext.Provider>;
}

export function useIncidentStore() {
  const ctx = useContext(IncidentStoreContext);
  if (!ctx) throw new Error('useIncidentStore must be used within an IncidentStoreProvider');
  return ctx;
}
