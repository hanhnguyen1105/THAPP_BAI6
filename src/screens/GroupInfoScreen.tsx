import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GroupAvatar, UserAvatar } from '../components/Avatar';
import { Icon, IconName } from '../components/Icon';
import { ScreenHeader } from '../components/ScreenHeader';
import { useAuth, useCurrentUid } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { RootStackParamList } from '../navigation/types';
import { subscribeConversation } from '../services/chatService';
import { leaveGroup, removeMember, renameGroup } from '../services/groupService';
import { Conversation } from '../services/types';
import { colors, radius, shadow } from '../theme';
import { formatPresence } from '../utils/time';

type Props = NativeStackScreenProps<RootStackParamList, 'GroupInfo'>;

/** Phần C – quản trị nhóm: đổi tên, thêm / xóa thành viên, rời nhóm. */
export function GroupInfoScreen({ navigation, route }: Props) {
  const { convId } = route.params;
  const uid = useCurrentUid();
  const { profile } = useAuth();
  const { usersById } = useData();
  const me = { uid, name: profile?.name ?? 'Bạn' };

  const [conv, setConv] = useState<Conversation | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  useEffect(
    () =>
      subscribeConversation(
        convId,
        c => (c && c.members[uid] ? setConv(c) : navigation.popToTop()),
        () => navigation.popToTop(),
      ),
    [convId, uid, navigation],
  );

  if (!conv) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      </SafeAreaView>
    );
  }

  const isAdmin = conv.createdBy === uid;
  const memberIds = Object.keys(conv.members).sort((a, b) =>
    a === conv.createdBy ? -1 : b === conv.createdBy ? 1 : 0,
  );

  const saveName = async () => {
    setEditing(false);
    try {
      await renameGroup(conv, me, draft);
    } catch {
      Alert.alert('Lỗi', 'Không đổi được tên nhóm.');
    }
  };

  const confirmRemove = (targetUid: string) => {
    const target = { uid: targetUid, name: usersById.get(targetUid)?.name ?? 'Người dùng' };
    Alert.alert('Xóa thành viên', `Xóa ${target.name} khỏi nhóm?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () =>
          removeMember(conv, me, target).catch(() =>
            Alert.alert('Lỗi', 'Không xóa được thành viên.'),
          ),
      },
    ]);
  };

  const confirmLeave = () =>
    Alert.alert('Rời nhóm', `Bạn sẽ không nhận được tin nhắn từ "${conv.name}" nữa.`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Rời nhóm',
        style: 'destructive',
        onPress: async () => {
          // Đóng các màn của nhóm trước, để listener không báo lỗi quyền sau khi rời.
          navigation.popToTop();
          try {
            await leaveGroup(conv, me);
          } catch {
            Alert.alert('Lỗi', 'Không rời được nhóm. Vui lòng thử lại.');
          }
        },
      },
    ]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader title="Thông tin nhóm" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.top}>
          <GroupAvatar
            members={memberIds.filter(id => id !== uid).map(id => usersById.get(id))}
            size={84}
          />
          {editing ? (
            <View style={styles.editRow}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                style={styles.nameInput}
                autoFocus
                maxLength={60}
                onSubmitEditing={saveName}
                returnKeyType="done"
              />
              <Pressable onPress={saveName} style={styles.saveBtn} accessibilityLabel="Lưu tên nhóm">
                <Icon name="check" size={18} color={colors.textOnPrimary} />
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={styles.nameRow}
              onPress={() => {
                setDraft(conv.name ?? '');
                setEditing(true);
              }}
              accessibilityLabel="Đổi tên nhóm">
              <Text style={styles.name}>{conv.name}</Text>
              <Icon name="pencil" size={16} color={colors.primaryDeep} />
            </Pressable>
          )}
          <Text style={styles.sub}>{memberIds.length} thành viên</Text>
        </View>

        <View style={styles.card}>
          <ActionRow
            icon="userPlus"
            label="Thêm thành viên"
            onPress={() => navigation.navigate('AddMembers', { convId })}
          />
          <ActionRow icon="logout" label="Rời nhóm" danger onPress={confirmLeave} last />
        </View>

        <Text style={styles.section}>Thành viên</Text>
        <View style={styles.card}>
          {memberIds.map((id, i) => {
            const user = usersById.get(id);
            return (
              <View key={id} style={[styles.member, i < memberIds.length - 1 && styles.divider]}>
                <UserAvatar user={user} size={42} showOnline />
                <View style={styles.flex}>
                  <Text style={styles.memberName} numberOfLines={1}>
                    {id === uid ? `${user?.name ?? 'Bạn'} (Bạn)` : user?.name ?? 'Người dùng'}
                  </Text>
                  <Text style={styles.memberSub}>
                    {formatPresence(user?.online ?? false, user?.lastSeen)}
                  </Text>
                </View>
                {id === conv.createdBy && (
                  <View style={styles.adminTag}>
                    <Text style={styles.adminText}>Trưởng nhóm</Text>
                  </View>
                )}
                {isAdmin && id !== uid && (
                  <Pressable
                    onPress={() => confirmRemove(id)}
                    hitSlop={8}
                    accessibilityLabel={`Xóa ${user?.name ?? ''} khỏi nhóm`}>
                    <Icon name="userMinus" size={20} color={colors.danger} />
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionRow({
  icon,
  label,
  onPress,
  danger,
  last,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  danger?: boolean;
  last?: boolean;
}) {
  const color = danger ? colors.danger : colors.primaryDeep;
  return (
    <Pressable onPress={onPress} style={[styles.action, !last && styles.divider]}>
      <View style={styles.actionIcon}>
        <Icon name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.actionText, danger && { color: colors.danger }]}>{label}</Text>
      <Icon name="next" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: colors.background },
  loader: { marginTop: 40 },
  scroll: { padding: 16, paddingBottom: 32 },
  top: { alignItems: 'center', marginBottom: 20 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  name: { fontSize: 22, fontWeight: '700', color: colors.text },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, alignSelf: 'stretch' },
  nameInput: {
    flex: 1,
    height: 46,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    fontSize: 16,
    color: colors.text,
  },
  saveBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primaryDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sub: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  section: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 20, marginBottom: 10 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, ...shadow },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  action: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
  member: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  memberName: { fontSize: 15, fontWeight: '600', color: colors.text },
  memberSub: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  adminTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  adminText: { fontSize: 10, fontWeight: '700', color: colors.primaryDeep },
});
