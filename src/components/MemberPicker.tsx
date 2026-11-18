import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppUser } from '../services/types';
import { colors, radius, shadow } from '../theme';
import { matches } from '../utils/search';
import { UserAvatar } from './Avatar';
import { EmptyState } from './EmptyState';
import { Icon } from './Icon';
import { SearchBar } from './SearchBar';

/** Danh sách người dùng trong Danh bạ kèm checkbox để chọn thành viên. */
export function MemberPicker({
  users,
  selected,
  onToggle,
  header,
}: {
  users: AppUser[];
  selected: Set<string>;
  onToggle: (uid: string) => void;
  header?: React.ReactElement;
}) {
  const [search, setSearch] = useState('');
  const visible = useMemo(
    () => users.filter(u => matches(search, u.name, u.email)),
    [users, search],
  );

  return (
    <FlatList
      data={visible}
      keyExtractor={u => u.uid}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <View style={styles.header}>
          {header}
          <SearchBar value={search} onChangeText={setSearch} placeholder="Tìm trong danh bạ..." />
        </View>
      }
      renderItem={({ item }) => {
        const checked = selected.has(item.uid);
        return (
          <Pressable
            onPress={() => onToggle(item.uid)}
            style={[styles.row, checked && styles.rowChecked]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked }}>
            <UserAvatar user={item} size={44} showOnline />
            <View style={styles.info}>
              <Text style={styles.name} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.email} numberOfLines={1}>
                {item.email}
              </Text>
            </View>
            <View style={[styles.box, checked && styles.boxChecked]}>
              {checked && <Icon name="check" size={16} color={colors.textOnPrimary} strokeWidth={3} />}
            </View>
          </Pressable>
        );
      }}
      ListEmptyComponent={<EmptyState icon="contacts" title="Không có ai để chọn" />}
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: 120, gap: 8 },
  header: { gap: 12, marginBottom: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    padding: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'transparent',
    ...shadow,
  },
  rowChecked: { borderColor: colors.primary, backgroundColor: colors.secondarySoft },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  email: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  box: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.offline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxChecked: { backgroundColor: colors.primaryDeep, borderColor: colors.primaryDeep },
});
