import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Incident } from '@/data/incidents';
import { Colors, STATUS_CONFIG, Font, FontFamily, Radius, Spacing } from '@/theme/tokens';

// Stylized (non-native) map for the demo: positions pins according to their
// coordinates, normalized to the bounds of the set. Works in Expo Go without
// native configuration. Replaced by react-native-maps in production.
export function IncidentsMap({ data }: { data: Incident[] }) {
  const router = useRouter();
  const lats = data.map((d) => d.lat);
  const lngs = data.map((d) => d.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const spanLat = maxLat - minLat || 1;
  const spanLng = maxLng - minLng || 1;

  return (
    <View style={styles.map}>
      {/* Decorative grid */}
      {[0.25, 0.5, 0.75].map((p) => (
        <View key={`h${p}`} style={[styles.gridH, { top: `${p * 100}%` }]} />
      ))}
      {[0.25, 0.5, 0.75].map((p) => (
        <View key={`v${p}`} style={[styles.gridV, { left: `${p * 100}%` }]} />
      ))}

      <View style={styles.legendBadge}>
        <Ionicons name="map" size={14} color={Colors.primary} />
        <Text style={styles.legendText}>Vista mapa · {data.length} avisos</Text>
      </View>

      {data.map((inc) => {
        const x = 8 + ((inc.lng - minLng) / spanLng) * 84;
        const y = 88 - ((inc.lat - minLat) / spanLat) * 76;
        return (
          <Pressable
            key={inc.id}
            onPress={() => router.push(`/incident/${inc.id}`)}
            style={[styles.pin, { left: `${x}%`, top: `${y}%` }]}
            hitSlop={8}>
            <View style={[styles.pinHead, { backgroundColor: STATUS_CONFIG[inc.status].color }]}>
              <Ionicons name={STATUS_CONFIG[inc.status].icon as any} size={14} color="#fff" />
            </View>
            <View style={[styles.pinTail, { borderTopColor: STATUS_CONFIG[inc.status].color }]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    height: 380,
    backgroundColor: '#E9F4F3',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  gridH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: '#FFFFFF55' },
  gridV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: '#FFFFFF55' },
  legendBadge: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: Radius.pill,
    zIndex: 5,
  },
  legendText: { fontSize: Font.small, fontFamily: FontFamily.semibold, color: Colors.text },
  pin: { position: 'absolute', alignItems: 'center', width: 34, marginLeft: -17 },
  pinHead: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  pinTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
});
