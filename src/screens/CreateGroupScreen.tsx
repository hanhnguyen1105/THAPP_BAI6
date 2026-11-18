import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MemberPicker } from '../components/MemberPicker';
import { ScreenHeader } from '../components/ScreenHeader';
import { useAuth, useCurrentUid } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { RootStackParamList } from '../navigation/types';
import { createGroup, MIN_GROUP_MEMBERS } from '../services/groupService';
import { colors, radius, shadow } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateGroup'>;

export function CreateGroupScreen({ navigation }: Props) {
  const uid = useCurrentUid();
  const { profile } = useAuth();
  const { users } = useData();
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

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

  const enough = selected.size >= MIN_GROUP_MEMBERS;
  const canCreate = name.trim().length > 0 && enough && !saving;

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Thiếu tên nhóm', 'Vui lòng đặt tên cho nhóm.');
      return;
    }
    if (!enough) {
      Alert.alert('Chưa đủ thành viên', `Hãy chọn ít nhất ${MIN_GROUP_MEMBERS} người ngoài bạn.`);
      return;
    }
    setSaving(true);
    try {
      const convId = await createGroup(
        { uid, name: profile?.name ?? 'Bạn' },
        name,
        [...selected],
      );
      navigation.replace('Chat', { convId });
    } catch (e) {
      setSaving(false);
      Alert.alert('Không tạo được nhóm', (e as Error)?.message ?? 'Vui lòng thử lại.');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader title="Tạo nhóm mới" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <MemberPicker
          users={users}
          selected={selected}
          onToggle={toggle}
          header={
            <View style={styles.top}>
              <Text style={styles.label}>Tên nhóm</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Ví dụ: Nhóm đồ án React Native"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                maxLength={60}
              />
              <Text style={[styles.hint, enough && styles.hintOk]}>
                Đã chọn {selected.size} người · cần tối thiểu {MIN_GROUP_MEMBERS} người ngoài bạn
              </Text>
            </View>
          }
        />
        <View style={styles.footer}>
          <Pressable
            onPress={handleCreate}
            disabled={!canCreate}
            style={[styles.button, !canCreate && styles.buttonDisabled]}>
            {saving ? (
              <ActivityIndicator color={colors.textOnPrimary} />
            ) : (
              <Text style={styles.buttonText}>Tạo nhóm ({selected.size + 1} người)</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: colors.background },
  top: { paddingHorizontal: 16, paddingTop: 16 },
  label: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 8 },
  input: {
    height: 50,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 15,
    color: colors.text,
  },
  hint: { fontSize: 12, color: colors.textMuted, marginTop: 8 },
  hintOk: { color: colors.online, fontWeight: '600' },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    backgroundColor: colors.background,
  },
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
