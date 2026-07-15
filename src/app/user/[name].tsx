import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { MUNICIPALITIES } from '@/data/incidents';
import { useStore } from '@/data/store';
import { Colors, Font, FontFamily, Radius, Shadow, Spacing } from '@/theme/tokens';
import { avatarColor, initials } from '@/utils/avatar';

// Settings §8: another user's public profile, with the same information as the
// current user's own profile (avatar, municipality, stats) but no editing,
// settings, or logout.
export default function PublicProfileScreen() {
  const { name: nameParam } = useLocalSearchParams<{ name: string }>();
  const name = decodeURIComponent(nameParam ?? '');
  const { incidents } = useStore();

  const reports = incidents.filter((i) => i.createdBy === name);
  const resolved = reports.filter((i) => i.status === 'resolved').length;
  const likes = reports.reduce((sum, i) => sum + i.likes, 0);
  const municipalityId = reports[0]?.municipalityId;
  const municipality = MUNICIPALITIES.find((m) => m.id === municipalityId);

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

        <View style={styles.statsRow}>
          <StatCard num={reports.length} label="Avisos" />
          <StatCard num={resolved} label="Resueltos" />
          <StatCard num={likes} label="Me gusta" />
        </View>

        {reports.length === 0 && (
          <Text style={styles.empty}>Este vecino todavía no tiene avisos públicos.</Text>
        )}
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
  scroll: { padding: Spacing.lg, alignItems: 'stretch' },
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
