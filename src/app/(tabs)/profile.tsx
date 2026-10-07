import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SignupSheet } from '@/components/SignupSheet';
import { MUNICIPALITIES, NEXT_TIER, TIER_BADGE_COLORS, TIER_THRESHOLDS } from '@/data/incidents';
import { useStore } from '@/data/store';
import { useTierLabel } from '@/i18n/labels';
import { useT } from '@/i18n/useT';
import { Colors, Font, FontFamily, Radius, Shadow, Spacing } from '@/theme/tokens';
import { initials } from '@/utils/avatar';
import { maskPhone } from '@/utils/phone';

// Settings §6: deterministic referral code derived from the user's own public
// name — real and functional, but crediting the inviter with points requires a
// real backend to observe that someone actually signed up through the link
// (this single-device demo has no concept of a second, independent account).
function referralCode(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return hash.toString(36).slice(0, 6).toUpperCase() || 'VIACLARA';
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useT();
  const tierLabel = useTierLabel();
  const {
    isRegistered,
    publicName,
    phone,
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
  const [municipalityPicker, setMunicipalityPicker] = useState(false);
  const [languagePicker, setLanguagePicker] = useState(false);

  const activeMunicipality = MUNICIPALITIES.find((m) => m.id === municipalityId);

  const nextTier = NEXT_TIER[tier];
  const progress = nextTier
    ? Math.min(1, (points - TIER_THRESHOLDS[tier]) / (TIER_THRESHOLDS[nextTier] - TIER_THRESHOLDS[tier]))
    : 1;
  const pointsToNext = nextTier ? Math.max(0, TIER_THRESHOLDS[nextTier] - points) : 0;

  function inviteFriends() {
    const code = referralCode(publicName ?? 'ViaClara');
    const link = `https://viaclara.app/descargar?ref=${code}`;
    Share.share({ message: t('inviteShareMessage').replace('{link}', link) });
  }

  return (
    <View style={styles.container}>
      {/* The whole screen, including the gradient header, scrolls together (like the mockup) */}
      <ScrollView contentContainerStyle={styles.scrollFull} showsVerticalScrollIndicator={false}>
        {isRegistered ? (
          <View style={[styles.profileHero, { paddingTop: insets.top + Spacing.xl }]}>
            <View style={styles.avatarLarge}>
              <Text style={styles.avatarInitials}>{initials(publicName ?? '')}</Text>
            </View>
            <Text style={styles.profileHeroName}>{publicName}</Text>
            {phone && <Text style={styles.profileHeroPhone}>+34 {maskPhone(phone)}</Text>}
          </View>
        ) : (
          <View style={[styles.plainHero, { paddingTop: insets.top + Spacing.sm }]}>
            <Text style={styles.plainHeroTitle}>{t('profileAnonymousTitle')}</Text>
          </View>
        )}

        <View style={[styles.content, isRegistered && styles.contentOverlap]}>
          {isRegistered ? (
            // Municipality: tenant selector (RF-014), overlapping the gradient header like the mockup
            <Pressable style={[styles.municipalityCard, { marginTop: 0 }]} onPress={() => setMunicipalityPicker(true)}>
              <Ionicons name="location" size={20} color={Colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.municipalityLabel}>{t('yourMunicipality')}</Text>
                <Text style={styles.municipalityValue}>
                  {activeMunicipality
                    ? `${activeMunicipality.name}, ${activeMunicipality.province}`
                    : t('selectMunicipality')}
                </Text>
              </View>
              <View style={styles.municipalityChange}>
                <Text style={styles.changeText}>{t('changeCta')}</Text>
                <Ionicons name="chevron-down" size={16} color={Colors.primary} />
              </View>
            </Pressable>
          ) : (
            <>
              <View style={styles.inviteCard}>
                <View style={styles.avatarGhost}>
                  <Ionicons name="person-add" size={30} color={Colors.primary} />
                </View>
                <Text style={styles.inviteTitle}>{t('joinTitle')}</Text>
                <Text style={styles.inviteBody}>{t('joinBody')}</Text>
                <Pressable style={styles.inviteBtn} onPress={() => setSheet(true)}>
                  <Text style={styles.inviteBtnText}>{t('createFreeAccount')}</Text>
                </Pressable>
              </View>

              {/* Municipality: tenant selector (RF-014), available without an account */}
              <Pressable style={styles.municipalityCard} onPress={() => setMunicipalityPicker(true)}>
                <Ionicons name="location" size={20} color={Colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.municipalityLabel}>{t('yourMunicipality')}</Text>
                  <Text style={styles.municipalityValue}>
                    {activeMunicipality
                      ? `${activeMunicipality.name}, ${activeMunicipality.province}`
                      : t('selectMunicipality')}
                  </Text>
                </View>
                <View style={styles.municipalityChange}>
                  <Text style={styles.changeText}>{t('changeCta')}</Text>
                  <Ionicons name="chevron-down" size={16} color={Colors.primary} />
                </View>
              </Pressable>
            </>
          )}

          {isRegistered && (
            <>
              {/* RF-016/RF-018: points are the star metric, with progress toward the
                  next tier — plain layout, no card, matching the mockup. */}
              <View style={styles.pointsSection}>
                <View style={styles.pointsHead}>
                  <View>
                    <Text style={styles.pointsLabel}>{t('pointsAccumulated')}</Text>
                    <Text style={styles.pointsNum}>{points.toLocaleString('es-ES')}</Text>
                  </View>
                  <View style={[styles.tierBadge, { backgroundColor: TIER_BADGE_COLORS[tier].bg }]}>
                    <Ionicons name="star-outline" size={14} color={TIER_BADGE_COLORS[tier].fg} />
                    <Text style={[styles.tierBadgeText, { color: TIER_BADGE_COLORS[tier].fg }]}>
                      {t('tierLevel')} {tierLabel(tier)}
                    </Text>
                  </View>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                </View>
                <Text style={styles.progressHint}>
                  {nextTier
                    ? t('pointsToNext').replace('{n}', String(pointsToNext)).replace('{tier}', tierLabel(nextTier))
                    : t('maxTierReached')}
                </Text>
              </View>

              {/* Settings §6: general user stats — plain columns, no cards */}
              <View style={styles.statsRow}>
                <StatCol num={stats.reportsCreated} label={t('statReports')} />
                <StatCol num={stats.reportsResolved} label={t('statResolved')} />
                <StatCol num={stats.likesReceived} label={t('statLikes')} />
              </View>
            </>
          )}

          {/* Settings: plain list, no section title or card wrapper, matching the mockup */}
          <View style={styles.menu}>
            {isRegistered && (
              <>
                {/* Settings §7: opens the notification panel; preferences are one tap
                    away from there via the header's settings icon. */}
                <Pressable onPress={() => router.push('/notifications')}>
                  <Row
                    icon="notifications-outline"
                    label={t('settingsNotifications')}
                    badge={unreadNotificationsCount > 0}
                    right={<Chevron />}
                  />
                </Pressable>
                <Divider />
              </>
            )}
            <Pressable onPress={() => router.push('/privacy')}>
              <Row icon="shield-checkmark-outline" label={t('settingsPrivacy')} right={<Chevron />} />
            </Pressable>
            <Divider />
            <Pressable onPress={() => router.push('/help')}>
              <Row icon="help-circle-outline" label={t('settingsHelp')} right={<Chevron />} />
            </Pressable>
            <Divider />
            <Pressable onPress={() => setLanguagePicker(true)}>
              <Row
                icon="language-outline"
                label={`${t('settingsLanguage')}: ${language === 'es' ? 'Español' : 'English'}`}
                right={<Chevron />}
              />
            </Pressable>
            <Divider />
            <Pressable onPress={inviteFriends}>
              <Row icon="person-add-outline" label={t('settingsInvite')} right={<Chevron />} />
            </Pressable>
          </View>

          {isRegistered && (
            <Pressable onPress={logout} hitSlop={8}>
              <Text style={styles.logoutText}>{t('logOut')}</Text>
            </Pressable>
          )}

          <Text style={styles.version}>{t('appVersion')}</Text>
        </View>
      </ScrollView>

      <SignupSheet
        visible={sheet}
        reason={t('reasonCreateAccount')}
        knownName={publicName}
        onClose={() => setSheet(false)}
        onRegister={(name, phoneNumber) => {
          login(name, phoneNumber);
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
            <Text style={styles.pickerTitle}>{t('chooseMunicipality')}</Text>
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

function StatCol({ num, label }: { num: number; label: string }) {
  return (
    <View style={styles.statCol}>
      <Text style={styles.statNum}>{num}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Row({
  icon,
  label,
  right,
  badge,
}: {
  icon: string;
  label: string;
  right?: React.ReactNode;
  badge?: boolean;
}) {
  return (
    <View style={styles.row}>
      <View>
        <Ionicons name={icon as any} size={22} color={Colors.text} />
        {badge && <View style={styles.rowBadgeDot} />}
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
  avatarLarge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: '#fff',
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  avatarInitials: { color: '#fff', fontSize: 32, fontFamily: FontFamily.bold },
  profileHeroName: { fontSize: 22, fontFamily: FontFamily.bold, color: '#fff' },
  profileHeroPhone: {
    fontSize: Font.small,
    fontFamily: FontFamily.regular,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 4,
  },
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
  // Points: plain section directly on the background, no card (matches mockup)
  pointsSection: { paddingTop: Spacing.xl, paddingBottom: Spacing.md },
  pointsHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  pointsLabel: { fontSize: Font.body, fontFamily: FontFamily.regular, color: Colors.textMuted },
  pointsNum: { fontSize: 40, fontFamily: FontFamily.extrabold, color: Colors.text },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
  },
  tierBadgeText: { fontFamily: FontFamily.semibold, fontSize: Font.small },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: Colors.primary },
  progressHint: { fontSize: Font.small, fontFamily: FontFamily.regular, color: Colors.textMuted },
  // Stats: plain columns, no cards (matches mockup)
  statsRow: { flexDirection: 'row', paddingVertical: Spacing.xl },
  statCol: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 28, fontFamily: FontFamily.extrabold, color: Colors.text },
  statLabel: { fontSize: Font.small, color: Colors.textMuted, fontFamily: FontFamily.regular, marginTop: 4 },
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
  // Settings menu: plain list, dividers only (matches mockup)
  menu: { paddingTop: Spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.lg, minHeight: 56 },
  rowBadgeDot: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.danger,
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
