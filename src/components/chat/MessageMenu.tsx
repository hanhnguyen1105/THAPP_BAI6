import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Message, REACTIONS } from '../../services/types';
import { colors, radius, shadow } from '../../theme';
import { Icon, IconName } from '../Icon';

/** Menu khi nhấn giữ một tin: hàng cảm xúc + Trả lời / Sao chép / Thu hồi. */
export function MessageMenu({
  message,
  myUid,
  onClose,
  onReact,
  onReply,
  onCopy,
  onRecall,
}: {
  message: Message | null;
  myUid: string;
  onClose: () => void;
  onReact: (message: Message, emoji: string) => void;
  onReply: (message: Message) => void;
  onCopy: (message: Message) => void;
  onRecall: (message: Message) => void;
}) {
  const mine = message?.senderId === myUid;
  const myReaction = message?.reactions?.[myUid];
  const run = (fn: (m: Message) => void) => () => {
    if (message) {
      onClose();
      fn(message);
    }
  };

  return (
    <Modal visible={!!message} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <View style={styles.emojiRow}>
            {REACTIONS.map(emoji => (
              <Pressable
                key={emoji}
                onPress={run(m => onReact(m, emoji))}
                style={[styles.emojiBtn, myReaction === emoji && styles.emojiActive]}
                accessibilityLabel={`Thả cảm xúc ${emoji}`}>
                <Text style={styles.emoji}>{emoji}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.actions}>
            <Action icon="reply" label="Trả lời" onPress={run(onReply)} />
            {message?.type === 'text' && (
              <Action icon="copy" label="Sao chép" onPress={run(onCopy)} />
            )}
            {mine && (
              <Action icon="recall" label="Thu hồi tin nhắn" danger onPress={run(onRecall)} />
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Action({
  icon,
  label,
  danger,
  onPress,
}: {
  icon: IconName;
  label: string;
  danger?: boolean;
  onPress: () => void;
}) {
  const color = danger ? colors.danger : colors.text;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}>
      <Icon name={icon} size={18} color={color} />
      <Text style={[styles.actionText, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(43,33,36,0.35)',
    justifyContent: 'center',
    padding: 28,
  },
  sheet: { gap: 10 },
  emojiRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 6,
    ...shadow,
  },
  emojiBtn: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  emojiActive: { backgroundColor: colors.primarySoft },
  emoji: { fontSize: 26 },
  actions: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: 6,
    ...shadow,
  },
  action: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingVertical: 13 },
  actionPressed: { backgroundColor: colors.surfaceAlt },
  actionText: { fontSize: 15, fontWeight: '600' },
});
