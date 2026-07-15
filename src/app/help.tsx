import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { MUNICIPALITIES } from '@/data/incidents';
import { useStore } from '@/data/store';
import { useT } from '@/i18n/useT';
import { Colors, Font, FontFamily, Radius, Shadow, Spacing } from '@/theme/tokens';

const FAQS = [
  { q: '¿Cómo reporto una incidencia?', a: 'Pulsa el botón central de la barra inferior, añade una foto, elige la categoría, describe el problema y confirma la ubicación.' },
  { q: '¿Cómo sé si se ha resuelto?', a: 'Recibirás el aviso en el timeline de seguimiento del aviso y, si es tuyo, se te pedirá que confirmes si el problema desapareció.' },
  { q: '¿Puedo reportar sin crear una cuenta?', a: 'Puedes explorar y ver avisos sin cuenta, pero para reportar, comentar o seguir avisos necesitas verificar tu número de teléfono.' },
];

// Settings §6: help section with FAQ, help centre, bug report, active council's
// contact info, and a short explanation of the app.
export default function HelpScreen() {
  const t = useT();
  const { municipalityId } = useStore();
  const municipality = MUNICIPALITIES.find((m) => m.id === municipalityId);
  const [open, setOpen] = useState<string | null>(null);
  const [bugText, setBugText] = useState('');
  const [bugSent, setBugSent] = useState(false);

  function toggle(id: string) {
    setOpen((o) => (o === id ? null : id));
  }

  function sendBug() {
    if (!bugText.trim()) return;
    setBugSent(true);
    setBugText('');
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: t('helpTitle') }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionTitle}>{t('helpFaq')}</Text>
        <View style={styles.card}>
          {FAQS.map((f, i) => (
            <View key={f.q}>
              <Pressable style={styles.row} onPress={() => toggle(`faq-${i}`)}>
                <Text style={styles.rowLabel}>{f.q}</Text>
                <Ionicons
                  name={open === `faq-${i}` ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={Colors.textMuted}
                />
              </Pressable>
              {open === `faq-${i}` && <Text style={styles.answer}>{f.a}</Text>}
              {i < FAQS.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>{t('helpCenter')}</Text>
        <Pressable style={styles.card} onPress={() => toggle('center')}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>{t('helpCenter')}</Text>
            <Ionicons name={open === 'center' ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.textMuted} />
          </View>
          {open === 'center' && (
            <Text style={styles.answer}>
              Consulta guías paso a paso sobre cómo usar ViaClara desde el apartado de ayuda de tu ayuntamiento.
            </Text>
          )}
        </Pressable>

        <Text style={styles.sectionTitle}>{t('helpReportBug')}</Text>
        <View style={styles.card}>
          <View style={{ paddingVertical: Spacing.md, gap: Spacing.sm }}>
            <TextInput
              style={styles.bugInput}
              placeholder="Cuéntanos qué ha fallado…"
              placeholderTextColor={Colors.textMuted}
              value={bugText}
              onChangeText={setBugText}
              multiline
            />
            <Pressable style={styles.bugBtn} onPress={sendBug}>
              <Text style={styles.bugBtnText}>{bugSent ? 'Enviado, ¡gracias!' : 'Enviar a los administradores'}</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.sectionTitle}>{t('helpContact')}</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>
              Ayuntamiento de {municipality ? municipality.name : 'tu municipio'}
            </Text>
          </View>
          <Text style={styles.answer}>
            Consulta el teléfono y correo de atención ciudadana en la web oficial del ayuntamiento de{' '}
            {municipality ? municipality.name : 'tu municipio'}.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>{t('helpHowItWorks')}</Text>
        <View style={styles.card}>
          <Text style={[styles.answer, { paddingTop: Spacing.md }]}>{t('helpHowItWorksText')}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  sectionTitle: {
    fontSize: Font.small,
    fontFamily: FontFamily.labelBold,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, paddingHorizontal: Spacing.lg, ...Shadow.card },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.md, minHeight: 52 },
  rowLabel: { fontSize: Font.body, color: Colors.text, fontFamily: FontFamily.medium, flex: 1, marginRight: Spacing.md },
  answer: {
    fontSize: Font.small,
    fontFamily: FontFamily.regular,
    color: Colors.textMuted,
    lineHeight: 19,
    paddingBottom: Spacing.md,
  },
  divider: { height: 1, backgroundColor: Colors.border },
  bugInput: {
    minHeight: 70,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    padding: Spacing.md,
    fontSize: Font.body,
    fontFamily: FontFamily.regular,
    color: Colors.text,
    textAlignVertical: 'top',
  },
  bugBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  bugBtnText: { color: '#fff', fontFamily: FontFamily.bold, fontSize: Font.small },
});
