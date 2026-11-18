import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MemberPicker } from '../components/MemberPicker';
import { ScreenHeader } from '../components/ScreenHeader';
import { useAuth, useCurrentUid } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { RootStackParamList } from '../navigation/types';
import { subscribeConversation } from '../services/chatService';
import { addMembers } from '../services/groupService';
import { Conversation } from '../services/types';
import { colors, radius, shadow } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'AddMembers'>;

export function AddMembersScreen({ navigation, route }: Props) {
  const { convId } = route.params;
  const uid = useCurrentUid();
  const { profile } = useAuth();
  const { users } = useData();
  const [conv, setConv] = useState<Conversation | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(
    () => subscribeConversation(convId, setConv, () => navigation.popToTop()),
    [convId, navigation],
  );

  const candidates = users.filter(u => !conv?.members[u.uid]);

  const toggle = (id: string) =>
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

  const handleAdd = async () => {
    if (!conv || selected.size === 0) {
      return;
    }
    setSaving(true);
    try {
      await addMembers(
        conv,
        { uid, name: profile?.name ?? 'Bạn' },
        candidates.filter(u => selected.has(u.uid)).map(u => ({ uid: u.uid, name: u.name })),
      );
      navigation.goBack();
    } catch {
      setSaving(false);
      Alert.alert('Lỗi', 'Không thêm được thành viên.');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader title="Thêm thành viên" onBack={() => navigation.goBack()} />
      {conv === null ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      ) : (
        <View style={styles.flex}>
          <MemberPicker
            users={candidates}
            selected={selected}
            onToggle={toggle}
            header={<View style={styles.spacer} />}
          />
          <View style={styles.footer}>
            <Pressable
              onPress={handleAdd}
              disabled={selected.size === 0 || saving}
              style={[styles.button, (selected.size === 0 || saving) && styles.buttonDisabled]}>
              {saving ? (
                <ActivityIndicator color={colors.textOnPrimary} />
              ) : (
                <Text style={styles.buttonText}>Thêm {selected.size} người vào nhóm</Text>
              )}
            </Pressable>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: colors.background },
  loader: { marginTop: 40 },
  spacer: { height: 4 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16 },
  button: {
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryDeep,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  buttonDisabled: { backgroundColor: colors.offline },
  buttonText: { color: colors.textOnPrimary, fontSize: 16, fontWeight: '700' },
});
