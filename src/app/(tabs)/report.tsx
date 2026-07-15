import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MUNICIPALITIES } from '@/data/incidents';
import { useStore } from '@/data/store';
import { CATEGORY_CONFIG, IncidentCategory, Colors, Font, FontFamily, Radius, Shadow, Spacing } from '@/theme/tokens';

export default function ReportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { create, municipalityId } = useStore();
  const municipality = MUNICIPALITIES.find((m) => m.id === municipalityId) ?? MUNICIPALITIES[0];

  const [photo, setPhoto] = useState(false);
  const [category, setCategory] = useState<IncidentCategory | null>(null);
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('Paseo de San Cristóbal, Almuñécar');
  const [locationOpen, setLocationOpen] = useState(false);
  const [newId, setNewId] = useState<string | null>(null);

  function reset() {
    setPhoto(false);
    setCategory(null);
    setDescription('');
    setNewId(null);
  }

  function submit() {
    if (!photo || !category) return;
    const title = description.trim()
      ? description.trim().split(' ').slice(0, 7).join(' ')
      : `${CATEGORY_CONFIG[category].label} en ${address.split(',')[0]}`;
    const id = create({ title, category, description, address });
    setNewId(id);
  }

  const canSubmit = photo && !!category;

  // Confirmation screen
  if (newId) {
    return (
      <View style={styles.container}>
        <View style={styles.successWrap}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark" size={44} color={Colors.success} />
          </View>
          <Text style={styles.successTitle}>¡Aviso enviado!</Text>
          <Text style={styles.successBody}>
            Tu aviso <Text style={styles.successStrong}>#{newId}</Text> fue enviado al
            ayuntamiento de {municipality.name}. Te avisaremos cuando cambie de estado.
          </Text>
          {/* Settings §3: inverted visual hierarchy — encourages reporting more
              instead of dwelling on the just-created report. */}
          <Pressable style={styles.primaryBtn} onPress={reset}>
            <Text style={styles.primaryText}>Reportar otra cosa</Text>
          </Pressable>
          <Pressable style={styles.linkBtn} onPress={() => router.push(`/incident/${newId}`)}>
            <Text style={styles.linkText}>Ver mi aviso</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Text style={styles.headerTitle}>Nuevo reporte</Text>
        <Pressable onPress={() => router.push('/')} hitSlop={10}>
          <Ionicons name="close" size={24} color={Colors.textMuted} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>FOTO</Text>
        <View style={[styles.photoBox, { marginBottom: photo ? Spacing.xl : Spacing.sm }]}>
          <Ionicons name="camera" size={40} color={Colors.primary} />
          {photo && (
            <Pressable style={styles.photoPill} onPress={() => setPhoto(false)}>
              <Ionicons name="camera" size={14} color={Colors.text} />
              <Text style={styles.photoPillText}>Repetir foto</Text>
            </Pressable>
          )}
        </View>
        {!photo && (
          <View style={styles.photoBtnRow}>
            <Pressable style={styles.photoBtn} onPress={() => setPhoto(true)}>
              <Ionicons name="camera-outline" size={18} color="#fff" />
              <Text style={styles.photoBtnText}>Hacer foto</Text>
            </Pressable>
            <Pressable style={[styles.photoBtn, styles.photoBtnSoft]} onPress={() => setPhoto(true)}>
              <Ionicons name="images-outline" size={18} color={Colors.primary} />
              <Text style={[styles.photoBtnText, { color: Colors.primary }]}>Elegir de la galería</Text>
            </Pressable>
          </View>
        )}

        <Text style={styles.label}>CATEGORÍA</Text>
        <View style={styles.catRow}>
          {(Object.keys(CATEGORY_CONFIG) as IncidentCategory[]).map((c) => {
            const selected = category === c;
            return (
              <Pressable
                key={c}
                style={[styles.catChip, selected && styles.catChipSel]}
                onPress={() => setCategory(c)}>
                <Ionicons
                  name={CATEGORY_CONFIG[c].icon as any}
                  size={15}
                  color={selected ? '#fff' : CATEGORY_CONFIG[c].color}
                />
                <Text style={[styles.catChipText, selected && { color: '#fff' }]}>{CATEGORY_CONFIG[c].label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>DESCRIPCIÓN</Text>
        <TextInput
          style={styles.textarea}
          placeholder="Cuéntanos qué está pasando y desde cuándo…"
          placeholderTextColor={Colors.textMuted}
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <Text style={styles.label}>UBICACIÓN</Text>
        <Pressable style={styles.locationRow} onPress={() => setLocationOpen(true)}>
          <Ionicons name="location" size={20} color={Colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.locationAddress}>{address}</Text>
            <Text style={styles.locationMuted}>{municipality.name} · detectado automáticamente</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
        </Pressable>

        <Pressable
          style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
          disabled={!canSubmit}
          onPress={submit}>
          <Text style={styles.submitText}>Siguiente</Text>
        </Pressable>
      </ScrollView>

      <LocationPickerModal
        visible={locationOpen}
        initialAddress={address}
        municipality={municipality.name}
        onClose={() => setLocationOpen(false)}
        onConfirm={(addr) => {
          setAddress(addr);
          setLocationOpen(false);
        }}
      />
    </View>
  );
}

function LocationPickerModal({
  visible,
  initialAddress,
  municipality,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  initialAddress: string;
  municipality: string;
  onClose: () => void;
  onConfirm: (address: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState(initialAddress);

  useEffect(() => {
    if (visible) setDraft(initialAddress);
  }, [visible, initialAddress]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.pickerContainer}>
        <View style={[styles.pickerHeader, { paddingTop: insets.top + Spacing.sm }]}>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="chevron-back" size={22} color={Colors.text} />
          </Pressable>
          <Text style={styles.pickerHeaderTitle}>Ubicación del problema</Text>
          <View style={{ width: 22 }} />
        </View>

        <View style={styles.pickerMap}>
          {[0.3, 0.55, 0.8].map((p) => (
            <View key={`h${p}`} style={[styles.pickerGridH, { top: `${p * 100}%` }]} />
          ))}
          {[0.25, 0.5, 0.75].map((p) => (
            <View key={`v${p}`} style={[styles.pickerGridV, { left: `${p * 100}%` }]} />
          ))}
          <View style={styles.pickerLocateBtn}>
            <Ionicons name="help-circle-outline" size={18} color={Colors.text} />
          </View>
          <View style={styles.pickerPin}>
            <View style={styles.pickerPinHead}>
              <Ionicons name="location" size={16} color="#fff" />
            </View>
            <View style={styles.pickerPinTail} />
          </View>
        </View>

        <View style={[styles.pickerSheet, { paddingBottom: insets.bottom + Spacing.lg }]}>
          <View style={styles.pickerHandle} />
          <View style={styles.pickerSearchRow}>
            <Ionicons name="search" size={16} color={Colors.textMuted} />
            <Text style={styles.pickerSearchText}>Buscar en Google Maps</Text>
            <View style={styles.pickerSearchBtn}>
              <Ionicons name="navigate" size={14} color="#fff" />
            </View>
          </View>

          <View style={styles.pickerAddressCard}>
            <TextInput style={styles.pickerAddressInput} value={draft} onChangeText={setDraft} multiline />
            <Text style={styles.locationMuted}>{municipality} · detectado automáticamente</Text>
          </View>

          <Text style={styles.pickerHint}>
            ¿No conoces la ubicación exacta? Selecciónala en el mapa
          </Text>

          <Pressable style={styles.pickerMyLocation} onPress={() => setDraft('Mi ubicación actual (GPS)')}>
            <View style={styles.pickerRadio} />
            <Text style={styles.pickerMyLocationText}>Mi ubicación</Text>
          </Pressable>

          <Pressable style={styles.submitBtn} onPress={() => onConfirm(draft)}>
            <Text style={styles.submitText}>Confirmar ubicación</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: Font.subtitle, fontFamily: FontFamily.bold, color: Colors.text },
  body: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  label: {
    fontSize: Font.small,
    fontFamily: FontFamily.labelBold,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: Spacing.sm,
  },
  photoBox: {
    height: 160,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPill: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radius.pill,
  },
  photoPillText: { fontSize: Font.small, fontFamily: FontFamily.semibold, color: Colors.text },
  photoBtnRow: { gap: Spacing.sm, marginTop: Spacing.sm, marginBottom: Spacing.xl },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: Radius.md,
  },
  photoBtnSoft: { backgroundColor: Colors.primarySoft },
  photoBtnText: { color: '#fff', fontFamily: FontFamily.semibold, fontSize: Font.body },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.xl },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
    backgroundColor: Colors.background,
  },
  catChipSel: { backgroundColor: Colors.primary },
  catChipText: { fontFamily: FontFamily.labelSemibold, fontSize: Font.small, color: Colors.text },
  textarea: {
    minHeight: 90,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    padding: Spacing.md,
    fontSize: Font.body,
    fontFamily: FontFamily.regular,
    color: Colors.text,
    textAlignVertical: 'top',
    marginBottom: Spacing.xl,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: 14,
    marginBottom: Spacing.md,
  },
  locationAddress: { fontSize: Font.body, fontFamily: FontFamily.medium, color: Colors.text },
  locationMuted: { fontSize: Font.small, fontFamily: FontFamily.regular, color: Colors.textMuted, marginTop: 2 },
  submitBtn: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.primary,
    paddingVertical: 15,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  submitBtnDisabled: { backgroundColor: Colors.border },
  submitText: { color: '#fff', fontFamily: FontFamily.bold, fontSize: Font.body },

  successWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
  },
  successIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.success + '1A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  successTitle: {
    fontSize: Font.hero,
    fontFamily: FontFamily.extrabold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  successBody: {
    fontSize: Font.body,
    color: Colors.textMuted,
    fontFamily: FontFamily.regular,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 300,
    marginBottom: Spacing.lg,
  },
  successStrong: { color: Colors.text, fontFamily: FontFamily.semibold },
  primaryBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: Spacing.xxl,
    borderRadius: Radius.md,
    alignSelf: 'stretch',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  primaryText: { color: '#fff', fontFamily: FontFamily.bold, fontSize: Font.body },
  linkBtn: { padding: Spacing.sm },
  linkText: { color: Colors.textMuted, fontFamily: FontFamily.medium, fontSize: Font.small },

  // Location picker
  pickerContainer: { flex: 1, backgroundColor: Colors.surface },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  pickerHeaderTitle: { fontSize: Font.body, fontFamily: FontFamily.bold, color: Colors.text },
  pickerMap: {
    flex: 1,
    backgroundColor: '#E9EDF1',
    overflow: 'hidden',
  },
  pickerGridH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: '#DCE2E8' },
  pickerGridV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: '#DCE2E8' },
  pickerLocateBtn: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.card,
  },
  pickerPin: { position: 'absolute', top: '42%', left: '46%', alignItems: 'center' },
  pickerPinHead: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.warning,
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerPinTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 9,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: Colors.warning,
    marginTop: -1,
  },
  pickerSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
    marginTop: -20,
    ...Shadow.card,
  },
  pickerHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  pickerSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    borderRadius: Radius.md,
    paddingVertical: 11,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  pickerSearchText: { flex: 1, fontSize: Font.small, fontFamily: FontFamily.regular, color: Colors.textMuted },
  pickerSearchBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerAddressCard: {
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  pickerAddressInput: { fontSize: Font.body, fontFamily: FontFamily.medium, color: Colors.text, padding: 0 },
  pickerHint: {
    fontSize: Font.small,
    fontFamily: FontFamily.regular,
    fontStyle: 'italic',
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },
  pickerMyLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    borderRadius: Radius.md,
    paddingVertical: 11,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  pickerRadio: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: Colors.primary },
  pickerMyLocationText: { fontFamily: FontFamily.medium, fontSize: Font.small, color: Colors.primary },
});
