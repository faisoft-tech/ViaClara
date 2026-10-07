import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IncidentCard } from '@/components/IncidentCard';
import { IncidentsMap } from '@/components/IncidentsMap';
import { Incident, MUNICIPALITIES } from '@/data/incidents';
import { useStore } from '@/data/store';
import { useCategoryLabel, useStatusLabel } from '@/i18n/labels';
import { useT } from '@/i18n/useT';
import { CATEGORY_CONFIG, IncidentCategory, Colors, Font, FontFamily, IncidentStatus, Radius, Shadow, Spacing, STATUS_CONFIG } from '@/theme/tokens';

// Settings §2: only open/in-progress reports ever show on the main page —
// resolved, closed, declined or rejected reports never appear here.
const HOME_STATUSES: IncidentStatus[] = ['open', 'in_progress'];

function toggleInSet<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
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
  const t = useT();
  const categoryLabel = useCategoryLabel();
  const statusLabel = useStatusLabel();
  const {
    incidents,
    municipalityId,
    setMunicipality,
    priorityScoreOf,
    unreadNotificationsCount,
    refresh,
    loadingIncidents,
  } = useStore();

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );
  const [view, setView] = useState<'list' | 'map'>('map');
  const [statusFilter, setStatusFilter] = useState<Set<IncidentStatus>>(new Set());
  const [categoryFilter, setCategoryFilter] = useState<Set<IncidentCategory>>(new Set());
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [municipalityPicker, setMunicipalityPicker] = useState(false);

  const municipality = MUNICIPALITIES.find((m) => m.id === municipalityId) ?? MUNICIPALITIES[0];

  // Settings §2: only Estado + Categoría filters remain, both multi-select; the
  // list is always sorted by priority (highest first), no user-facing sort toggle.
  const data = useMemo(() => {
    const list = incidents
      .filter((i) => i.municipalityId === municipalityId)
      .filter((i) => HOME_STATUSES.includes(i.status))
      .filter((i) => statusFilter.size === 0 || statusFilter.has(i.status))
      .filter((i) => categoryFilter.size === 0 || categoryFilter.has(i.category));
    return [...list].sort((a, b) => priorityScoreOf(b) - priorityScoreOf(a));
  }, [incidents, municipalityId, statusFilter, categoryFilter, priorityScoreOf]);

  return (
    <View style={styles.container}>
      <View style={[styles.hero, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={styles.heroRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroGreeting}>{t('greetingHello')}</Text>
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

      <View style={styles.segment}>
        <SegBtn label={t('viewList')} icon="list" active={view === 'list'} onPress={() => setView('list')} />
        <SegBtn label={t('viewMap')} icon="map" active={view === 'map'} onPress={() => setView('map')} />
      </View>

      {/* Settings §2: only two filters remain — Estado and Categoría, both multi-select dropdowns */}
      <View style={styles.filtersRow}>
        <FilterPill
          label={t('filterStatus')}
          count={statusFilter.size}
          onPress={() => setStatusModalOpen(true)}
        />
        <FilterPill
          label={t('filterCategory')}
          count={categoryFilter.size}
          onPress={() => setCategoryModalOpen(true)}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loadingIncidents} onRefresh={() => void refresh()} />}
      >
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
        {view === 'list' && data.length === 0 && <Text style={styles.empty}>{t('emptyNoMatches')}</Text>}
      </ScrollView>

      <Modal
        visible={municipalityPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setMunicipalityPicker(false)}>
        <Pressable style={styles.backdrop} onPress={() => setMunicipalityPicker(false)}>
          <Pressable style={styles.pickerSheet} onPress={() => {}}>
            <View style={styles.handle} />
            <Text style={styles.pickerTitle}>{t('chooseMunicipality')}</Text>
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

      <MultiSelectModal
        visible={statusModalOpen}
        title={t('filterStatus')}
        options={HOME_STATUSES.map((s) => ({
          value: s,
          label: statusLabel(s),
          icon: STATUS_CONFIG[s].icon,
          color: STATUS_CONFIG[s].color,
        }))}
        selected={statusFilter}
        onToggle={(v) => setStatusFilter((prev) => toggleInSet(prev, v))}
        onClear={() => setStatusFilter(new Set())}
        onClose={() => setStatusModalOpen(false)}
        applyLabel={t('filterApply')}
        clearLabel={t('filterClear')}
      />
      <MultiSelectModal
        visible={categoryModalOpen}
        title={t('filterCategory')}
        options={(Object.keys(CATEGORY_CONFIG) as IncidentCategory[]).map((c) => ({
          value: c,
          label: categoryLabel(c),
          icon: CATEGORY_CONFIG[c].icon,
          color: CATEGORY_CONFIG[c].color,
        }))}
        selected={categoryFilter}
        onToggle={(v) => setCategoryFilter((prev) => toggleInSet(prev, v))}
        onClear={() => setCategoryFilter(new Set())}
        onClose={() => setCategoryModalOpen(false)}
        applyLabel={t('filterApply')}
        clearLabel={t('filterClear')}
      />
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

function FilterPill({ label, count, onPress }: { label: string; count: number; onPress: () => void }) {
  const active = count > 0;
  return (
    <Pressable style={[styles.filterPill, active && styles.filterPillActive]} onPress={onPress}>
      <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>
        {label}
        {active ? ` (${count})` : ''}
      </Text>
      <Ionicons name="chevron-down" size={14} color={active ? '#fff' : Colors.textMuted} />
    </Pressable>
  );
}

function MultiSelectModal<T extends string>({
  visible,
  title,
  options,
  selected,
  onToggle,
  onClear,
  onClose,
  applyLabel,
  clearLabel,
}: {
  visible: boolean;
  title: string;
  options: { value: T; label: string; icon?: string; color?: string }[];
  selected: Set<T>;
  onToggle: (value: T) => void;
  onClear: () => void;
  onClose: () => void;
  applyLabel: string;
  clearLabel: string;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.pickerSheet} onPress={() => {}}>
          <View style={styles.handle} />
          <Text style={styles.pickerTitle}>{title}</Text>
          {options.map((opt) => {
            const checked = selected.has(opt.value);
            return (
              <Pressable key={opt.value} style={styles.multiRow} onPress={() => onToggle(opt.value)}>
                <View style={styles.multiRowLeft}>
                  {opt.icon && <Ionicons name={opt.icon as any} size={16} color={opt.color ?? Colors.textMuted} />}
                  <Text style={styles.pickerRowLabel}>{opt.label}</Text>
                </View>
                <Ionicons
                  name={checked ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={checked ? Colors.primary : Colors.textMuted}
                />
              </Pressable>
            );
          })}
          <View style={styles.multiActions}>
            <Pressable style={styles.multiClearBtn} onPress={onClear}>
              <Text style={styles.multiClearText}>{clearLabel}</Text>
            </Pressable>
            <Pressable style={styles.multiApplyBtn} onPress={onClose}>
              <Text style={styles.multiApplyText}>{applyLabel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
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
  filtersRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
  },
  filterPillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterPillText: { fontFamily: FontFamily.labelSemibold, fontSize: Font.small, color: Colors.text },
  filterPillTextActive: { color: '#fff' },
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
  multiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  multiRowLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  multiActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  multiClearBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    alignItems: 'center',
  },
  multiClearText: { fontFamily: FontFamily.semibold, fontSize: Font.body, color: Colors.text },
  multiApplyBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  multiApplyText: { fontFamily: FontFamily.semibold, fontSize: Font.body, color: '#fff' },
});
