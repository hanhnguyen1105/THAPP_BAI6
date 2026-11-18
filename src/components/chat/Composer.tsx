import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius } from '../../theme';
import { Icon, IconName } from '../Icon';

/** Khung soạn tin: thanh "đang trả lời", nút Ảnh / Vị trí, ô nhập và nút gửi. */
export function Composer({
  text,
  onChangeText,
  onSend,
  onPickImage,
  onSendLocation,
  sendingLocation,
  placeholder,
  replyLabel,
  replyPreview,
  onCancelReply,
}: {
  text: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onPickImage: () => void;
  onSendLocation: () => void;
  sendingLocation: boolean;
  placeholder: string;
  replyLabel?: string;
  replyPreview?: string;
  onCancelReply: () => void;
}) {
  const canSend = text.trim().length > 0;
  return (
    <View style={styles.wrap}>
      {replyLabel ? (
        <View style={styles.replyBar}>
          <Icon name="reply" size={16} color={colors.primaryDeep} />
          <View style={styles.flex}>
            <Text style={styles.replyTitle} numberOfLines={1}>
              Đang trả lời {replyLabel}
            </Text>
            <Text style={styles.replyText} numberOfLines={1}>
              {replyPreview}
            </Text>
          </View>
          <Pressable onPress={onCancelReply} hitSlop={10} accessibilityLabel="Hủy trả lời">
            <Icon name="close" size={18} color={colors.textMuted} />
          </Pressable>
        </View>
      ) : null}

      <View style={styles.chips}>
        <Chip icon="camera" label="Ảnh" onPress={onPickImage} />
        <Chip
          icon="pin"
          label={sendingLocation ? 'Đang lấy vị trí...' : 'Vị trí'}
          onPress={onSendLocation}
          loading={sendingLocation}
        />
      </View>

      <View style={styles.inputRow}>
        <TextInput
          value={text}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          multiline
          maxLength={2000}
        />
        <Pressable
          onPress={onSend}
          disabled={!canSend}
          style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
          accessibilityLabel="Gửi tin nhắn"
          accessibilityState={{ disabled: !canSend }}>
          <Icon name="send" size={18} color={colors.textOnPrimary} />
        </Pressable>
      </View>
    </View>
  );
}

function Chip({
  icon,
  label,
  onPress,
  loading,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  loading?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
      accessibilityLabel={label}>
      {loading ? (
        <ActivityIndicator size="small" color={colors.primaryDeep} />
      ) : (
        <Icon name={icon} size={15} color={colors.primaryDeep} />
      )}
      <Text style={styles.chipText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
  wrap: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
  },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 8,
    marginBottom: 8,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
  },
  replyTitle: { fontSize: 12, fontWeight: '700', color: colors.primaryDeep },
  replyText: { fontSize: 12, color: colors.textBody },
  chips: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.textBody },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderRadius: 22,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 15,
    color: colors.text,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: colors.offline },
});
