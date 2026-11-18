import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../components/AppHeader';
import { UserAvatar } from '../components/Avatar';
import { EmptyState } from '../components/EmptyState';
import { Icon, IconName } from '../components/Icon';
import { useCurrentUid } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { RootStackParamList, TabParamList } from '../navigation/types';
import { markAllNotificationsRead, markNotificationRead } from '../services/notificationService';
import { AppNotification, AppUser } from '../services/types';
import { colors, radius, shadow } from '../theme';
import { formatRelative } from '../utils/time';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Notifications'>,
  NativeStackScreenProps<RootStackParamList>
>;

type Filter = 'all' | 'unread';

const typeIcon: Record<AppNotification['type'], IconName> = {
  message: 'messageSquare',
  group_added: 'userPlus',
  reaction: 'heart',
};

function titleOf(n: AppNotification, from?: AppUser) {
  const name = from?.name ?? 'Ai đó';
  switch (n.type) {
    case 'group_added':
      return 'Bạn được thêm vào nhóm';
    case 'reaction':
      return `${name} đã thả cảm xúc`;
    default:
      return `Tin nhắn mới từ ${name}`;
  }
}

export function NotificationsScreen({ navigation }: Props) {
  const uid = useCurrentUid();
  const { notifications, usersById, unreadNotifications } = useData();
  const [filter, setFilter] = useState<Filter>('all');

  const items = (notifications ?? []).filter(n => filter === 'all' || !n.read);

  const open = (n: AppNotification) => {
    if (!n.read) {
      markNotificationRead(uid, n.id).catch(() => undefined);
    }
    // Thông báo luôn gắn với một cuộc trò chuyện đã tồn tại → mở thẳng bằng convId.
    navigation.navigate('Chat', { convId: n.convId });
  };

  const markAll = () => {
    const ids = (notifications ?? []).filter(n => !n.read).map(n => n.id);
    markAllNotificationsRead(uid, ids).catch(() =>
      Alert.alert('Lỗi', 'Không cập nhật được thông báo.'),
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Thông Báo" />

      <View style={styles.toolbar}>
        <Chip
          label={`Tất cả (${notifications?.length ?? 0})`}
          active={filter === 'all'}
          onPress={() => setFilter('all')}
        />
        <Chip
          label={`Chưa đọc (${unreadNotifications})`}
          active={filter === 'unread'}
          onPress={() => setFilter('unread')}
        />
        <View style={styles.flex} />
        <Pressable
          onPress={markAll}
          disabled={unreadNotifications === 0}
          hitSlop={8}
          style={[styles.markAll, unreadNotifications === 0 && styles.disabled]}
          accessibilityLabel="Đánh dấu tất cả đã đọc">
          <Icon name="checkAll" size={15} color={colors.primaryDeep} />
          <Text style={styles.markAllText}>Đọc tất cả</Text>
        </Pressable>
      </View>

      {notifications === null ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={n => n.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const from = usersById.get(item.fromUid);
            return (
              <Pressable
                onPress={() => open(item)}
                style={({ pressed }) => [
                  styles.card,
                  item.read && styles.cardRead,
                  pressed && styles.pressed,
                ]}>
                <View>
                  <UserAvatar user={from} size={46} />
                  <View style={styles.typeBadge}>
                    <Icon name={typeIcon[item.type]} size={11} color={colors.textOnPrimary} />
                  </View>
                </View>
                <View style={styles.body}>
                  <View style={styles.titleRow}>
                    <Text style={[styles.title, !item.read && styles.bold]} numberOfLines={1}>
                      {titleOf(item, from)}
                    </Text>
                    <Text style={styles.time}>{formatRelative(item.createdAt)}</Text>
                  </View>
                  <Text style={styles.text} numberOfLines={2}>
                    {item.text}
                  </Text>
                </View>
                {!item.read && <View style={styles.unreadDot} />}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              icon="bell"
              title={filter === 'unread' ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo nào'}
              body="Tin nhắn mới, lời mời vào nhóm và cảm xúc sẽ hiện ở đây."
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: colors.background },
  loader: { marginTop: 40 },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  chip: {
    paddingHorizontal: 12,
    height: 30,
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
  },
  chipActive: { backgroundColor: colors.primaryDeep },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.textBody },
  chipTextActive: { color: colors.textOnPrimary },
  markAll: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  disabled: { opacity: 0.4 },
  markAllText: { fontSize: 12, fontWeight: '700', color: colors.primaryDeep },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    ...shadow,
  },
  cardRead: { backgroundColor: colors.surfaceAlt, shadowOpacity: 0, elevation: 0 },
  pressed: { opacity: 0.85 },
  typeBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  body: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontSize: 14, color: colors.text },
  bold: { fontWeight: '700' },
  time: { fontSize: 11, color: colors.textMuted },
  text: { fontSize: 13, color: colors.textBody, marginTop: 3, lineHeight: 18 },
  unreadDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primaryDeep },
});
