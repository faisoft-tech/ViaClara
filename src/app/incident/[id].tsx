import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  findNodeHandle,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from 'react-native';

import { SignupSheet } from '@/components/SignupSheet';
import { StatusBadge } from '@/components/StatusBadge';
import { MUNICIPALITIES } from '@/data/incidents';
import { useStore } from '@/data/store';
import {
  CATEGORY_CONFIG,
  Colors,
  Font,
  FontFamily,
  IncidentStatus,
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

// The "declined" track is an alternative terminal branch that can skip
// intermediate steps of the main track (e.g. "in_progress"). The segment of
// the timeline representing that skip is drawn dashed instead of solid.
function isSkippedSegment(current: IncidentStatus, next: IncidentStatus) {
  if (next !== 'declined') return false;
  const idx = STATUS_WORKFLOW_ORDER.indexOf(current);
  return idx >= 0 && idx < STATUS_WORKFLOW_ORDER.length - 2;
}

export default function IncidentDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    incidents,
    isRegistered,
    login,
    toggleLike,
    toggleWatch,
    reopen,
    addComment,
    verifyResolution,
    toggleCommentLike,
  } = useStore();
  const inc = incidents.find((i) => i.id === id);

  const [text, setText] = useState('');
  const [pending, setPending] = useState<null | (() => void)>(null);
  const [reason, setReason] = useState<string>();
  const [reactivationDismissed, setReactivationDismissed] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const commentsRef = useRef<View>(null);

  if (!inc) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Aviso no encontrado.</Text>
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
      message: `${inc!.title} — síguelo en ViaClara (${inc!.address}, Almuñécar)`,
    });
  }

  function onSendComment() {
    if (!text.trim()) return;
    guard('Para comentar necesitas una cuenta.', () => {
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

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Main report image (placeholder: the demo doesn't upload real photos) */}
        <View style={styles.hero}>
          <View style={styles.heroTopRow}>
            <Pressable onPress={() => router.back()} hitSlop={10}>
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </Pressable>
            <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
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
                <Text style={styles.mineText}>Tu aviso</Text>
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
                onPress={() => guard('Para apoyar avisos necesitas una cuenta.', () => toggleLike(inc.id))}>
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
                  onPress={() => guard('Para seguir avisos necesitas una cuenta.', () => toggleWatch(inc.id))}>
                  <Ionicons
                    name={inc.watching ? 'notifications' : 'notifications-outline'}
                    size={16}
                    color={inc.watching ? Colors.primary : Colors.textMuted}
                  />
                  <Text style={[styles.statText, inc.watching && { color: Colors.primary }]}>
                    {inc.watching ? 'Siguiendo' : 'Seguir'}
                  </Text>
                </Pressable>
              )}
              <Pressable style={styles.statItem} onPress={goToComments}>
                <Ionicons name="chatbubble-outline" size={16} color={Colors.textMuted} />
                <Text style={styles.statText}>{inc.comments.length}</Text>
              </Pressable>
              <Pressable style={[styles.statItem, styles.statItemEnd]} onPress={onShare}>
                <Ionicons name="share-social-outline" size={16} color={Colors.textMuted} />
                <Text style={styles.statText}>Compartir</Text>
              </Pressable>
            </View>
          </View>

          {/* Tracking: vertical timeline */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Seguimiento</Text>
            {inc.history.map((entry, i) => {
              const s = STATUS_CONFIG[entry.status as IncidentStatus];
              const isLast = i === inc.history.length - 1;
              const next = inc.history[i + 1]?.status as IncidentStatus | undefined;
              const skipped = !isLast && next ? isSkippedSegment(entry.status as IncidentStatus, next) : false;
              return (
                <View key={`${entry.status}-${i}`} style={styles.timelineRow}>
                  <View style={styles.timelineDotCol}>
                    <View style={[styles.timelineDot, { backgroundColor: s.color }]} />
                    {!isLast &&
                      (skipped ? (
                        <View style={styles.timelineLineDashed} />
                      ) : (
                        <View style={[styles.timelineLine, { backgroundColor: s.color }]} />
                      ))}
                  </View>
                  <View style={{ paddingBottom: isLast ? 0 : Spacing.lg }}>
                    <Text style={styles.timelineLabel}>
                      {s.label}
                      {entry.status === 'declined' ? ' · cierre alternativo' : ''}
                    </Text>
                    <Text style={styles.timelineDate}>{entry.date}</Text>
                    {entry.note && <Text style={styles.timelineNote}>{entry.note}</Text>}
                  </View>
                </View>
              );
            })}
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
                      ? `Verificado el ${inc.verification.date}`
                      : 'Marcado como no resuelto, reabierto'}
                  </Text>
                </View>
              ) : (
                <View style={styles.verificationCard}>
                  <Text style={styles.verificationTitle}>¿Se resolvió correctamente?</Text>
                  <Text style={styles.verificationBody}>
                    El ayuntamiento marcó este aviso como resuelto. Confirma si el problema
                    realmente desapareció.
                  </Text>
                  <View style={styles.verificationActions}>
                    <Pressable
                      style={styles.verificationBtnFilled}
                      onPress={() => verifyResolution(inc.id, 'verified')}>
                      <Text style={styles.verificationBtnFilledText}>Sí, confirmar</Text>
                    </Pressable>
                    <Pressable
                      style={styles.verificationBtnOutline}
                      onPress={() => verifyResolution(inc.id, 'not_resolved')}>
                      <Text style={styles.verificationBtnOutlineText}>No, reabrir</Text>
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
              <Text style={styles.reactivateTitle}>¿Sigue existiendo el problema?</Text>
              <Text style={styles.reactivateBody}>
                {inc.likes} vecinos ya han apoyado este aviso. Si el problema continúa, pide
                que se reactive.
              </Text>
              <View style={styles.verificationActions}>
                <Pressable
                  style={styles.reactivateBtnFilled}
                  onPress={() =>
                    guard('Para pedir la reactivación necesitas una cuenta.', () => reopen(inc.id))
                  }>
                  <Text style={styles.verificationBtnFilledText}>Sí, sigue el problema</Text>
                </Pressable>
                <Pressable style={styles.reactivateBtnOutline} onPress={() => setReactivationDismissed(true)}>
                  <Text style={styles.reactivateBtnOutlineText}>No, ya no</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Comments, YouTube-like structure: avatar + author + date + text + like */}
          <View style={styles.card} ref={commentsRef}>
            <Text style={styles.cardTitle}>Comentarios ({inc.comments.length})</Text>
            {inc.comments.length === 0 && (
              <Text style={styles.muted}>Sé el primero en comentar.</Text>
            )}
            {inc.comments.map((c) => (
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
                  onPress={() =>
                    guard('Para valorar comentarios necesitas una cuenta.', () =>
                      toggleCommentLike(inc.id, c.id)
                    )
                  }>
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
          placeholder="Escribe un comentario…"
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
        onClose={() => setPending(null)}
        onRegister={(name) => {
          login(name);
          pending?.();
          setPending(null);
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { backgroundColor: Colors.background, paddingBottom: Spacing.xl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hero: { height: 150, backgroundColor: Colors.primary },
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
  timelineRow: { flexDirection: 'row', gap: Spacing.md },
  timelineDotCol: { alignItems: 'center' },
  timelineDot: { width: 12, height: 12, borderRadius: 6 },
  timelineLine: { width: 2, flex: 1, minHeight: 28 },
  timelineLineDashed: {
    width: 0,
    flex: 1,
    minHeight: 28,
    borderLeftWidth: 2,
    borderLeftColor: Colors.borderStrong,
    borderStyle: 'dashed',
  },
  timelineLabel: { fontSize: Font.small, fontFamily: FontFamily.semibold, color: Colors.text },
  timelineDate: { fontSize: 12, fontFamily: FontFamily.regular, color: Colors.textMuted, marginTop: 1 },
  timelineNote: { fontSize: Font.small, fontFamily: FontFamily.regular, color: Colors.textMuted, marginTop: 4 },
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
});
