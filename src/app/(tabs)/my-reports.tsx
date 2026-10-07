import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IncidentCard } from '@/components/IncidentCard';
import { MUNICIPALITIES } from '@/data/incidents';
import { useStore } from '@/data/store';
import { useStatusLabel } from '@/i18n/labels';
import { useT } from '@/i18n/useT';
import { Colors, Font, FontFamily, IncidentStatus, Radius, Shadow, Spacing, STATUS_CONFIG } from '@/theme/tokens';

// RF-017 / CU-007: "My reports" status filter. 'all' means no filter.
type StatusFilter = 'all' | IncidentStatus;
// Settings §5: municipality filter, 'all' = "Toda la ciudad".
type MunicipalityFilter = 'all' | string;

export default function MyReportsScreen() {
  const insets = useSafeAreaInsets();
  const t = useT();
  const statusLabel = useStatusLabel();
  const { incidents } = useStore();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [municipalityFilter, setMunicipalityFilter] = useState<MunicipalityFilter>('all');
  const [municipalityPicker, setMunicipalityPicker] = useState(false);

  // Settings §2: "My reports" no longer includes the Watching tab (lives on Home).
  const baseData = incidents.filter((i) => i.isMine);

  // Settings §5: "Toda la ciudad" only appears if the user has reports in more than
  // one municipality, and only lists municipalities where they actually have reports.
  const myMunicipalities = useMemo(() => {
    const ids = Array.from(new Set(baseData.map((i) => i.municipalityId)));
    return MUNICIPALITIES.filter((m) => ids.includes(m.id));
  }, [baseData]);
  const showMunicipalityFilter = myMunicipalities.length > 1;

  // RF-017 / CU-007: status and municipality filters (combined with AND), and the
  // list is ALWAYS sorted by descending date (most recent first).
  const data = useMemo(() => {
    return baseData
      .filter((i) => statusFilter === 'all' || i.status === statusFilter)
      .filter((i) => municipalityFilter === 'all' || i.municipalityId === municipalityFilter)
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [baseData, statusFilter, municipalityFilter]);

  const hasActiveFilters = statusFilter !== 'all' || municipalityFilter !== 'all';
  const activeMunicipality = MUNICIPALITIES.find((m) => m.id === municipalityFilter);

  return (
    <View style={styles.container}>
      {/* No blue header bar: the mockup uses a plain text title over the light background */}
      <Text style={[styles.pageTitle, { paddingTop: insets.top + Spacing.xl }]}>{t('myReportsTitle')}</Text>

      {/* Status chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsRow}
        contentContainerStyle={styles.chipsContent}>
        <Chip
          label={t('chipAll')}
          active={statusFilter === 'all'}
          activeBg={Colors.text}
          onPress={() => setStatusFilter('all')}
        />
        {(Object.keys(STATUS_CONFIG) as IncidentStatus[]).map((s) => (
          <Chip
            key={s}
            label={statusLabel(s)}
            icon={STATUS_CONFIG[s].icon}
            color={STATUS_CONFIG[s].color}
            active={statusFilter === s}
            onPress={() => setStatusFilter(s)}
          />
        ))}
      </ScrollView>

      {/* Municipality selector ("Toda la ciudad"), only if the user has reports in several */}
      {showMunicipalityFilter && (
        <Pressable style={styles.scopeRow} onPress={() => setMunicipalityPicker(true)}>
          <Ionicons name="location" size={15} color={Colors.primary} />
          <Text style={styles.scopeText}>
            {activeMunicipality ? activeMunicipality.name : t('wholeCity')}
          </Text>
          <Ionicons name="chevron-down" size={14} color={Colors.primary} />
        </Pressable>
      )}

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {data.map((inc) => (
          <View
            key={inc.id}
            style={[
              { marginBottom: Spacing.sm },
              // Mockup: reports in the terminal "Declined" status are shown dimmed.
              inc.status === 'declined' && styles.cardDeclined,
            ]}>
            <IncidentCard inc={inc} compact />
          </View>
        ))}
        {data.length === 0 && baseData.length > 0 && hasActiveFilters && (
          <View style={styles.empty}>
            <View style={styles.emptyBadge}>
              <Ionicons name="filter-outline" size={32} color={Colors.primary} />
            </View>
            <Text style={styles.emptyText}>{t('emptyFiltered')}</Text>
          </View>
        )}
        {baseData.length === 0 && (
          <View style={styles.empty}>
            <View style={styles.emptyBadge}>
              <Ionicons name="create-outline" size={32} color={Colors.primary} />
            </View>
            <Text style={styles.emptyText}>{t('emptyNoReportsYet')}{'\n'}{t('emptyNoReportsHint')}</Text>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={municipalityPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setMunicipalityPicker(false)}>
        <Pressable style={styles.backdrop} onPress={() => setMunicipalityPicker(false)}>
          <Pressable style={styles.pickerSheet} onPress={() => {}}>
            <View style={styles.handle} />
            <Pressable
              style={styles.pickerRow}
              onPress={() => {
                setMunicipalityFilter('all');
                setMunicipalityPicker(false);
              }}>
              <Text style={styles.pickerRowLabel}>{t('wholeCity')}</Text>
              {municipalityFilter === 'all' && <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />}
            </Pressable>
            {myMunicipalities.map((m) => (
              <Pressable
                key={m.id}
                style={styles.pickerRow}
                onPress={() => {
                  setMunicipalityFilter(m.id);
                  setMunicipalityPicker(false);
                }}>
                <Text style={styles.pickerRowLabel}>{m.name}</Text>
                {municipalityFilter === m.id && <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function Chip({
  label,
  icon,
  color,
  active,
  activeBg,
  onPress,
}: {
  label: string;
  icon?: string;
  color?: string;
  active: boolean;
  activeBg?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[
        styles.chip,
        active && [styles.chipActive, activeBg && { backgroundColor: activeBg, borderColor: activeBg }],
      ]}
      onPress={onPress}>
      {icon && (
        <Ionicons name={icon as any} size={15} color={active ? '#fff' : color ?? Colors.textMuted} />
      )}
      <Text style={[styles.chipText, { color: active ? '#fff' : Colors.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  pageTitle: {
    fontSize: 22,
    fontFamily: FontFamily.semibold,
    color: Colors.text,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  chipsRow: { maxHeight: 56, marginTop: Spacing.md },
  chipsContent: { paddingHorizontal: Spacing.lg, gap: Spacing.sm, alignItems: 'center' },
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
  chipText: { fontFamily: FontFamily.labelMedium, fontSize: Font.small },
  scopeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    alignSelf: 'flex-start',
  },
  scopeText: { fontFamily: FontFamily.medium, fontSize: Font.small, color: Colors.primary },
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  cardDeclined: { opacity: 0.75 },
  empty: { alignItems: 'center', marginTop: 80, gap: Spacing.md },
  emptyBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: Font.body,
    fontFamily: FontFamily.regular,
    textAlign: 'center',
    lineHeight: 20,
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
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
  },
  pickerRowLabel: { fontSize: Font.body, fontFamily: FontFamily.medium, color: Colors.text },
});
