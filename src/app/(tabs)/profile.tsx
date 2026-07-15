import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Share, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SignupSheet } from '@/components/SignupSheet';
import { MUNICIPALITIES, Tier, TIER_LABELS } from '@/data/incidents';
import { useStore } from '@/data/store';
import { useT } from '@/i18n/useT';
import { Colors, Font, FontFamily, Radius, Shadow, Spacing } from '@/theme/tokens';

// RF-018: tier badge background/text color, coherent with the Profile mockup.
const TIER_BADGE_COLORS: Record<Tier, { bg: string; fg: string }> = {
  bronze: { bg: '#F5EBE3', fg: '#8A5A34' },
  silver: { bg: '#EEF1F4', fg: '#5B6672' },
  gold: { bg: '#FFF4E0', fg: '#B8790E' },
};

// RF-018: point thresholds per tier (consistent with getTier in data/incidents.ts).
const TIER_THRESHOLDS = { bronze: 0, silver: 50, gold: 200 } as const;
const NEXT_TIER: Partial<Record<Tier, Tier>> = { bronze: 'silver', silver: 'gold' };

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useT();
  const {
    isRegistered,
    publicName,
    login,
    logout,
    points,
    tier,
    municipalityId,
    setMunicipality,
    stats,
    language,
    setLanguage,
    unreadNotificationsCount,
  } = useStore();
  const [sheet, setSheet] = useState(false);
  const [blurFaces, setBlurFaces] = useState(true);
  const [municipalityPicker, setMunicipalityPicker] = useState(false);
  const [languagePicker, setLanguagePicker] = useState(false);

  const activeMunicipality = MUNICIPALITIES.find((m) => m.id === municipalityId);

  const nextTier = NEXT_TIER[tier];
  const progress = nextTier
    ? Math.min(1, (points - TIER_THRESHOLDS[tier]) / (TIER_THRESHOLDS[nextTier] - TIER_THRESHOLDS[tier]))
    : 1;
  const pointsToNext = nextTier ? Math.max(0, TIER_THRESHOLDS[nextTier] - points) : 0;

  function inviteFriends() {
    Share.share({
      message: 'Únete a ViaClara y ayuda a mejorar tu municipio: reporta incidencias en tu calle.',
    });
  }

  return (
    <View style={styles.container}>
      {/* The whole screen, including the gradient header, scrolls together (like the mockup) */}
      <ScrollView contentContainerStyle={styles.scrollFull} showsVerticalScrollIndicator={false}>
        {isRegistered ? (
          <View style={[styles.profileHero, { paddingTop: insets.top + Spacing.xl }]}>
            {/* Settings §7: notification bell, with an unread indicator */}
            <Pressable style={styles.bellBtn} onPress={() => router.push('/notifications')} hitSlop={8}>
              <Ionicons name="notifications-outline" size={22} color="#fff" />
              {unreadNotificationsCount > 0 && <View style={styles.bellBadge} />}
            </Pressable>
            <View style={styles.avatarLarge}>
              <Ionicons name="person" size={32} color="#fff" />
            </View>
            <Text style={styles.profileHeroName}>
              {publicName ?? `Vecino/a de ${activeMunicipality ? activeMunicipality.name : 'tu municipio'}`}
            </Text>
          </View>
        ) : (
          <View style={[styles.plainHero, { paddingTop: insets.top + Spacing.sm }]}>
            <Text style={styles.plainHeroTitle}>Perfil</Text>
          </View>
        )}

        <View style={[styles.content, isRegistered && styles.contentOverlap]}>
          {isRegistered ? (
            // Municipality: tenant selector (RF-014), overlapping the gradient header like the mockup
            <Pressable style={[styles.municipalityCard, { marginTop: 0 }]} onPress={() => setMunicipalityPicker(true)}>
              <View style={styles.rowIconBadge}>
                <Ionicons name="location" size={18} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.municipalityLabel}>Tu municipio</Text>
                <Text style={styles.municipalityValue}>
                  {activeMunicipality
                    ? `${activeMunicipality.name}, ${activeMunicipality.province}`
                    : 'Selecciona un municipio'}
                </Text>
              </View>
              <View style={styles.municipalityChange}>
                <Text style={styles.changeText}>Cambiar</Text>
                <Ionicons name="chevron-down" size={16} color={Colors.primary} />
              </View>
            </Pressable>
          ) : (
            <>
              <View style={styles.inviteCard}>
                <View style={styles.avatarGhost}>
                  <Ionicons name="person-add" size={30} color={Colors.primary} />
                </View>
                <Text style={styles.inviteTitle}>Únete a ViaClara</Text>
                <Text style={styles.inviteBody}>
                  Crea una cuenta para recibir avisos de tus incidencias y participar en tu municipio.
                </Text>
                <Pressable style={styles.inviteBtn} onPress={() => setSheet(true)}>
                  <Text style={styles.inviteBtnText}>Crear cuenta gratis</Text>
                </Pressable>
              </View>

              {/* Municipality: tenant selector (RF-014), available without an account */}
              <Pressable style={styles.municipalityCard} onPress={() => setMunicipalityPicker(true)}>
                <View style={styles.rowIconBadge}>
                  <Ionicons name="location" size={18} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.municipalityLabel}>Tu municipio</Text>
                  <Text style={styles.municipalityValue}>
                    {activeMunicipality
                      ? `${activeMunicipality.name}, ${activeMunicipality.province}`
                      : 'Selecciona un municipio'}
                  </Text>
                </View>
                <View style={styles.municipalityChange}>
                  <Text style={styles.changeText}>Cambiar</Text>
                  <Ionicons name="chevron-down" size={16} color={Colors.primary} />
                </View>
              </Pressable>
            </>
          )}

          {isRegistered && (
            <>
              {/* RF-016/RF-018: points are the star metric, with progress toward the next tier */}
              <View style={styles.pointsCard}>
                <View style={styles.pointsHead}>
                  <View>
                    <Text style={styles.pointsLabel}>Puntos acumulados</Text>
                    <Text style={styles.pointsNum}>{points.toLocaleString('es-ES')}</Text>
                  </View>
                  <View style={[styles.tierBadge, { backgroundColor: TIER_BADGE_COLORS[tier].bg }]}>
                    <Ionicons name="ribbon" size={14} color={TIER_BADGE_COLORS[tier].fg} />
                    <Text style={[styles.tierBadgeText, { color: TIER_BADGE_COLORS[tier].fg }]}>
                      Nivel {TIER_LABELS[tier]}
                    </Text>
                  </View>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                </View>
                <Text style={styles.progressHint}>
                  {nextTier
                    ? `${pointsToNext} puntos más para nivel ${TIER_LABELS[nextTier]}`
                    : 'Nivel máximo alcanzado'}
                </Text>
              </View>

              {/* Settings §6: general user stats (reports created / resolved / likes received) */}
              <View style={styles.statsRow}>
                <StatCard num={stats.reportsCreated} label="Avisos" />
                <StatCard num={stats.reportsResolved} label="Resueltos" />
                <StatCard num={stats.likesReceived} label="Me gusta" />
              </View>
            </>
          )}

          {/* Settings */}
          <Text style={styles.sectionTitle}>Ajustes</Text>
          <View style={styles.card}>
            {isRegistered && (
              <>
                {/* Settings §6: the notifications entry becomes exclusively preferences,
                    on its own screen */}
                <Pressable onPress={() => router.push('/settings/notifications')}>
                  <Row icon="notifications" label={t('settingsNotifications')} right={<Chevron />} />
                </Pressable>
                <Divider />
              </>
            )}
            <Row
              icon="eye-off"
              label={t('settingsBlur')}
              right={
                <Switch value={blurFaces} onValueChange={setBlurFaces} trackColor={{ true: Colors.primary }} />
              }
            />
            <Divider />
            <Pressable onPress={() => setLanguagePicker(true)}>
              <Row
                icon="language"
                label={`${t('settingsLanguage')}: ${language === 'es' ? 'Español' : 'English'}`}
                right={<Chevron />}
              />
            </Pressable>
            <Divider />
            <Pressable onPress={() => router.push('/privacy')}>
              <Row icon="shield-checkmark" label={t('settingsPrivacy')} right={<Chevron />} />
            </Pressable>
            <Divider />
            <Pressable onPress={() => router.push('/help')}>
              <Row icon="help-circle" label={t('settingsHelp')} right={<Chevron />} />
            </Pressable>
            <Divider />
            <Pressable onPress={inviteFriends}>
              <Row icon="person-add" label={t('settingsInvite')} right={<Chevron />} />
            </Pressable>
          </View>

          {isRegistered && (
            <Pressable onPress={logout} hitSlop={8}>
              <Text style={styles.logoutText}>{t('logOut')}</Text>
            </Pressable>
          )}

          <Text style={styles.version}>ViaClara · versión 0.1 (demo)</Text>
        </View>
      </ScrollView>

      <SignupSheet
        visible={sheet}
        reason="Crea tu cuenta de ViaClara."
        onClose={() => setSheet(false)}
        onRegister={(name) => {
          login(name);
          setSheet(false);
        }}
      />

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
                onPress={() => {
                  setMunicipality(m.id);
                  setMunicipalityPicker(false);
                }}>
                <Row
                  icon="location"
                  label={`${m.name}, ${m.province}`}
                  right={m.id === municipalityId ? <Ionicons name="checkmark-circle" size={22} color={Colors.primary} /> : undefined}
                />
                <Divider />
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={languagePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setLanguagePicker(false)}>
        <Pressable style={styles.backdrop} onPress={() => setLanguagePicker(false)}>
          <Pressable style={styles.pickerSheet} onPress={() => {}}>
            <View style={styles.handle} />
            <Text style={styles.pickerTitle}>{t('settingsLanguage')}</Text>
            {(['es', 'en'] as const).map((lang) => (
              <Pressable
                key={lang}
                onPress={() => {
                  setLanguage(lang);
                  setLanguagePicker(false);
                }}>
                <Row
                  icon="language"
                  label={lang === 'es' ? 'Español' : 'English'}
                  right={lang === language ? <Ionicons name="checkmark-circle" size={22} color={Colors.primary} /> : undefined}
                />
                <Divider />
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function StatCard({ num, label }: { num: number; label: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statNum}>{num}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Row({ icon, label, right }: { icon: string; label: string; right?: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIconBadge}>
        <Ionicons name={icon as any} size={18} color={Colors.primary} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={{ marginLeft: 'auto' }}>{right}</View>
    </View>
  );
}

const Chevron = () => <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />;
const Divider = () => <View style={styles.divider} />;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollFull: { paddingBottom: Spacing.xxl },
  // Gradient header with large avatar, like the mockup (11 · Profile)
  profileHero: {
    backgroundColor: Colors.primary,
    paddingBottom: 44,
    borderBottomLeftRadius: Radius.xl,
    borderBottomRightRadius: Radius.xl,
    alignItems: 'center',
  },
  bellBtn: { position: 'absolute', top: 44, right: Spacing.lg },
  bellBadge: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.danger,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  avatarLarge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
    borderColor: '#fff',
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  profileHeroName: { fontSize: 19, fontFamily: FontFamily.semibold, color: '#fff' },
  // Simple header for the anonymous state (no avatar, no user to show)
  plainHero: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderBottomLeftRadius: Radius.xl,
    borderBottomRightRadius: Radius.xl,
  },
  plainHeroTitle: { fontSize: Font.title, fontFamily: FontFamily.extrabold, color: '#fff' },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  // Overlaps the municipality card on top of the gradient header, like the mockup (margin:-24px)
  contentOverlap: { marginTop: -24 },
  municipalityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.md,
    ...Shadow.card,
  },
  municipalityLabel: { fontSize: Font.small, fontFamily: FontFamily.regular, color: Colors.textMuted },
  municipalityValue: { fontSize: Font.body, fontFamily: FontFamily.semibold, color: Colors.text, marginTop: 1 },
  municipalityChange: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    marginTop: Spacing.xs,
  },
  tierBadgeText: { fontFamily: FontFamily.labelBold, fontSize: Font.small },
  pointsCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.md,
    ...Shadow.card,
  },
  pointsHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  pointsLabel: { fontSize: Font.small, fontFamily: FontFamily.regular, color: Colors.textMuted },
  pointsNum: { fontSize: Font.hero, fontFamily: FontFamily.extrabold, color: Colors.text },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: Colors.primary },
  progressHint: { fontSize: Font.small, fontFamily: FontFamily.regular, color: Colors.textMuted },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    ...Shadow.card,
  },
  statNum: { fontSize: Font.title, fontFamily: FontFamily.extrabold, color: Colors.text },
  statLabel: {
    fontSize: Font.small - 2,
    color: Colors.textMuted,
    fontFamily: FontFamily.labelSemibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  inviteCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
    ...Shadow.card,
  },
  avatarGhost: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  inviteTitle: { fontSize: Font.title, fontFamily: FontFamily.extrabold, color: Colors.text },
  inviteBody: {
    fontSize: Font.body,
    color: Colors.textMuted,
    fontFamily: FontFamily.regular,
    textAlign: 'center',
    lineHeight: 20,
  },
  inviteBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.md,
    marginTop: Spacing.sm,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  inviteBtnText: { color: '#fff', fontFamily: FontFamily.bold, fontSize: Font.bodyLg },
  sectionTitle: {
    fontSize: Font.small,
    fontFamily: FontFamily.labelBold,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, paddingHorizontal: Spacing.lg, ...Shadow.card },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md, minHeight: 56 },
  rowIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { fontSize: Font.body, color: Colors.text, fontFamily: FontFamily.medium, flexShrink: 1 },
  divider: { height: 1, backgroundColor: Colors.border },
  changeText: { color: Colors.primary, fontFamily: FontFamily.semibold, fontSize: Font.body },
  logoutText: {
    textAlign: 'center',
    color: Colors.danger,
    fontSize: Font.body,
    fontFamily: FontFamily.medium,
    marginTop: Spacing.xl,
  },
  version: { textAlign: 'center', color: Colors.textMuted, fontSize: Font.small, fontFamily: FontFamily.regular, marginTop: Spacing.xl },
  backdrop: { flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' },
  pickerSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.xl,
    paddingBottom: Spacing.xxl,
    alignItems: 'stretch',
    gap: Spacing.sm,
  },
  handle: { width: 44, height: 5, borderRadius: 3, backgroundColor: Colors.border, alignSelf: 'center' },
  pickerTitle: { fontSize: Font.title, fontFamily: FontFamily.extrabold, color: Colors.text, marginBottom: Spacing.sm },
});
