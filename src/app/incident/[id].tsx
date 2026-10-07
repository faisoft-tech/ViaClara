import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Fragment, useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  findNodeHandle,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  useWindowDimensions,
  View,
} from 'react-native';

import { SignupSheet } from '@/components/SignupSheet';
import { StatusBadge } from '@/components/StatusBadge';
import { MUNICIPALITIES } from '@/data/incidents';
import { useStore } from '@/data/store';
import { useCategoryLabel, useStatusLabel } from '@/i18n/labels';
import { useT } from '@/i18n/useT';
import {
  CATEGORY_CONFIG,
  Colors,
  Font,
  FontFamily,
  IncidentCategory,
  Radius,
  Shadow,
  Spacing,
  STATUS_CONFIG,
  STATUS_WORKFLOW_ORDER,
} from '@/theme/tokens';
import { avatarColor, initials } from '@/utils/avatar';

// Settings §8: public profiles only make sense for real neighbours, not for
// "Tú" (the current user) or the council (institutional account).
function isAuthorNavigable(name: string) {
  return name !== 'Tú' && !name.toLowerCase().includes('ayuntamiento');
}

export default function IncidentDetailScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useT();
  const categoryLabel = useCategoryLabel();
  const statusLabel = useStatusLabel();
  const {
    incidents,
    isRegistered,
    publicName,
    login,
    toggleLike,
    toggleWatch,
    reopen,
    addComment,
    verifyResolution,
    toggleCommentLike,
    updateIncident,
    deleteIncident,
    refreshIncident,
  } = useStore();
  const inc = incidents.find((i) => i.id === id);
  const [refreshing, setRefreshing] = useState(false);

  const reload = useCallback(async () => {
    if (!id) return;
    setRefreshing(true);
    await refreshIncident(id);
    setRefreshing(false);
  }, [id, refreshIncident]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const [text, setText] = useState('');
  const [pending, setPending] = useState<null | (() => void)>(null);
  const [reason, setReason] = useState<string>();
  const [reactivationDismissed, setReactivationDismissed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState<IncidentCategory | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const commentsRef = useRef<View>(null);

  const sortedComments = useMemo(() => {
    if (!inc) return [];
    // Settings §4: comments sorted by most "likes" first; on a tie, most recent
    // first (the array is append-only, so a higher index means more recent).
    return inc.comments
      .map((c, idx) => ({ c, idx }))
      .sort((a, b) => b.c.likes - a.c.likes || b.idx - a.idx)
      .map(({ c }) => c);
  }, [inc]);

  if (!inc) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: t('incidentDetailTitle'), headerBackTitle: t('backCta') }} />
        <Text style={styles.muted}>{refreshing ? '…' : t('notFoundIncident')}</Text>
      </View>
    );
  }

  const cat = CATEGORY_CONFIG[inc.category];
  const municipality = MUNICIPALITIES.find((m) => m.id === inc.municipalityId);

  // Signup wall: social actions require an account.
  function guard(reasonText: string, fn: () => void) {
    if (isRegistered) fn();
    else {
      setReason(reasonText);
      setPending(() => fn);
    }
  }

  function onShare() {
    Share.share({
      message: t('shareMessage').replace('{title}', inc!.title).replace('{address}', inc!.address),
    });
  }

  function onSendComment() {
    if (!text.trim()) return;
    guard(t('reasonComment'), () => {
      addComment(inc!.id, text.trim());
      setText('');
    });
  }

  function goToComments() {
    const scrollNode = scrollRef.current;
    const commentsHandle = findNodeHandle(commentsRef.current);
    const scrollHandle = findNodeHandle(scrollNode);
    if (!scrollNode || !commentsHandle || !scrollHandle) return;
    try {
      UIManager.measureLayout(
        commentsHandle,
        scrollHandle,
        () => {},
        (_x, y) => scrollNode.scrollTo({ y: Math.max(0, y - Spacing.lg), animated: true }),
      );
    } catch {
      // Platforms without measureLayout (e.g. some web setups): no auto-scroll.
    }
  }

  function goToProfile(name: string) {
    if (!isAuthorNavigable(name)) return;
    router.push({ pathname: '/user/[name]', params: { name } });
  }

  // Settings §4: three-dot menu (edit/delete), only for the incident's own author.
  function openEdit() {
    setEditTitle(inc!.title);
    setEditDescription(inc!.description);
    setEditCategory(inc!.category);
    setMenuOpen(false);
    setEditOpen(true);
  }

  function saveEdit() {
    if (!editCategory || !editTitle.trim()) return;
    updateIncident(inc!.id, {
      title: editTitle.trim(),
      description: editDescription.trim(),
      category: editCategory,
    });
    setEditOpen(false);
  }

  function confirmDelete() {
    setMenuOpen(false);
    Alert.alert(t('deleteConfirmTitle'), t('deleteConfirmBody'), [
      { text: t('menuCancel'), style: 'cancel' },
      {
        text: t('deleteConfirmDelete'),
        style: 'destructive',
        onPress: () => {
          deleteIncident(inc!.id);
          router.replace('/');
        },
      },
    ]);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void reload()} />}
      >
        {/* Report photos (swipe between them), or a plain header without photos */}
        <View style={[styles.hero, inc.photos.length > 0 && styles.heroWithPhoto]}>
          {inc.photos.length > 0 && (
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={StyleSheet.absoluteFill}>
              {inc.photos.map((uri) => (
                <Image key={uri} source={{ uri }} style={[styles.heroPhoto, { width }]} />
              ))}
            </ScrollView>
          )}
          {inc.photos.length > 0 && <View style={styles.heroShade} pointerEvents="none" />}
          <View style={styles.heroTopRow}>
            <Pressable onPress={() => router.back()} hitSlop={10}>
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </Pressable>
            {/* Settings §4: the three-dot menu (edit/delete) only shows for the
                incident's own author; other users see no action here at all. */}
            {inc.isMine && (
              <Pressable onPress={() => setMenuOpen(true)} hitSlop={10}>
                <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
              </Pressable>
            )}
          </View>
          <View style={styles.heroCatBadge}>
            <Ionicons name={cat.icon as any} size={22} color={cat.color} />
          </View>
        </View>

        <View style={styles.content}>
          {/* Main card: title -> description -> location/user/status -> actions */}
          <View style={styles.card}>
            {inc.isMine && (
              <View style={styles.mineTag}>
                <Ionicons name="person" size={13} color={Colors.primary} />
                <Text style={styles.mineText}>{t('mineTag')}</Text>
              </View>
            )}
            <Text style={styles.title}>{inc.title}</Text>
            {inc.status === 'declined' && inc.resolution ? (
              // The decline reason replaces the original description on the card,
              // shown as a quote box with the council's literal text.
              <View style={styles.closureQuote}>
                <Text style={styles.closureQuoteText}>&ldquo;{inc.resolution.note}&rdquo;</Text>
              </View>
            ) : (
              <Text style={styles.description}>{inc.description}</Text>
            )}

            {/* Location, author and status on the same row, visible near the top */}
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={14} color={Colors.textMuted} />
                <Text style={styles.metaText} numberOfLines={1}>
                  {inc.address}
                  {municipality ? ` · ${municipality.name}` : ''}
                </Text>
              </View>
              <Pressable
                style={styles.metaItem}
                disabled={!isAuthorNavigable(inc.createdBy)}
                onPress={() => goToProfile(inc.createdBy)}>
                <Ionicons name="person-outline" size={14} color={Colors.textMuted} />
                <Text
                  style={[styles.metaText, isAuthorNavigable(inc.createdBy) && styles.metaTextLink]}
                  numberOfLines={1}>
                  {inc.createdBy} · {inc.date}
                </Text>
              </Pressable>
              <StatusBadge status={inc.status} size="sm" />
            </View>

            <View style={styles.statsRow}>
              <Pressable
                style={styles.statItem}
                onPress={() => guard(t('reasonLike'), () => toggleLike(inc.id))}>
                <Ionicons
                  name={inc.liked ? 'heart' : 'heart-outline'}
                  size={17}
                  color={inc.liked ? Colors.danger : Colors.textMuted}
                />
                <Text style={[styles.statText, inc.liked && { color: Colors.danger }]}>{inc.likes}</Text>
              </Pressable>
              {inc.status !== 'declined' && (
                <Pressable
                  style={styles.statItem}
                  onPress={() => guard(t('reasonWatch'), () => toggleWatch(inc.id))}>
                  <Ionicons
                    name={inc.watching ? 'notifications' : 'notifications-outline'}
                    size={16}
                    color={inc.watching ? Colors.primary : Colors.textMuted}
                  />
                  <Text style={[styles.statText, inc.watching && { color: Colors.primary }]}>
                    {inc.watching ? t('statFollowing') : t('statFollow')}
                  </Text>
                </Pressable>
              )}
              <Pressable style={styles.statItem} onPress={goToComments}>
                <Ionicons name="chatbubble-outline" size={16} color={Colors.textMuted} />
                <Text style={styles.statText}>{inc.commentsCount}</Text>
              </Pressable>
              <Pressable style={[styles.statItem, styles.statItemEnd]} onPress={onShare}>
                <Ionicons name="share-social-outline" size={16} color={Colors.textMuted} />
                <Text style={styles.statText}>{t('statShare')}</Text>
              </Pressable>
            </View>
          </View>

          {/* Tracking: horizontal flow of the main track */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('trackingTitle')}</Text>
            <View style={styles.hFlowRow}>
              {STATUS_WORKFLOW_ORDER.map((step, i) => {
                const reached = inc.history.some((h) => h.status === step);
                const isCurrent = inc.status === step;
                const cfg = STATUS_CONFIG[step];
                const nextReached =
                  i < STATUS_WORKFLOW_ORDER.length - 1 &&
                  inc.history.some((h) => h.status === STATUS_WORKFLOW_ORDER[i + 1]);
                return (
                  <Fragment key={step}>
                    <View style={styles.hFlowStepCol}>
                      <View
                        style={[
                          styles.hFlowDot,
                          reached && { backgroundColor: cfg.color },
                          isCurrent && styles.hFlowDotCurrent,
                        ]}>
                        {reached && <Ionicons name="checkmark" size={14} color="#fff" />}
                      </View>
                      <Text
                        style={[styles.hFlowLabel, reached && styles.hFlowLabelReached]}
                        numberOfLines={2}>
                        {statusLabel(step)}
                      </Text>
                    </View>
                    {i < STATUS_WORKFLOW_ORDER.length - 1 && (
                      <View style={[styles.hFlowLine, nextReached && { backgroundColor: cfg.color }]} />
                    )}
                  </Fragment>
                );
              })}
            </View>
            {inc.history[inc.history.length - 1]?.note && (
              <Text style={styles.hFlowNote}>{inc.history[inc.history.length - 1].note}</Text>
            )}
          </View>

          {/* RF-013 / CU-004: citizen verification of the closure */}
          {inc.status === 'resolved' && inc.isMine && (
            <>
              {inc.verification ? (
                <View style={styles.verificationConfirmCard}>
                  <Ionicons
                    name={inc.verification.result === 'verified' ? 'checkmark-circle' : 'alert-circle'}
                    size={20}
                    color={inc.verification.result === 'verified' ? Colors.success : Colors.danger}
                  />
                  <Text
                    style={[
                      styles.verificationConfirmText,
                      { color: inc.verification.result === 'verified' ? Colors.success : Colors.danger },
                    ]}>
                    {inc.verification.result === 'verified'
                      ? `${t('verifiedOn')} ${inc.verification.date}`
                      : t('reopenedNotResolved')}
                  </Text>
                </View>
              ) : (
                <View style={styles.verificationCard}>
                  <Text style={styles.verificationTitle}>{t('verificationQuestion')}</Text>
                  <Text style={styles.verificationBody}>{t('verificationBody')}</Text>
                  <View style={styles.verificationActions}>
                    <Pressable
                      style={styles.verificationBtnFilled}
                      onPress={() => verifyResolution(inc.id, 'verified')}>
                      <Text style={styles.verificationBtnFilledText}>{t('verificationYes')}</Text>
                    </Pressable>
                    <Pressable
                      style={styles.verificationBtnOutline}
                      onPress={() => verifyResolution(inc.id, 'not_resolved')}>
                      <Text style={styles.verificationBtnOutlineText}>{t('verificationNo')}</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </>
          )}

          {/* Reactivation: only for declined reports (reuses RF-005 "reopen"), with
              the same visual structure (title + body + two buttons) as "¿Se resolvió
              correctamente?". reopen() now really reopens the report. */}
          {inc.status === 'declined' && !reactivationDismissed && (
            <View style={styles.reactivateCard}>
              <Text style={styles.reactivateTitle}>{t('reactivateQuestion')}</Text>
              <Text style={styles.reactivateBody}>
                {t('reactivateBody').replace('{likes}', String(inc.likes))}
              </Text>
              <View style={styles.verificationActions}>
                <Pressable
                  style={styles.reactivateBtnFilled}
                  onPress={() => guard(t('reasonReactivate'), () => reopen(inc.id))}>
                  <Text style={styles.verificationBtnFilledText}>{t('reactivateYes')}</Text>
                </Pressable>
                <Pressable style={styles.reactivateBtnOutline} onPress={() => setReactivationDismissed(true)}>
                  <Text style={styles.reactivateBtnOutlineText}>{t('reactivateNo')}</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Comments, YouTube-like structure: avatar + author + date + text + like */}
          <View style={styles.card} ref={commentsRef}>
            <Text style={styles.cardTitle}>{t('commentsTitle')} ({inc.commentsCount})</Text>
            {inc.comments.length === 0 && <Text style={styles.muted}>{t('firstComment')}</Text>}
            {sortedComments.map((c) => (
              <View
                key={c.id}
                style={[styles.comment, c.isMunicipality && styles.commentCouncil]}>
                <View style={styles.commentHead}>
                  <View
                    style={[
                      styles.commentAvatar,
                      { backgroundColor: c.isMunicipality ? Colors.primary : avatarColor(c.author) },
                    ]}>
                    {c.isMunicipality ? (
                      <Ionicons name="shield-checkmark" size={14} color="#fff" />
                    ) : (
                      <Text style={styles.commentAvatarText}>{initials(c.author)}</Text>
                    )}
                  </View>
                  <Pressable disabled={!isAuthorNavigable(c.author)} onPress={() => goToProfile(c.author)}>
                    <Text
                      style={[
                        styles.commentAuthor,
                        c.isMunicipality && { color: Colors.primary },
                        isAuthorNavigable(c.author) && styles.metaTextLink,
                      ]}>
                      {c.author}
                    </Text>
                  </Pressable>
                  <Text style={styles.commentDate}>· {c.date}</Text>
                </View>
                <Text style={styles.commentText}>{c.text}</Text>
                <Pressable
                  style={styles.commentLike}
                  onPress={() => guard(t('reasonCommentLike'), () => toggleCommentLike(inc.id, c.id))}>
                  <Ionicons
                    name={c.likedByMe ? 'heart' : 'heart-outline'}
                    size={16}
                    color={c.likedByMe ? Colors.danger : Colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.commentLikeText,
                      c.likedByMe && { color: Colors.danger, fontFamily: FontFamily.bold },
                    ]}>
                    {c.likes}
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Comment box */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder={t('commentPlaceholder')}
          placeholderTextColor={Colors.textMuted}
          value={text}
          onChangeText={setText}
          multiline
        />
        <Pressable style={styles.sendBtn} onPress={onSendComment}>
          <Ionicons name="send" size={20} color="#fff" />
        </Pressable>
      </View>

      <SignupSheet
        visible={pending !== null}
        reason={reason}
        knownName={publicName}
        onClose={() => setPending(null)}
        onRegister={(name, phoneNumber) => {
          login(name, phoneNumber);
          pending?.();
          setPending(null);
        }}
      />

      {/* Settings §4: three-dot action sheet — edit / delete (own incidents only) */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setMenuOpen(false)}>
          <Pressable style={styles.menuSheet} onPress={() => {}}>
            <Pressable style={styles.menuRow} onPress={openEdit}>
              <Ionicons name="create-outline" size={20} color={Colors.text} />
              <Text style={styles.menuRowText}>{t('menuEdit')}</Text>
            </Pressable>
            <View style={styles.menuDivider} />
            <Pressable style={styles.menuRow} onPress={confirmDelete}>
              <Ionicons name="trash-outline" size={20} color={Colors.danger} />
              <Text style={[styles.menuRowText, { color: Colors.danger }]}>{t('menuDelete')}</Text>
            </Pressable>
            <View style={styles.menuDivider} />
            <Pressable style={styles.menuRow} onPress={() => setMenuOpen(false)}>
              <Text style={[styles.menuRowText, { textAlign: 'center', flex: 1, color: Colors.textMuted }]}>
                {t('menuCancel')}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Settings §4: edit modal — title, category, description */}
      <Modal visible={editOpen} animationType="slide" onRequestClose={() => setEditOpen(false)}>
        <View style={styles.editContainer}>
          <View style={styles.editHeader}>
            <Pressable onPress={() => setEditOpen(false)} hitSlop={10}>
              <Ionicons name="chevron-back" size={22} color={Colors.text} />
            </Pressable>
            <Text style={styles.editHeaderTitle}>{t('editModalTitle')}</Text>
            <View style={{ width: 22 }} />
          </View>
          <ScrollView contentContainerStyle={styles.editBody}>
            <Text style={styles.label}>{t('labelCategory')}</Text>
            <View style={styles.catRow}>
              {(Object.keys(CATEGORY_CONFIG) as IncidentCategory[]).map((c) => {
                const selected = editCategory === c;
                return (
                  <Pressable
                    key={c}
                    style={[styles.catChip, selected && styles.catChipSel]}
                    onPress={() => setEditCategory(c)}>
                    <Ionicons
                      name={CATEGORY_CONFIG[c].icon as any}
                      size={15}
                      color={selected ? '#fff' : CATEGORY_CONFIG[c].color}
                    />
                    <Text style={[styles.catChipText, selected && { color: '#fff' }]}>{categoryLabel(c)}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.label}>{t('labelDescription')}</Text>
            <TextInput
              style={styles.editTitleInput}
              value={editTitle}
              onChangeText={setEditTitle}
            />
            <TextInput
              style={styles.editDescriptionInput}
              value={editDescription}
              onChangeText={setEditDescription}
              multiline
            />
            <Pressable style={styles.submitBtn} onPress={saveEdit}>
              <Text style={styles.submitBtnText}>{t('saveChanges')}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { backgroundColor: Colors.background, paddingBottom: Spacing.xl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hero: { height: 150, backgroundColor: Colors.primary },
  heroWithPhoto: { height: 240 },
  heroPhoto: { height: '100%' },
  heroShade: { position: 'absolute', top: 0, left: 0, right: 0, height: 90, backgroundColor: 'rgba(0,0,0,0.25)' },
  heroTopRow: {
    position: 'absolute',
    top: 44,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroCatBadge: {
    position: 'absolute',
    bottom: -20,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.card,
  },
  content: {
    padding: Spacing.lg,
    marginTop: -18, // exact overlap from the mockup (don't use -Radius.xl / -24)
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    backgroundColor: Colors.background,
    paddingTop: Spacing.xl + 8,
    gap: Spacing.md,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    ...Shadow.card,
  },
  mineTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: Colors.primarySoft,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: Radius.pill,
    marginBottom: Spacing.sm,
  },
  mineText: { color: Colors.primary, fontFamily: FontFamily.labelBold, fontSize: Font.small },
  title: { fontSize: Font.title, fontFamily: FontFamily.extrabold, color: Colors.text, lineHeight: 25 },
  description: {
    fontSize: Font.body,
    color: Colors.text,
    fontFamily: FontFamily.regular,
    lineHeight: 20,
    marginTop: Spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '100%' },
  metaText: { fontSize: Font.small, color: Colors.textMuted, fontFamily: FontFamily.regular },
  metaTextLink: { color: Colors.primary, fontFamily: FontFamily.medium },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    marginTop: Spacing.md,
  },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statItemEnd: { marginLeft: 'auto' },
  statText: { fontSize: Font.small, fontFamily: FontFamily.medium, color: Colors.textMuted },
  cardTitle: { fontSize: Font.subtitle, fontFamily: FontFamily.bold, color: Colors.text, marginBottom: Spacing.lg },
  hFlowRow: { flexDirection: 'row', alignItems: 'flex-start' },
  hFlowStepCol: { alignItems: 'center', width: 60 },
  hFlowDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hFlowDotCurrent: { borderWidth: 2, borderColor: Colors.text },
  hFlowLabel: {
    fontSize: 11,
    fontFamily: FontFamily.medium,
    color: Colors.textMuted,
    marginTop: 6,
    textAlign: 'center',
  },
  hFlowLabelReached: { color: Colors.text, fontFamily: FontFamily.semibold },
  hFlowLine: { flex: 1, height: 2, backgroundColor: Colors.border, marginTop: 13 },
  hFlowNote: {
    fontSize: Font.small,
    fontFamily: FontFamily.regular,
    color: Colors.textMuted,
    marginTop: Spacing.md,
  },
  closureQuote: {
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  closureQuoteText: {
    fontSize: Font.body,
    fontFamily: FontFamily.regular,
    color: Colors.text,
    lineHeight: 20,
  },
  verificationCard: {
    backgroundColor: Colors.success + '14',
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  verificationTitle: { fontSize: Font.subtitle, fontFamily: FontFamily.bold, color: Colors.text, marginBottom: 4 },
  verificationBody: {
    fontSize: Font.small,
    fontFamily: FontFamily.regular,
    color: Colors.text,
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  verificationActions: { flexDirection: 'row', gap: Spacing.sm },
  verificationBtnFilled: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.md,
    backgroundColor: Colors.success,
    alignItems: 'center',
  },
  verificationBtnFilledText: { color: '#fff', fontFamily: FontFamily.bold, fontSize: Font.small },
  verificationBtnOutline: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.success,
    alignItems: 'center',
  },
  verificationBtnOutlineText: { color: Colors.success, fontFamily: FontFamily.bold, fontSize: Font.small },
  verificationConfirmCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.success + '33',
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  verificationConfirmText: { fontSize: Font.small, fontFamily: FontFamily.medium, color: Colors.text, flex: 1 },
  reactivateCard: {
    backgroundColor: Colors.primarySoft,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  reactivateTitle: { fontSize: Font.subtitle, fontFamily: FontFamily.bold, color: Colors.text, marginBottom: 4 },
  reactivateBody: {
    fontSize: Font.small,
    fontFamily: FontFamily.regular,
    color: Colors.text,
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  reactivateBtnFilled: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  reactivateBtnOutline: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center',
  },
  reactivateBtnOutlineText: { color: Colors.primary, fontFamily: FontFamily.bold, fontSize: Font.small },
  comment: {
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  commentCouncil: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    backgroundColor: Colors.primarySoft,
    padding: Spacing.md,
  },
  commentHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  commentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentAvatarText: { color: '#fff', fontSize: 11, fontFamily: FontFamily.bold },
  commentAuthor: { fontFamily: FontFamily.bold, color: Colors.text, fontSize: Font.small },
  commentDate: { color: Colors.textMuted, fontSize: Font.small, fontFamily: FontFamily.regular },
  commentText: { fontSize: Font.body, color: Colors.text, fontFamily: FontFamily.regular, lineHeight: 19, marginLeft: 36 },
  commentLike: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 6,
    marginLeft: 36,
  },
  commentLikeText: { fontSize: Font.small, color: Colors.textMuted, fontFamily: FontFamily.medium },
  muted: { color: Colors.textMuted, fontSize: Font.body, fontFamily: FontFamily.regular },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: Font.body,
    fontFamily: FontFamily.regular,
    color: Colors.text,
    maxHeight: 100,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuBackdrop: { flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' },
  menuSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxl,
  },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md },
  menuRowText: { fontSize: Font.body, fontFamily: FontFamily.medium, color: Colors.text },
  menuDivider: { height: 1, backgroundColor: Colors.border },
  editContainer: { flex: 1, backgroundColor: Colors.surface },
  editHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.lg,
  },
  editHeaderTitle: { fontSize: Font.subtitle, fontFamily: FontFamily.bold, color: Colors.text },
  editBody: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  label: {
    fontSize: Font.small,
    fontFamily: FontFamily.labelBold,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: Spacing.sm,
  },
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
  editTitleInput: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    padding: Spacing.md,
    fontSize: Font.bodyLg,
    fontFamily: FontFamily.semibold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  editDescriptionInput: {
    minHeight: 100,
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
  submitBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 15,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  submitBtnText: { color: '#fff', fontFamily: FontFamily.bold, fontSize: Font.body },
});
