import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Incident } from '@/data/incidents';
import { CATEGORY_CONFIG, Colors, Font, FontFamily, Radius, Shadow, Spacing } from '@/theme/tokens';
import { StatusBadge } from './StatusBadge';

export function IncidentCard({
  inc,
  metaSuffix,
  compact = false,
}: {
  inc: Incident;
  // Optional suffix after the address, e.g. the real distance ("320 m").
  metaSuffix?: string;
  // Compact variant used in "My reports" (no "like" row), additive and
  // optional so it doesn't affect existing usage in Home (defaults to `false`).
  compact?: boolean;
}) {
  const cat = CATEGORY_CONFIG[inc.category];

  if (compact) {
    return (
      <Link href={`/incident/${inc.id}`} asChild>
        <Pressable style={styles.cardCompact}>
          <View style={[styles.thumbCompact, { backgroundColor: cat.color + '22' }]}>
            <Ionicons name={cat.icon as any} size={22} color={cat.color} />
          </View>

          <View style={styles.bodyCompact}>
            <View style={styles.headerCompact}>
              <Text style={styles.titleCompact} numberOfLines={1}>
                {inc.title}
              </Text>
              <StatusBadge status={inc.status} size="sm" />
            </View>
            <Text style={styles.metaCompact} numberOfLines={1}>
              {inc.address} · {inc.date}
              {metaSuffix ? ` · ${metaSuffix}` : ''}
            </Text>
          </View>
        </Pressable>
      </Link>
    );
  }

  return (
    <Link href={`/incident/${inc.id}`} asChild>
      <Pressable style={styles.card}>
        {/* "Photo" thumbnail represented by the category */}
        <View style={[styles.thumb, { backgroundColor: cat.color + '22' }]}>
          <Ionicons name={cat.icon as any} size={24} color={cat.color} />
        </View>

        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={2}>
            {inc.title}
          </Text>
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={14} color={Colors.textMuted} />
            <Text style={styles.meta} numberOfLines={1}>
              {inc.address}
              {metaSuffix ? ` · ${metaSuffix}` : ''}
            </Text>
          </View>

          <View style={styles.footer}>
            <StatusBadge status={inc.status} size="sm" />
            <View style={styles.likes}>
              <Ionicons
                name={inc.liked ? 'heart' : 'heart-outline'}
                size={16}
                color={inc.liked ? Colors.danger : Colors.textMuted}
              />
              <Text style={styles.likesText}>{inc.likes}</Text>
            </View>
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
    ...Shadow.card,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, justifyContent: 'space-between' },
  title: { fontSize: Font.bodyLg, fontFamily: FontFamily.semibold, color: Colors.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  meta: { fontSize: Font.small, color: Colors.textMuted, flex: 1, fontFamily: FontFamily.regular },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  likes: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  likesText: { fontSize: Font.small, color: Colors.textMuted, fontFamily: FontFamily.semibold },
  // Compact variant (e.g. "My reports"): smaller icon, title+badge on one row
  // and address+date below, without the "like" row.
  cardCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
    ...Shadow.card,
  },
  thumbCompact: {
    width: 46,
    height: 46,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bodyCompact: { flex: 1, gap: 4 },
  headerCompact: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  titleCompact: { flex: 1, fontSize: Font.body, fontFamily: FontFamily.semibold, color: Colors.text },
  metaCompact: { fontSize: Font.small, color: Colors.textMuted, fontFamily: FontFamily.regular },
});
