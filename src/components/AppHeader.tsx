import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';
import { UserAvatar } from './Avatar';
import { Icon } from './Icon';

export function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <View
      style={[
        styles.brandMark,
        { width: size, height: size, borderRadius: size / 2 },
      ]}>
      <Icon
        name="messageSquare"
        size={size * 0.5}
        color={colors.textOnPrimary}
        fill={colors.textOnPrimary}
      />
    </View>
  );
}

/** Thanh tiêu đề dùng chung cho các tab: logo + tên màn hình + (nút phụ) + avatar của mình. */
export function AppHeader({ title, right }: { title: string; right?: ReactNode }) {
  const { profile } = useAuth();
  return (
    <View style={styles.header}>
      <BrandMark size={26} />
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      {right}
      <UserAvatar user={profile ?? undefined} size={38} ring />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  brandMark: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flex: 1, fontSize: 20, fontWeight: '700', color: colors.primaryDeep },
});
