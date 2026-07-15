import type { IncidentStatus } from '../types/incident';
import { INCIDENT_STATUS_LABELS } from '../types/incident';

const STATUS_CLASS: Record<IncidentStatus, string> = {
  submitted: 'status-badge status-badge--submitted',
  open: 'status-badge status-badge--open',
  in_progress: 'status-badge status-badge--in-progress',
  resolved: 'status-badge status-badge--resolved',
  declined: 'status-badge status-badge--declined',
};

export function StatusBadge({ status }: { status: IncidentStatus }) {
  return <span className={STATUS_CLASS[status]}>{INCIDENT_STATUS_LABELS[status]}</span>;
}
