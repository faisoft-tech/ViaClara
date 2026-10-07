import { Tier } from '@/data/incidents';
import { IncidentCategory, IncidentStatus } from '@/theme/tokens';
import { TranslationKey } from './translations';
import { useT } from './useT';

const CATEGORY_KEY: Record<IncidentCategory, TranslationKey> = {
  lighting: 'categoryLighting',
  road: 'categoryRoad',
  cleaning: 'categoryCleaning',
  furniture: 'categoryFurniture',
  green_areas: 'categoryGreenAreas',
  other: 'categoryOther',
};

const STATUS_KEY: Record<IncidentStatus, TranslationKey> = {
  submitted: 'statusSubmitted',
  open: 'statusOpen',
  in_progress: 'statusInProgress',
  resolved: 'statusResolved',
  declined: 'statusDeclined',
};

const TIER_KEY: Record<Tier, TranslationKey> = {
  bronze: 'tierBronze',
  silver: 'tierSilver',
  gold: 'tierGold',
};

export function useCategoryLabel() {
  const t = useT();
  return (category: IncidentCategory) => t(CATEGORY_KEY[category]);
}

export function useStatusLabel() {
  const t = useT();
  return (status: IncidentStatus) => t(STATUS_KEY[status]);
}

export function useTierLabel() {
  const t = useT();
  return (tier: Tier) => t(TIER_KEY[tier]);
}
