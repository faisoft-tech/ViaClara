import type { Municipality } from '../types/incident';

// RF-014: incidents are scoped by municipality (tenant). Mirrors the mobile
// app's municipality list (src/data/incidencias.ts) for demo consistency.
export const MUNICIPALITIES: Municipality[] = [
  { id: 'almunecar', name: 'Almuñécar', province: 'Granada', center: { lat: 36.7339, lng: -3.6907 } },
  { id: 'salobrena', name: 'Salobreña', province: 'Granada', center: { lat: 36.7429, lng: -3.5859 } },
  { id: 'motril', name: 'Motril', province: 'Granada', center: { lat: 36.7495, lng: -3.5197 } },
];

export function getMunicipality(id: string): Municipality | undefined {
  return MUNICIPALITIES.find((m) => m.id === id);
}
