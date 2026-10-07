import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { useStatusLabel } from '@/i18n/labels';
import { Font, FontFamily, IncidentStatus, Radius, STATUS_CONFIG } from '@/theme/tokens';

export function StatusBadge({ status, size = 'md' }: { status: IncidentStatus; size?: 'sm' | 'md' }) {
  const statusLabel = useStatusLabel();
  const s = STATUS_CONFIG[status];
  const small = size === 'sm';
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: s.color },
        small && { paddingVertical: 3, paddingHorizontal: 8 },
      ]}>
      <Ionicons name={s.icon as any} size={small ? 13 : 15} color="#fff" />
      <Text style={[styles.text, { fontSize: small ? 12 : Font.small }]}>{statusLabel(status)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: Radius.pill,
  },
  text: { color: '#fff', fontFamily: FontFamily.labelSemibold, letterSpacing: 0.2 },
});
