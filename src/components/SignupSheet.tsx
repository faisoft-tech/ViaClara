import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useT } from '@/i18n/useT';
import { Colors, FontFamily, Radius, Spacing } from '@/theme/tokens';

type Step = 'welcome' | 'phone' | 'otp' | 'name';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 28;

// Staggered express signup: only appears when a social action requires it.
// Real flow (simulated, no backend): Welcome -> Phone -> SMS code -> Public name.
export function SignupSheet({
  visible,
  reason,
  onClose,
  onRegister,
}: {
  visible: boolean;
  reason?: string;
  onClose: () => void;
  onRegister: (publicName: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const t = useT();
  const [step, setStep] = useState<Step>('welcome');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [sending, setSending] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(RESEND_SECONDS);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const otpInputRef = useRef<TextInput>(null);

  // Every time the sheet reopens, restart the flow from the beginning.
  useEffect(() => {
    if (visible) {
      setStep('welcome');
      setPhone('');
      setOtp('');
      setName('');
      setSending(false);
      setResendSeconds(RESEND_SECONDS);
    }
    return () => clearTimeout(timeoutRef.current);
  }, [visible]);

  // Countdown to allow resending the code, while on the OTP step.
  useEffect(() => {
    if (step !== 'otp') return;
    const interval = setInterval(() => {
      setResendSeconds((s) => {
        if (s <= 1) {
          clearInterval(interval);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [step]);

  const phoneValid = phone.replace(/\D/g, '').length >= 9;
  const otpValid = otp.length === OTP_LENGTH;

  function sendCode() {
    if (!phoneValid) return;
    setSending(true);
    timeoutRef.current = setTimeout(() => {
      setSending(false);
      setOtp('');
      setResendSeconds(RESEND_SECONDS);
      setStep('otp');
    }, 700);
  }

  function resendCode() {
    if (resendSeconds > 0) return;
    setOtp('');
    setResendSeconds(RESEND_SECONDS);
  }

  function verifyCode() {
    if (!otpValid) return;
    setStep('name');
  }

  const nameValid = name.trim().length >= 2;

  function confirmName() {
    if (!nameValid) return;
    onRegister(name.trim());
  }

  const welcomeBody =
    reason ?? 'Reporta lo que ves. Sigue lo que importa. Mejora tu ciudad, entre todos.';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}>
      {step === 'welcome' && (
        <View style={styles.splash}>
          <View style={styles.splashCircleTop} />
          <View style={styles.splashCircleBottom} />

          <View style={styles.splashIconWrap}>
            <Ionicons name="megaphone" size={52} color="#fff" />
          </View>
          <Text style={styles.splashTitle}>ViaClara</Text>
          <Text style={styles.splashBody}>{welcomeBody}</Text>

          <View style={styles.splashActions}>
            <Pressable style={styles.splashPrimaryBtn} onPress={() => setStep('phone')}>
              <Text style={styles.splashPrimaryText}>Continuar con mi número</Text>
            </Pressable>
            <Pressable onPress={onClose} hitSlop={8}>
              <Text style={styles.splashLink}>Ya tengo cuenta</Text>
            </Pressable>
          </View>
        </View>
      )}

      {step === 'phone' && (
        <View
          style={[
            styles.screen,
            { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing.xxl },
          ]}>
          <Pressable style={styles.backBtn} hitSlop={10} onPress={() => setStep('welcome')}>
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </Pressable>

          <Text style={styles.title}>¿Cuál es tu número?</Text>
          <Text style={styles.body}>
            Te enviamos un código por SMS para verificar tu cuenta. Sin correo, sin contraseñas.
          </Text>

          <View style={styles.phoneRow}>
            <View style={styles.prefix}>
              <Text style={styles.prefixText}>+34</Text>
            </View>
            <TextInput
              style={[styles.phoneInput, !phone && styles.inputBorderMuted]}
              placeholder="600 000 000"
              placeholderTextColor={Colors.textMuted}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              maxLength={16}
              autoFocus
            />
          </View>

          <View style={styles.spacer}>
            <Text style={styles.hint}>
              Tu número solo se usa para verificarte y nunca se muestra públicamente.
            </Text>
          </View>

          <Pressable
            style={[styles.primaryBtn, !phoneValid && styles.primaryBtnDisabled]}
            disabled={!phoneValid || sending}
            onPress={sendCode}>
            <Text style={styles.primaryText}>{sending ? 'Enviando…' : 'Enviar código'}</Text>
          </Pressable>
        </View>
      )}

      {step === 'otp' && (
        <View
          style={[
            styles.screen,
            { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing.xxl },
          ]}>
          <Pressable style={styles.backBtn} hitSlop={10} onPress={() => setStep('phone')}>
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </Pressable>

          <Text style={styles.title}>Ingresa el código</Text>
          <Text style={styles.body}>
            Enviamos un SMS al <Text style={styles.bodyStrong}>+34 {phone}</Text>
          </Text>

          <Pressable style={styles.otpBoxRow} onPress={() => otpInputRef.current?.focus()}>
            {Array.from({ length: OTP_LENGTH }).map((_, i) => (
              <View key={i} style={[styles.otpBox, otp.length > i && styles.otpBoxFilled]}>
                <Text style={styles.otpDigit}>{otp[i] ?? ''}</Text>
              </View>
            ))}
          </Pressable>
          <TextInput
            ref={otpInputRef}
            style={styles.otpHiddenInput}
            keyboardType="number-pad"
            value={otp}
            onChangeText={(t) => setOtp(t.replace(/\D/g, '').slice(0, OTP_LENGTH))}
            maxLength={OTP_LENGTH}
            autoFocus
          />

          <View style={styles.spacer}>
            <Pressable onPress={resendCode} hitSlop={8} disabled={resendSeconds > 0}>
              <Text style={[styles.resend, resendSeconds > 0 && styles.resendMuted]}>
                ¿No llegó? Reenviar código
                {resendSeconds > 0 ? ` (0:${String(resendSeconds).padStart(2, '0')})` : ''}
              </Text>
            </Pressable>
          </View>

          <Pressable
            style={[styles.primaryBtn, !otpValid && styles.primaryBtnDisabled]}
            disabled={!otpValid}
            onPress={verifyCode}>
            <Text style={styles.primaryText}>Verificar</Text>
          </Pressable>
        </View>
      )}

      {step === 'name' && (
        <View
          style={[
            styles.screen,
            { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing.xxl },
          ]}>
          <Text style={styles.title}>{t('signupNameTitle')}</Text>
          <Text style={styles.body}>{t('signupNameBody')}</Text>

          <TextInput
            style={[styles.phoneInput, !name && styles.inputBorderMuted, { marginBottom: 16 }]}
            placeholder={t('signupNamePlaceholder')}
            placeholderTextColor={Colors.textMuted}
            value={name}
            onChangeText={setName}
            maxLength={30}
            autoFocus
          />

          <View style={styles.spacer} />

          <Pressable
            style={[styles.primaryBtn, !nameValid && styles.primaryBtnDisabled]}
            disabled={!nameValid}
            onPress={confirmName}>
            <Text style={styles.primaryText}>{t('signupNameCta')}</Text>
          </Pressable>
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  // --- Screen 1: welcome ---
  splash: {
    flex: 1,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl + Spacing.sm,
    overflow: 'hidden',
  },
  splashCircleTop: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  splashCircleBottom: {
    position: 'absolute',
    bottom: 120,
    left: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  splashIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  splashTitle: {
    fontSize: 34,
    lineHeight: 39,
    fontFamily: FontFamily.semibold,
    color: '#fff',
    letterSpacing: -0.7,
    textAlign: 'center',
    marginBottom: 10,
  },
  splashBody: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: FontFamily.regular,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    maxWidth: 280,
    marginBottom: 56,
  },
  splashActions: {
    width: '100%',
    alignItems: 'center',
    gap: 14,
  },
  splashPrimaryBtn: {
    width: '100%',
    paddingVertical: 15,
    borderRadius: Radius.md,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashPrimaryText: {
    fontSize: 16,
    fontFamily: FontFamily.semibold,
    color: Colors.primary,
  },
  splashLink: {
    fontSize: 14,
    fontFamily: FontFamily.medium,
    color: 'rgba(255,255,255,0.9)',
  },

  // --- Screens 2 and 3: phone / OTP ---
  screen: {
    flex: 1,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.xl,
  },
  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: 28,
  },
  title: {
    fontSize: 26,
    lineHeight: 31,
    fontFamily: FontFamily.semibold,
    color: Colors.text,
    marginBottom: 10,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: FontFamily.regular,
    color: Colors.textMuted,
    marginBottom: 32,
  },
  bodyStrong: { color: Colors.text, fontFamily: FontFamily.semibold },
  spacer: { flex: 1, justifyContent: 'flex-end' },

  phoneRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  prefix: {
    width: 64,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prefixText: { fontFamily: FontFamily.medium, fontSize: 15, color: Colors.text },
  phoneInput: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    fontFamily: FontFamily.medium,
    fontSize: 15,
    color: Colors.text,
  },
  inputBorderMuted: { borderColor: Colors.borderStrong },
  hint: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: FontFamily.regular,
    color: Colors.textMuted,
  },

  otpBoxRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  otpBox: {
    width: 44,
    height: 56,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxFilled: { borderColor: Colors.primary },
  otpDigit: {
    fontSize: 22,
    fontFamily: FontFamily.semibold,
    color: Colors.text,
  },
  otpHiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  resend: { fontSize: 13, fontFamily: FontFamily.medium, color: Colors.primary },
  resendMuted: { color: Colors.textMuted },

  primaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 15,
    borderRadius: Radius.md,
    marginTop: 24,
  },
  primaryBtnDisabled: { backgroundColor: Colors.border },
  primaryText: { color: '#fff', fontFamily: FontFamily.semibold, fontSize: 16 },
});
