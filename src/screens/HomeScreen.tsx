import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../components/AppHeader';
import { GroupAvatar, UserAvatar } from '../components/Avatar';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { SearchBar } from '../components/SearchBar';
import { useCurrentUid } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { RootStackParamList, TabParamList } from '../navigation/types';
import { RECALLED_TEXT } from '../services/chatService';
import { AppUser, ChatSummary } from '../services/types';
import { colors, radius, shadow } from '../theme';
import { matches } from '../utils/search';
import { formatRelative } from '../utils/time';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Home'>,
  NativeStackScreenProps<RootStackParamList>
>;

type Filter = 'all' | 'unread' | 'group';

export function HomeScreen({ navigation }: Props) {
  const uid = useCurrentUid();
  const { chats, users, usersById } = useData();
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');

  const list = useMemo(() => chats ?? [], [chats]);
  const titleOf = (c: ChatSummary) =>
    c.type === 'group' ? c.name ?? 'Nhóm' : usersById.get(c.partnerId ?? '')?.name ?? 'Người dùng';

  const counts = {
    all: list.length,
    unread: list.filter(c => c.unread > 0).length,
    group: list.filter(c => c.type === 'group').length,
  };

  // Danh sách đã được sắp xếp theo tin mới nhất (cả 1-1 và nhóm).
  const visible = list.filter(
    c =>
      (filter !== 'unread' || c.unread > 0) &&
      (filter !== 'group' || c.type === 'group') &&
      matches(search, titleOf(c), c.lastMessage),
  );

  // Hàng "đang hoạt động": người online lên trước.
  const people = useMemo(
    () => [...users].sort((a, b) => Number(b.online) - Number(a.online)).slice(0, 15),
    [users],
  );

  const openChat = (c: ChatSummary) =>
    navigation.navigate('Chat', c.type === 'group' ? { convId: c.convId } : { partnerId: c.partnerId });

  const openCompose = () =>
    Alert.alert('Tạo cuộc trò chuyện', undefined, [
      { text: 'Tạo nhóm mới', onPress: () => navigation.navigate('CreateGroup') },
      { text: 'Nhắn tin 1-1', onPress: () => navigation.navigate('Contacts') },
      { text: 'Hủy', style: 'cancel' },
    ]);

  const header = (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.people}>
        <Pressable style={styles.person} onPress={() => navigation.navigate('CreateGroup')}>
          <View style={styles.newGroup}>
            <Icon name="plus" size={24} color={colors.primaryDeep} />
          </View>
          <Text style={styles.personName} numberOfLines={1}>
            Tạo nhóm
          </Text>
        </Pressable>
        {people.map(u => (
          <Pressable
            key={u.uid}
            style={styles.person}
            onPress={() => navigation.navigate('Chat', { partnerId: u.uid })}>
            <UserAvatar user={u} size={54} showOnline ring={u.online} />
            <Text style={styles.personName} numberOfLines={1}>
              {u.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.chips}>
        <Chip label={`Tất cả (${counts.all})`} active={filter === 'all'} onPress={() => setFilter('all')} />
        <Chip
          label={`Chưa đọc (${counts.unread})`}
          active={filter === 'unread'}
          onPress={() => setFilter('unread')}
        />
        <Chip label={`Nhóm (${counts.group})`} active={filter === 'group'} onPress={() => setFilter('group')} />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader
        title="Đoạn Chat"
        right={
          <Pressable
            onPress={() => {
              setShowSearch(s => !s);
              setSearch('');
            }}
            hitSlop={8}
            style={styles.headerBtn}
            accessibilityLabel="Tìm kiếm">
            <Icon name={showSearch ? 'close' : 'search'} size={21} color={colors.primaryDeep} />
          </Pressable>
        }
      />
      {showSearch && (
        <SearchBar value={search} onChangeText={setSearch} placeholder="Tìm cuộc trò chuyện..." />
      )}

      {chats === null ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={item => item.convId}
          ListHeaderComponent={header}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <ChatRow
              item={item}
              title={titleOf(item)}
              myUid={uid}
              usersById={usersById}
              onPress={() => openChat(item)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="message"
              title={search || filter !== 'all' ? 'Không có cuộc trò chuyện phù hợp' : 'Chưa có cuộc trò chuyện'}
              body={
                search || filter !== 'all'
                  ? undefined
                  : 'Chọn một người ở trên hoặc nhấn nút ✏️ để nhắn tin / tạo nhóm.'
              }
            />
          }
        />
      )}

      <Pressable style={styles.fab} onPress={openCompose} accessibilityLabel="Tạo cuộc trò chuyện mới">
        <Icon name="pencil" size={22} color={colors.textOnPrimary} />
      </Pressable>
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

function ChatRow({
  item,
  title,
  myUid,
  usersById,
  onPress,
}: {
  item: ChatSummary;
  title: string;
  myUid: string;
  usersById: Map<string, AppUser>;
  onPress: () => void;
}) {
  const unread = item.unread > 0;
  const isGroup = item.type === 'group';
  const fromMe = item.lastSenderId === myUid;

  // Tiền tố người gửi: "Bạn: ..." hoặc (trong nhóm) "Minh Thảo: ...". Tin hệ thống / thu hồi thì không.
  let prefix = '';
  if (item.lastType !== 'system' && item.lastMessage !== RECALLED_TEXT) {
    if (fromMe) {
      prefix = 'Bạn: ';
    } else if (isGroup) {
      prefix = `${usersById.get(item.lastSenderId)?.name ?? 'Ai đó'}: `;
    }
  }

  const partner = usersById.get(item.partnerId ?? '');

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      {isGroup ? (
        <GroupAvatar members={[usersById.get(item.lastSenderId)]} size={52} />
      ) : (
        <UserAvatar user={partner} size={52} showOnline />
      )}
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={styles.rowName} numberOfLines={1}>
            {title}
          </Text>
          {isGroup && (
            <View style={styles.groupTag}>
              <Text style={styles.groupTagText}>Nhóm</Text>
            </View>
          )}
          <Text style={[styles.rowTime, unread && styles.rowTimeUnread]}>
            {formatRelative(item.updatedAt)}
          </Text>
        </View>
        <View style={styles.rowBottom}>
          <Text
            style={[
              styles.rowPreview,
              unread && styles.rowPreviewUnread,
              item.lastMessage === RECALLED_TEXT && styles.rowPreviewRecalled,
            ]}
            numberOfLines={1}>
            {prefix}
            {item.lastMessage}
          </Text>
          {unread && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.unread > 99 ? '99+' : item.unread}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  loader: { marginTop: 40 },
  headerBtn: { padding: 6 },
  list: { paddingHorizontal: 16, paddingBottom: 96, gap: 10 },
  people: { gap: 14, paddingVertical: 12 },
  person: { alignItems: 'center', width: 62 },
  personName: { fontSize: 11, color: colors.textBody, marginTop: 4, fontWeight: '600' },
  newGroup: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  chip: {
    paddingHorizontal: 14,
    height: 32,
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
  },
  chipActive: { backgroundColor: colors.primaryDeep },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.textBody },
  chipTextActive: { color: colors.textOnPrimary },
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
  rowBody: { flex: 1 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowName: { flexShrink: 1, fontSize: 16, fontWeight: '700', color: colors.text },
  groupTag: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  groupTagText: { fontSize: 10, fontWeight: '700', color: colors.primaryDeep },
  rowTime: { marginLeft: 'auto', fontSize: 11, color: colors.textMuted },
  rowTimeUnread: { color: colors.tertiary, fontWeight: '700' },
  rowBottom: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  rowPreview: { flex: 1, fontSize: 13, color: colors.textMuted },
  rowPreviewUnread: { color: colors.text, fontWeight: '700' },
  rowPreviewRecalled: { fontStyle: 'italic' },
  badge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    backgroundColor: colors.primaryDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: colors.textOnPrimary, fontSize: 11, fontWeight: '700' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
    shadowOpacity: 0.25,
    elevation: 6,
  },
});
