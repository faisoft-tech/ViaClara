import { Stack } from 'expo-router';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { NotificationPrefs, useStore } from '@/data/store';
import { TranslationKey } from '@/i18n/translations';
import { useT } from '@/i18n/useT';
import { Colors, Font, FontFamily, Radius, Spacing } from '@/theme/tokens';

const PREF_KEYS: { key: keyof NotificationPrefs; labelKey: TranslationKey }[] = [
  { key: 'likes', labelKey: 'notifPrefLikes' },
  { key: 'comments', labelKey: 'notifPrefComments' },
  { key: 'followers', labelKey: 'notifPrefFollowers' },
  { key: 'statusChanges', labelKey: 'notifPrefStatusChanges' },
  { key: 'reactivation', labelKey: 'notifPrefReactivation' },
  { key: 'closureConfirmation', labelKey: 'notifPrefConfirmation' },
];

// Settings §6: dedicated notification preferences screen.
export default function NotificationSettingsScreen() {
  const t = useT();
  const { notificationPrefs, setNotificationPref } = useStore();

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: t('notifPrefsTitle') }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          {PREF_KEYS.map(({ key, labelKey }, i) => (
            <View key={key}>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>{t(labelKey)}</Text>
                <Switch
                  value={notificationPrefs[key]}
                  onValueChange={(v) => setNotificationPref(key, v)}
                  trackColor={{ true: Colors.primary }}
                />
              </View>
              {i < PREF_KEYS.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.lg },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, paddingHorizontal: Spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.md, minHeight: 56 },
  rowLabel: { fontSize: Font.body, color: Colors.text, fontFamily: FontFamily.medium, flex: 1, marginRight: Spacing.md },
  divider: { height: 1, backgroundColor: Colors.border },
});
