import { ReactNode, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, shadow } from '../theme';
import { BrandMark } from './AppHeader';
import { Icon, IconName } from './Icon';

/** Khung chung của màn Đăng nhập / Đăng ký: logo, lời chào, công tắc 2 tab. */
export function AuthLayout({
  mode,
  greeting,
  onSwitch,
  children,
}: {
  mode: 'login' | 'register';
  greeting: string;
  onSwitch: () => void;
  children: ReactNode;
}) {
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.logoWrap}>
            <BrandMark size={84} />
            <View style={styles.logoHeart}>
              <Icon name="heart" size={14} color={colors.tertiary} fill={colors.tertiary} />
            </View>
          </View>
          <Text style={styles.brand}>PinkyChat</Text>
          <Text style={styles.greeting}>{greeting}</Text>

          <View style={styles.switch}>
            <SwitchTab
              label="Đăng nhập"
              icon="login"
              active={mode === 'login'}
              onPress={mode === 'login' ? undefined : onSwitch}
            />
            <SwitchTab
              label="Đăng ký"
              icon="userPlus"
              active={mode === 'register'}
              onPress={mode === 'register' ? undefined : onSwitch}
            />
          </View>

          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SwitchTab({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: IconName;
  active: boolean;
  onPress?: () => void;
}) {
  const color = active ? colors.textOnPrimary : colors.primaryDeep;
  return (
    <Pressable
      onPress={onPress}
      style={[styles.switchTab, active && styles.switchTabActive]}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}>
      <Icon name={icon} size={17} color={color} />
      <Text style={[styles.switchLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

export function ErrorBanner({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <View style={styles.bannerIcon}>
        <Icon name="alert" size={18} color={colors.tertiary} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.bannerTitle}>Thông báo nhỏ</Text>
        <Text style={styles.bannerBody}>{message}</Text>
      </View>
      <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Đóng thông báo">
        <Icon name="close" size={18} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

export function Field({
  label,
  icon,
  hint,
  secure,
  ...inputProps
}: TextInputProps & { label: string; icon: IconName; hint?: string; secure?: boolean }) {
  const [hidden, setHidden] = useState(true);
  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Icon name={icon} size={15} color={colors.primaryDeep} />
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <View style={styles.inputBox}>
        <TextInput
          {...inputProps}
          secureTextEntry={secure && hidden}
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
        {secure ? (
          <Pressable
            onPress={() => setHidden(h => !h)}
            hitSlop={10}
            accessibilityLabel={hidden ? 'Hiện mật khẩu' : 'Ẩn mật khẩu'}>
            <Icon name={hidden ? 'eye' : 'eyeOff'} size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  loading,
  icon = 'heart',
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  icon?: IconName;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [styles.button, (pressed || loading) && styles.buttonPressed]}>
      <Text style={styles.buttonLabel}>{loading ? 'Đang xử lý...' : label}</Text>
      {!loading && (
        <Icon name={icon} size={18} color={colors.textOnPrimary} fill={colors.textOnPrimary} />
      )}
    </Pressable>
  );
}

export const authStyles = StyleSheet.create({
  footerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  footerText: { color: colors.textMuted, fontSize: 13 },
  footerLink: { color: colors.primaryDeep, fontSize: 13, fontWeight: '700' },
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 20, paddingBottom: 40 },
  logoWrap: { alignSelf: 'center', marginTop: 12 },
  logoHeart: {
    position: 'absolute',
    right: -2,
    bottom: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  brand: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginTop: 14,
  },
  greeting: { fontSize: 14, color: colors.textBody, textAlign: 'center', marginTop: 4 },
  switch: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    padding: 4,
    marginTop: 24,
    marginBottom: 16,
  },
  switchTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    borderRadius: radius.pill,
  },
  switchTabActive: { backgroundColor: colors.primaryDeep },
  switchLabel: { fontSize: 15, fontWeight: '700' },
  banner: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: colors.secondarySoft,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 16,
  },
  bannerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  bannerBody: { fontSize: 13, color: colors.tertiary, marginTop: 2, lineHeight: 18 },
  field: { marginBottom: 14 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, flex: 1 },
  hint: { fontSize: 11, color: colors.textMuted },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: { flex: 1, fontSize: 15, color: colors.text, paddingVertical: 0 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 54,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    marginTop: 8,
    ...shadow,
  },
  buttonPressed: { opacity: 0.8 },
  buttonLabel: { color: colors.textOnPrimary, fontSize: 17, fontWeight: '700' },
});
