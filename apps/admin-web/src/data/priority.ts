import type { Incident } from '../types/incident';

// §9.2 / §10 regla 10 / RF-015: priorityScore formula. The citizen-side
// `tierMultiplier` (Bronce/Plata/Oro, RF-018) lives in the mobile app's
// scope, so the admin app computes the base score with a neutral
// multiplier of 1 — the field is still denormalized on the incident record,
// per the DynamoDB note in §9.2, rather than recalculated on every read.
export function computePriorityScore(incident: Pick<Incident, 'likes' | 'watchers' | 'comments'>): number {
  return incident.likes * 1 + incident.watchers.length * 1.5 + incident.comments.length * 2;
}
