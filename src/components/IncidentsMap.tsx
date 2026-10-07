import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Incident, MUNICIPALITIES } from '@/data/incidents';
import { useStore } from '@/data/store';
import { useStatusLabel } from '@/i18n/labels';
import { useT } from '@/i18n/useT';
import { Colors, STATUS_CONFIG, Font, FontFamily, Radius, Spacing } from '@/theme/tokens';

import { MapFrame } from './map/MapFrame';
import type { MapPoint } from './map/mapHtml';

// Interactive map (MapLibre + OpenFreeMap positron basemap) with one pin per
// incident, colored by status. Tapping a pin opens a popup with the photo and
// a button to the incident detail.
export function IncidentsMap({ data }: { data: Incident[] }) {
  const router = useRouter();
  const t = useT();
  const statusLabel = useStatusLabel();
  const { municipalityId } = useStore();
  const municipality = MUNICIPALITIES.find((m) => m.id === municipalityId) ?? MUNICIPALITIES[0];

  const points = useMemo<MapPoint[]>(
    () =>
      data.map((inc) => ({
        id: inc.id,
        lat: inc.lat,
        lng: inc.lng,
        title: inc.title,
        address: inc.address,
        color: STATUS_CONFIG[inc.status].color,
        statusLabel: statusLabel(inc.status),
        // Local file URIs can't be loaded from inside the map page.
        photo: inc.photos.find((uri) => uri.startsWith('https://')),
      })),
    [data, statusLabel],
  );

  const onOpen = useCallback((id: string) => router.push(`/incident/${id}`), [router]);

  return (
    <View style={styles.map}>
      <MapFrame points={points} center={municipality.center} openLabel={t('mapOpenReport')} onOpen={onOpen} />
      <View style={styles.legendBadge} pointerEvents="none">
        <Ionicons name="map" size={14} color={Colors.primary} />
        <Text style={styles.legendText}>{t('mapLegend').replace('{n}', String(data.length))}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    height: 460,
    backgroundColor: '#F2F3F0',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
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
  },
  legendText: { fontSize: Font.small, fontFamily: FontFamily.semibold, color: Colors.text },
});
