import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IncidentCard } from '@/components/IncidentCard';
import { IncidentsMap } from '@/components/IncidentsMap';
import { Incident, MUNICIPALITIES } from '@/data/incidents';
import { useStore } from '@/data/store';
import { CATEGORY_CONFIG, IncidentCategory, Colors, Font, FontFamily, Radius, Shadow, Spacing } from '@/theme/tokens';

type CategoryFilter = 'all' | IncidentCategory;
type SortOrder = 'priority' | 'recent' | 'oldest';
type QuickFilter = 'all' | 'nearby' | 'watching';

// Approximate distance (not geodesic, good enough for sorting points within a municipality).
function distance(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  return Math.hypot(a.lat - b.lat, a.lng - b.lng);
}

// Real distance (Haversine formula) for display on the card, e.g. "320 m" / "1.2 km".
function metersBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const EARTH_RADIUS_M = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

function formatDistance(meters: number) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { incidents, municipalityId, setMunicipality, priorityScoreOf, unreadNotificationsCount } = useStore();
  // Settings §2: the map view replaces the old "Near you" section as the
  // default content of Home; the list is still available from the selector.
  const [view, setView] = useState<'list' | 'map'>('map');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('priority');
  const [municipalityPicker, setMunicipalityPicker] = useState(false);

  const municipality = MUNICIPALITIES.find((m) => m.id === municipalityId) ?? MUNICIPALITIES[0];

  const data = useMemo(() => {
    let list = incidents
      .filter((i) => i.municipalityId === municipalityId)
      .filter((i) => categoryFilter === 'all' || i.category === categoryFilter)
      .filter((i) => quickFilter !== 'watching' || i.watching);

    if (quickFilter === 'nearby') {
      list = [...list].sort(
        (a, b) => distance(a, municipality.center) - distance(b, municipality.center),
      );
    } else if (sortOrder === 'priority') {
      list = [...list].sort((a, b) => priorityScoreOf(b) - priorityScoreOf(a));
    } else if (sortOrder === 'recent') {
      list = [...list].sort((a, b) => b.createdAt - a.createdAt);
    } else if (sortOrder === 'oldest') {
      list = [...list].sort((a, b) => a.createdAt - b.createdAt);
    }
    return list;
  }, [incidents, municipalityId, categoryFilter, quickFilter, sortOrder, municipality, priorityScoreOf]);

  return (
    <View style={styles.container}>
      <View style={[styles.hero, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={styles.heroRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroGreeting}>Hola</Text>
            {/* Settings §2: the same access point lets you change the selected municipality */}
            <Pressable style={styles.heroLocRow} onPress={() => setMunicipalityPicker(true)} hitSlop={6}>
              <Ionicons name="location" size={16} color="#fff" />
              <Text style={styles.heroLoc}>{municipality.name}</Text>
              <Ionicons name="chevron-down" size={14} color="#fff" />
            </Pressable>
          </View>
          {/* Settings §2: profile access at the top; §7: unread notifications indicator */}
          <Pressable onPress={() => router.push('/profile')} hitSlop={6}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={20} color="#fff" />
              {unreadNotificationsCount > 0 && <View style={styles.avatarBadge} />}
            </View>
          </Pressable>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsRow}
        contentContainerStyle={styles.chipsContent}>
        <Chip label="Todos" active={quickFilter === 'all'} onPress={() => setQuickFilter('all')} />
        <Chip label="Cerca de mí" active={quickFilter === 'nearby'} onPress={() => setQuickFilter('nearby')} />
        <Chip label="Siguiendo" active={quickFilter === 'watching'} onPress={() => setQuickFilter('watching')} />
      </ScrollView>

      <View style={styles.segment}>
        <SegBtn label="Lista" icon="list" active={view === 'list'} onPress={() => setView('list')} />
        <SegBtn label="Mapa" icon="map" active={view === 'map'} onPress={() => setView('map')} />
      </View>

      {/* Settings §2: basic sort filters — Priority / Most recent / Oldest */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsRow}
        contentContainerStyle={styles.chipsContent}>
        <Chip
          label="Prioridad"
          icon="flame"
          active={sortOrder === 'priority'}
          onPress={() => setSortOrder('priority')}
        />
        <Chip
          label="Más recientes"
          icon="time"
          active={sortOrder === 'recent'}
          onPress={() => setSortOrder('recent')}
        />
        <Chip
          label="Más antiguas"
          icon="hourglass"
          active={sortOrder === 'oldest'}
          onPress={() => setSortOrder('oldest')}
        />
        <View style={styles.chipsDivider} />
        <Chip label="Todas" active={categoryFilter === 'all'} onPress={() => setCategoryFilter('all')} />
        {(Object.keys(CATEGORY_CONFIG) as IncidentCategory[]).map((c) => (
          <Chip
            key={c}
            label={CATEGORY_CONFIG[c].label}
            icon={CATEGORY_CONFIG[c].icon}
            color={CATEGORY_CONFIG[c].color}
            active={categoryFilter === c}
            onPress={() => setCategoryFilter(c)}
          />
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {view === 'map' && <IncidentsMap data={data} />}
        {view === 'list' &&
          data.map((inc: Incident) => (
            <View key={inc.id} style={{ marginBottom: Spacing.md }}>
              <IncidentCard
                inc={inc}
                metaSuffix={formatDistance(metersBetween({ lat: inc.lat, lng: inc.lng }, municipality.center))}
              />
            </View>
          ))}
        {view === 'list' && data.length === 0 && <Text style={styles.empty}>No hay avisos que coincidan.</Text>}
      </ScrollView>

      <Modal
        visible={municipalityPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setMunicipalityPicker(false)}>
        <Pressable style={styles.backdrop} onPress={() => setMunicipalityPicker(false)}>
          <Pressable style={styles.pickerSheet} onPress={() => {}}>
            <View style={styles.handle} />
            <Text style={styles.pickerTitle}>Elige tu municipio</Text>
            {MUNICIPALITIES.map((m) => (
              <Pressable
                key={m.id}
                style={styles.pickerRow}
                onPress={() => {
                  setMunicipality(m.id);
                  setMunicipalityPicker(false);
                }}>
                <Text style={styles.pickerRowLabel}>{m.name}, {m.province}</Text>
                {m.id === municipalityId && <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function SegBtn({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.segBtn, active && styles.segBtnActive]} onPress={onPress}>
      <Ionicons name={icon as any} size={18} color={active ? '#fff' : Colors.textMuted} />
      <Text style={[styles.segText, { color: active ? '#fff' : Colors.textMuted }]}>{label}</Text>
    </Pressable>
  );
}

function Chip({
  label,
  icon,
  color,
  active,
  onPress,
}: {
  label: string;
  icon?: string;
  color?: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      {icon && (
        <Ionicons name={icon as any} size={15} color={active ? '#fff' : color ?? Colors.textMuted} />
      )}
      <Text style={[styles.chipText, { color: active ? '#fff' : Colors.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  hero: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderBottomLeftRadius: Radius.xl,
    borderBottomRightRadius: Radius.xl,
  },
  heroRow: { flexDirection: 'row', alignItems: 'center' },
  heroGreeting: { fontSize: Font.small, fontFamily: FontFamily.regular, color: 'rgba(255,255,255,0.85)' },
  heroLocRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  heroLoc: { fontSize: Font.subtitle, fontFamily: FontFamily.semibold, color: '#fff' },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.8)',
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBadge: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.danger,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  segment: {
    flexDirection: 'row',
    gap: 4,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    padding: 4,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
  },
  segBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: Radius.pill,
  },
  segBtnActive: { backgroundColor: Colors.primary },
  segText: { fontFamily: FontFamily.semibold, fontSize: Font.body },
  chipsRow: { maxHeight: 56, marginTop: Spacing.sm },
  chipsContent: { paddingHorizontal: Spacing.lg, gap: Spacing.sm, alignItems: 'center' },
  chipsDivider: { width: 1, height: 24, backgroundColor: Colors.border, marginHorizontal: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    height: 40,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontFamily: FontFamily.labelSemibold, fontSize: Font.small },
  scroll: { padding: Spacing.lg, paddingBottom: 96 },
  empty: {
    textAlign: 'center',
    color: Colors.textMuted,
    marginTop: Spacing.xxl,
    fontSize: Font.body,
    fontFamily: FontFamily.regular,
  },
  backdrop: { flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' },
  pickerSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.xl,
    paddingBottom: Spacing.xxl,
    gap: Spacing.xs,
    ...Shadow.card,
  },
  handle: { width: 44, height: 5, borderRadius: 3, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: Spacing.md },
  pickerTitle: { fontSize: Font.title, fontFamily: FontFamily.extrabold, color: Colors.text, marginBottom: Spacing.sm },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
  },
  pickerRowLabel: { fontSize: Font.body, fontFamily: FontFamily.medium, color: Colors.text },
});
