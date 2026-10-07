import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { MUNICIPALITIES } from '@/data/incidents';
import { useStore } from '@/data/store';
import { useT } from '@/i18n/useT';
import { Colors, Font, FontFamily, Radius, Shadow, Spacing } from '@/theme/tokens';

// Settings §6: help section with FAQ, a unified system help centre (bug
// report form), and the active council's contact info.
export default function HelpScreen() {
  const t = useT();
  const { municipalityId } = useStore();
  const municipality = MUNICIPALITIES.find((m) => m.id === municipalityId);
  const [open, setOpen] = useState<string | null>(null);
  const [bugText, setBugText] = useState('');
  const [bugSent, setBugSent] = useState(false);

  const faqs = [
    { q: t('helpFaqQ1'), a: t('helpFaqA1') },
    { q: t('helpFaqQ2'), a: t('helpFaqA2') },
    { q: t('helpFaqQ3'), a: t('helpFaqA3') },
  ];

  function toggle(id: string) {
    setOpen((o) => (o === id ? null : id));
  }

  function sendBug() {
    if (!bugText.trim()) return;
    setBugSent(true);
    setBugText('');
  }

  const [contactBefore, contactAfter] = t('helpContactBody').split('{municipality}');
  const municipalityName = municipality ? municipality.name : t('yourMunicipalityFallback');

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: t('helpTitle') }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionTitle}>{t('helpFaq')}</Text>
        <View style={styles.card}>
          {faqs.map((f, i) => (
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
              {i < faqs.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        {/* Settings §6: "Centro de ayuda del sistema" and "Reportar un error o
            fallo" are unified into a single section (this one), keeping the bug
            report form and dropping the old descriptive paragraph entirely. */}
        <Text style={styles.sectionTitle}>{t('helpCenter')}</Text>
        <View style={styles.card}>
          <View style={{ paddingVertical: Spacing.md, gap: Spacing.sm }}>
            <TextInput
              style={styles.bugInput}
              placeholder={t('bugPlaceholder')}
              placeholderTextColor={Colors.textMuted}
              value={bugText}
              onChangeText={setBugText}
              multiline
            />
            <Pressable style={styles.bugBtn} onPress={sendBug}>
              <Text style={styles.bugBtnText}>{bugSent ? t('bugSent') : t('bugSubmit')}</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.sectionTitle}>{t('helpContact')}</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>
              {t('councilOf')} {municipalityName}
            </Text>
          </View>
          <Text style={styles.answer}>
            {contactBefore}
            {municipalityName}
            {contactAfter}
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
