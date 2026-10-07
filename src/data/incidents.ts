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
  // Total comment count from the API; `comments` is only filled once the
  // incident detail has been loaded.
  commentsCount: number;
  comments: Comment[];
  history: HistoryEntry[];
  // Photo URLs (CloudFront for API incidents, local file URIs for local ones).
  photos: string[];
  // Per-user state, kept locally until citizen login is wired to the API.
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
// priorityScore = (likes·1 + watchersCount·1.5 + commentsCount·2) × tierMultiplier(createdBy, municipality)
export function getPriorityScore(inc: Incident, tierMultiplier: number = 1): number {
  const base = inc.likes * 1 + inc.watchersCount * 1.5 + inc.commentsCount * 2;
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

// RF-018: tier badge background/text color, shared between the user's own
// profile and public profiles.
export const TIER_BADGE_COLORS: Record<Tier, { bg: string; fg: string }> = {
  bronze: { bg: '#F5EBE3', fg: '#8A5A34' },
  silver: { bg: '#EEF1F4', fg: '#5B6672' },
  gold: { bg: '#FFF4E0', fg: '#B8790E' },
};

// RF-018: point thresholds per tier (consistent with getTier above).
export const TIER_THRESHOLDS = { bronze: 0, silver: 50, gold: 200 } as const;
export const NEXT_TIER: Partial<Record<Tier, Tier>> = { bronze: 'silver', silver: 'gold' };
