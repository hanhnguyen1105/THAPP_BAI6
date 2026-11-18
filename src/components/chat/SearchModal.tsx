import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchAllMessages } from '../../services/chatService';
import { AppUser, Message } from '../../services/types';
import { colors, radius } from '../../theme';
import { normalize } from '../../utils/search';
import { formatClock, formatDayLabel } from '../../utils/time';
import { EmptyState } from '../EmptyState';
import { Icon } from '../Icon';

/** Phần C – tìm kiếm nội dung tin nhắn trong một cuộc trò chuyện. */
export function SearchModal({
  visible,
  convId,
  myUid,
  usersById,
  onClose,
  onSelect,
}: {
  visible: boolean;
  convId: string;
  myUid: string;
  usersById: Map<string, AppUser>;
  onClose: () => void;
  onSelect: (message: Message) => void;
}) {
  const [all, setAll] = useState<Message[] | null>(null);
  const [keyword, setKeyword] = useState('');

  // Mỗi lần mở: tải toàn bộ tin (một lần, không lắng nghe) để tìm cả tin chưa cuộn tới.
  useEffect(() => {
    if (!visible) {
      return;
    }
    let cancelled = false;
    setAll(null);
    setKeyword('');
    fetchAllMessages(convId)
      .then(list => !cancelled && setAll(list))
      .catch(() => !cancelled && setAll([]));
    return () => {
      cancelled = true;
    };
  }, [visible, convId]);

  const results = useMemo(() => {
    const q = normalize(keyword);
    if (!q || !all) {
      return [];
    }
    return all
      .filter(m => m.type === 'text' && !m.recalled && normalize(m.text ?? '').includes(q))
      .reverse();
  }, [all, keyword]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={10} style={styles.back} accessibilityLabel="Đóng">
            <Icon name="back" size={22} color={colors.primaryDeep} />
          </Pressable>
          <View style={styles.inputBox}>
            <Icon name="search" size={17} color={colors.textMuted} />
            <TextInput
              value={keyword}
              onChangeText={setKeyword}
              placeholder="Tìm trong cuộc trò chuyện..."
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              autoFocus
              autoCorrect={false}
              returnKeyType="search"
            />
          </View>
        </View>

        {all === null ? (
          <ActivityIndicator style={styles.loader} color={colors.primary} />
        ) : (
          <FlatList
            data={results}
            keyExtractor={m => m.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.list}
            ListHeaderComponent={
              keyword.trim() ? (
                <Text style={styles.count}>{results.length} kết quả</Text>
              ) : undefined
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => onSelect(item)}
                style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
                <View style={styles.itemTop}>
                  <Text style={styles.sender} numberOfLines={1}>
                    {item.senderId === myUid ? 'Bạn' : usersById.get(item.senderId)?.name ?? 'Người dùng'}
                  </Text>
                  <Text style={styles.time}>
                    {formatDayLabel(item.createdAt)} · {formatClock(item.createdAt)}
                  </Text>
                </View>
                <Text style={styles.text} numberOfLines={2}>
                  {item.text}
                </Text>
              </Pressable>
            )}
            ListEmptyComponent={
              keyword.trim() ? (
                <EmptyState icon="search" title="Không tìm thấy tin nhắn nào" />
              ) : (
                <EmptyState icon="search" title="Nhập từ khoá để tìm tin nhắn" />
              )
            }
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  back: { padding: 4 },
  inputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 42,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
  },
  input: { flex: 1, fontSize: 15, color: colors.text, paddingVertical: 0 },
  loader: { marginTop: 40 },
  list: { padding: 16, gap: 8 },
  count: { fontSize: 12, color: colors.textMuted, marginBottom: 4 },
  item: { padding: 12, borderRadius: radius.md, backgroundColor: colors.surface },
  pressed: { opacity: 0.8 },
  itemTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sender: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.primaryDeep },
  time: { fontSize: 11, color: colors.textMuted },
  text: { fontSize: 14, color: colors.text, marginTop: 3 },
});
