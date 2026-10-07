import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { NotificationType, useStore } from '@/data/store';
import { useT } from '@/i18n/useT';
import { Colors, Font, FontFamily, Radius, Spacing } from '@/theme/tokens';

const ICON_BY_TYPE: Record<NotificationType, string> = {
  like: 'heart',
  comment: 'chatbubble',
  follower: 'notifications',
  status_change: 'swap-horizontal',
  reactivation: 'refresh',
  confirm_closure: 'help-circle',
};

// Settings §7: notification panel screen, reached from the bell on Profile.
export default function NotificationsScreen() {
  const router = useRouter();
  const t = useT();
  const { notifications, markNotificationRead, markAllNotificationsRead } = useStore();

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: t('notifPanelTitle'),
          // Profile mockup: the profile menu only has one "Notificaciones" entry
          // (the panel); preferences are one tap away from here instead.
          headerRight: () => (
            <Pressable onPress={() => router.push('/settings/notifications')} hitSlop={8}>
              <Ionicons name="options-outline" size={22} color={Colors.primary} />
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        {notifications.length > 0 && (
          <Pressable onPress={markAllNotificationsRead} hitSlop={8} style={styles.markAll}>
            <Text style={styles.markAllText}>{t('notifPanelMarkAll')}</Text>
          </Pressable>
        )}
        {notifications.length === 0 && <Text style={styles.empty}>{t('notifPanelEmpty')}</Text>}
        {notifications.map((n) => (
          <Pressable
            key={n.id}
            style={[styles.row, !n.read && styles.rowUnread]}
            onPress={() => {
              markNotificationRead(n.id);
              if (n.incidentId) router.push(`/incident/${n.incidentId}`);
            }}>
            <View style={styles.icon}>
              <Ionicons name={ICON_BY_TYPE[n.type] as any} size={18} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.text}>{n.text}</Text>
              <Text style={styles.date}>{n.date}</Text>
            </View>
            {!n.read && <View style={styles.dot} />}
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.lg, gap: Spacing.sm },
  markAll: { alignSelf: 'flex-end', marginBottom: Spacing.sm },
  markAllText: { color: Colors.primary, fontFamily: FontFamily.medium, fontSize: Font.small },
  empty: {
    textAlign: 'center',
    color: Colors.textMuted,
    marginTop: Spacing.xxl,
    fontSize: Font.body,
    fontFamily: FontFamily.regular,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  rowUnread: { borderWidth: 1, borderColor: Colors.primarySoft, backgroundColor: Colors.primarySoft },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { fontSize: Font.body, fontFamily: FontFamily.medium, color: Colors.text },
  date: { fontSize: Font.small, fontFamily: FontFamily.regular, color: Colors.textMuted, marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.danger },
});
