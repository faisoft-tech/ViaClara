import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useT } from '@/i18n/useT';
import { Colors, Font, FontFamily, Radius, Shadow, Spacing } from '@/theme/tokens';

// Settings §6: the demo has no real legal documents to serve, so each row
// shows a clear notice instead of simulating a PDF that doesn't exist.
export default function PrivacyScreen() {
  const t = useT();
  const [open, setOpen] = useState<'terms' | 'policy' | null>(null);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: t('privacyTitle') }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Pressable style={styles.row} onPress={() => setOpen(open === 'terms' ? null : 'terms')}>
            <Ionicons name="document-text-outline" size={18} color={Colors.primary} />
            <Text style={styles.rowLabel}>{t('privacyTerms')}</Text>
            <Ionicons
              name={open === 'terms' ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={Colors.textMuted}
            />
          </Pressable>
          {open === 'terms' && <Text style={styles.answer}>{t('privacyNotAvailable')}</Text>}
          <View style={styles.divider} />
          <Pressable style={styles.row} onPress={() => setOpen(open === 'policy' ? null : 'policy')}>
            <Ionicons name="shield-checkmark-outline" size={18} color={Colors.primary} />
            <Text style={styles.rowLabel}>{t('privacyPolicy')}</Text>
            <Ionicons
              name={open === 'policy' ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={Colors.textMuted}
            />
          </Pressable>
          {open === 'policy' && <Text style={styles.answer}>{t('privacyNotAvailable')}</Text>}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.lg },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, paddingHorizontal: Spacing.lg, ...Shadow.card },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md, minHeight: 56 },
  rowLabel: { fontSize: Font.body, color: Colors.text, fontFamily: FontFamily.medium, flex: 1 },
  answer: {
    fontSize: Font.small,
    fontFamily: FontFamily.regular,
    color: Colors.textMuted,
    lineHeight: 19,
    paddingBottom: Spacing.md,
  },
  divider: { height: 1, backgroundColor: Colors.border },
});
