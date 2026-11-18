import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../components/AppHeader';
import { UserAvatar } from '../components/Avatar';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { SearchBar } from '../components/SearchBar';
import { useData } from '../context/DataContext';
import { RootStackParamList } from '../navigation/types';
import { AppUser } from '../services/types';
import { colors, radius, shadow } from '../theme';
import { formatPresence } from '../utils/time';
import { matches } from '../utils/search';

type Filter = 'all' | 'online';

export function ContactsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { users: allUsers, chats } = useData();
  // chats === null nghĩa là dữ liệu chưa tải xong lần đầu.
  const users = chats === null && allUsers.length === 0 ? null : allUsers;
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const onlineCount = users?.filter(u => u.online).length ?? 0;

  const visible = useMemo(() => {
    const list = (users ?? []).filter(u => matches(search, u.name, u.email));
    const filtered = filter === 'online' ? list.filter(u => u.online) : list;
    // Người đang online lên trước.
    return [...filtered].sort((a, b) => Number(b.online) - Number(a.online));
  }, [users, search, filter]);

  const openChat = (user: AppUser) =>
    navigation.navigate('Chat', { partnerId: user.uid });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader
        title="Danh bạ"
        right={
          <Pressable
            onPress={() => navigation.navigate('CreateGroup')}
            style={styles.groupBtn}
            accessibilityLabel="Tạo nhóm mới">
            <Icon name="userPlus" size={15} color={colors.primaryDeep} />
            <Text style={styles.groupBtnText}>Tạo nhóm</Text>
          </Pressable>
        }
      />
      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder="Tìm kiếm bạn bè trong hệ thống..."
      />

      <View style={styles.segment}>
        <SegmentButton
          label="Tất cả"
          count={users?.length ?? 0}
          active={filter === 'all'}
          onPress={() => setFilter('all')}
        />
        <SegmentButton
          label="Đang online"
          count={onlineCount}
          active={filter === 'online'}
          onPress={() => setFilter('online')}
          dot
        />
      </View>

      {users === null ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={item => item.uid}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => <ContactRow user={item} onPress={() => openChat(item)} />}
          ListEmptyComponent={
            <EmptyState
              icon="contacts"
              title={search ? 'Không tìm thấy ai' : 'Chưa có người dùng nào'}
              body={
                search
                  ? 'Thử tìm bằng tên hoặc email khác nhé.'
                  : 'Hãy rủ bạn bè đăng ký PinkyChat để bắt đầu trò chuyện.'
              }
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

function SegmentButton({
  label,
  count,
  active,
  onPress,
  dot,
}: {
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
  dot?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.segBtn, active && styles.segBtnActive]}>
      {dot && <View style={styles.segDot} />}
      <Text style={[styles.segLabel, active && styles.segLabelActive]}>{label}</Text>
      <View style={[styles.segCount, active && styles.segCountActive]}>
        <Text style={[styles.segCountText, active && styles.segLabelActive]}>{count}</Text>
      </View>
    </Pressable>
  );
}

function ContactRow({ user, onPress }: { user: AppUser; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityLabel={`Nhắn tin với ${user.name}`}>
      <UserAvatar user={user} size={50} showOnline />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {user.name}
        </Text>
        <Text style={styles.email} numberOfLines={1}>
          {user.email}
        </Text>
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: user.online ? colors.online : colors.offline },
            ]}
          />
          <Text style={[styles.status, user.online && styles.statusOnline]}>
            {user.online ? 'Online' : formatPresence(false, user.lastSeen)}
          </Text>
        </View>
      </View>
      <View style={[styles.cta, !user.online && styles.ctaOffline]}>
        <Text style={styles.ctaText}>Nhắn tin</Text>
        <Icon name="message" size={14} color={colors.primaryDeep} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  groupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  groupBtnText: { fontSize: 12, fontWeight: '700', color: colors.primaryDeep },
  loader: { marginTop: 40 },
  segment: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 6,
    padding: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
  },
  segBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 36,
    borderRadius: radius.pill,
  },
  segBtnActive: { backgroundColor: colors.primaryDeep },
  segDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.online },
  segLabel: { fontSize: 13, fontWeight: '600', color: colors.textBody },
  segLabelActive: { color: colors.textOnPrimary },
  segCount: {
    minWidth: 20,
    paddingHorizontal: 6,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  segCountActive: { backgroundColor: colors.primary },
  segCountText: { fontSize: 11, fontWeight: '700', color: colors.textBody },
  list: { padding: 16, paddingTop: 10, gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    ...shadow,
  },
  pressed: { opacity: 0.85 },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: colors.text },
  email: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  status: { fontSize: 11, color: colors.textMuted },
  statusOnline: { color: colors.online, fontWeight: '600' },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  ctaOffline: { backgroundColor: colors.surfaceAlt },
  ctaText: { fontSize: 12, fontWeight: '600', color: colors.primaryDeep },
});
