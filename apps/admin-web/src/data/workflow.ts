import type { IncidentStatus } from '../types/incident';

// §10 regla 2 / regla 3: an incident must pass through `in_progress` before
// `resolved`, and can only branch to `declined` from `submitted` or `open`.
// `resolved` and `declined` are terminal in this scaffold.
export function nextStatusOptions(current: IncidentStatus): IncidentStatus[] {
  switch (current) {
    case 'submitted':
      return ['open', 'declined'];
    case 'open':
      return ['in_progress', 'declined'];
    case 'in_progress':
      return ['resolved'];
    case 'resolved':
    case 'declined':
      return [];
  }
}
