import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Incident, IncidentStatus } from '../types/incident';
import { MOCK_INCIDENTS } from '../data/mockIncidents';
import { MUNICIPALITIES } from '../data/municipalities';
import { computePriorityScore } from '../data/priority';

// In-memory mock store for the admin app (RF-010). No backend yet — mirrors
// the mobile app's StoreProvider pattern (src/data/store.tsx) but written
// idiomatically for this new React web app, with the target English data
// model from DOCUMENTO_VIACLARA.md §9.2. State resets on page reload.

type IncidentStoreValue = {
  incidents: Incident[];
  municipalityId: string;
  setMunicipalityId: (id: string) => void;
  setStatus: (id: string, status: IncidentStatus, note?: string) => void;
  deleteIncident: (id: string) => void;
  getIncident: (id: string) => Incident | undefined;
};

const IncidentStoreContext = createContext<IncidentStoreValue | null>(null);

export function IncidentStoreProvider({ children }: { children: ReactNode }) {
  const [incidents, setIncidents] = useState<Incident[]>(MOCK_INCIDENTS);
  const [municipalityId, setMunicipalityId] = useState<string>(MUNICIPALITIES[0].id);

  const value = useMemo<IncidentStoreValue>(
    () => ({
      incidents,
      municipalityId,
      setMunicipalityId,
      setStatus: (id, status, note) =>
        setIncidents((prev) =>
          prev.map((incident) => {
            if (incident.id !== id) return incident;
            const now = new Date().toISOString().slice(0, 10);
            const updated: Incident = {
              ...incident,
              status,
              history: [...incident.history, { status, date: now, note }],
            };
            if (status === 'resolved' || status === 'declined') {
              updated.resolution = { date: now, note: note ?? '' };
            }
            updated.priorityScore = computePriorityScore(updated);
            return updated;
          }),
        ),
      deleteIncident: (id) => setIncidents((prev) => prev.filter((incident) => incident.id !== id)),
      getIncident: (id) => incidents.find((incident) => incident.id === id),
    }),
    [incidents, municipalityId],
  );

  return <IncidentStoreContext.Provider value={value}>{children}</IncidentStoreContext.Provider>;
}

export function useIncidentStore() {
  const ctx = useContext(IncidentStoreContext);
  if (!ctx) throw new Error('useIncidentStore must be used within an IncidentStoreProvider');
  return ctx;
}
