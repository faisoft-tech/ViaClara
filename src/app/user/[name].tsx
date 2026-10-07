import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  getPriorityScore,
  getTier,
  MUNICIPALITIES,
  NEXT_TIER,
  TIER_BADGE_COLORS,
  TIER_THRESHOLDS,
} from '@/data/incidents';
import { useStore } from '@/data/store';
import { useTierLabel } from '@/i18n/labels';
import { useT } from '@/i18n/useT';
import { Colors, Font, FontFamily, Radius, Shadow, Spacing } from '@/theme/tokens';
import { avatarColor, initials } from '@/utils/avatar';

// Settings §8: another user's public profile, with the same information as the
// current user's own profile (avatar, municipality, rank/points, stats) but no
// editing, settings, or logout.
export default function PublicProfileScreen() {
  const { name: nameParam } = useLocalSearchParams<{ name: string }>();
  const name = decodeURIComponent(nameParam ?? '');
  const t = useT();
  const tierLabel = useTierLabel();
  const { incidents } = useStore();

  const reports = incidents.filter((i) => i.createdBy === name);
  const resolved = reports.filter((i) => i.status === 'resolved').length;
  const likes = reports.reduce((sum, i) => sum + i.likes, 0);
  const municipalityId = reports[0]?.municipalityId;
  const municipality = MUNICIPALITIES.find((m) => m.id === municipalityId);

  // Settings §7: rank/points derived from this user's own reports (same formula
  // the app uses elsewhere), since there is no separate per-user points ledger
  // for other citizens in this single-device demo.
  const communityScore = reports.reduce((sum, i) => sum + getPriorityScore(i), 0);
  const tier = getTier(communityScore);
  const nextTier = NEXT_TIER[tier];
  const progress = nextTier
    ? Math.min(1, (communityScore - TIER_THRESHOLDS[tier]) / (TIER_THRESHOLDS[nextTier] - TIER_THRESHOLDS[tier]))
    : 1;
  const pointsToNext = nextTier ? Math.max(0, TIER_THRESHOLDS[nextTier] - communityScore) : 0;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: name }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <View style={[styles.avatar, { backgroundColor: avatarColor(name) }]}>
            <Text style={styles.avatarText}>{initials(name) || '?'}</Text>
          </View>
          <Text style={styles.name}>{name}</Text>
          {municipality && (
            <View style={styles.municipalityRow}>
              <Ionicons name="location" size={14} color={Colors.textMuted} />
              <Text style={styles.municipalityText}>{municipality.name}</Text>
            </View>
          )}
        </View>

        {/* Settings §7: same rank/points structure as the user's own profile */}
        <View style={styles.pointsCard}>
          <View style={styles.pointsHead}>
            <View>
              <Text style={styles.pointsLabel}>{t('pointsAccumulated')}</Text>
              <Text style={styles.pointsNum}>{Math.round(communityScore).toLocaleString('es-ES')}</Text>
            </View>
            <View style={[styles.tierBadge, { backgroundColor: TIER_BADGE_COLORS[tier].bg }]}>
              <Ionicons name="ribbon" size={14} color={TIER_BADGE_COLORS[tier].fg} />
              <Text style={[styles.tierBadgeText, { color: TIER_BADGE_COLORS[tier].fg }]}>
                {t('tierLevel')} {tierLabel(tier)}
              </Text>
            </View>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.progressHint}>
            {nextTier
              ? t('pointsToNext').replace('{n}', String(Math.round(pointsToNext))).replace('{tier}', tierLabel(nextTier))
              : t('maxTierReached')}
          </Text>
        </View>

        <View style={styles.statsRow}>
          <StatCard num={reports.length} label={t('statReports')} />
          <StatCard num={resolved} label={t('statResolved')} />
          <StatCard num={likes} label={t('statLikes')} />
        </View>

        {reports.length === 0 && <Text style={styles.empty}>{t('publicProfileEmptyText')}</Text>}
      </ScrollView>
    </View>
  );
}

function StatCard({ num, label }: { num: number; label: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statNum}>{num}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.lg, alignItems: 'stretch', gap: Spacing.sm },
  hero: { alignItems: 'center', paddingVertical: Spacing.xl, gap: 4 },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  avatarText: { color: '#fff', fontSize: Font.title, fontFamily: FontFamily.bold },
  name: { fontSize: Font.title, fontFamily: FontFamily.extrabold, color: Colors.text },
  municipalityRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  municipalityText: { fontSize: Font.small, fontFamily: FontFamily.regular, color: Colors.textMuted },
  pointsCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    ...Shadow.card,
  },
  pointsHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  pointsLabel: { fontSize: Font.small, fontFamily: FontFamily.regular, color: Colors.textMuted },
  pointsNum: { fontSize: Font.hero, fontFamily: FontFamily.extrabold, color: Colors.text },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    marginTop: Spacing.xs,
  },
  tierBadgeText: { fontFamily: FontFamily.labelBold, fontSize: Font.small },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: Colors.primary },
  progressHint: { fontSize: Font.small, fontFamily: FontFamily.regular, color: Colors.textMuted },
  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    ...Shadow.card,
  },
  statNum: { fontSize: Font.title, fontFamily: FontFamily.extrabold, color: Colors.text },
  statLabel: {
    fontSize: Font.small - 2,
    color: Colors.textMuted,
    fontFamily: FontFamily.labelSemibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  empty: {
    textAlign: 'center',
    color: Colors.textMuted,
    marginTop: Spacing.xl,
    fontSize: Font.body,
    fontFamily: FontFamily.regular,
  },
});
