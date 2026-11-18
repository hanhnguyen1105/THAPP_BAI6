import { Image, StyleSheet, View } from 'react-native';
import { avatarSource } from '../avatarAssets';
import { AppUser } from '../services/types';
import { colors } from '../theme';
import { Icon } from './Icon';

export function Avatar({
  avatar,
  photoUrl,
  size = 48,
  online,
  ring = false,
}: {
  avatar?: number;
  /** Ảnh đại diện riêng (Cloudinary) — ưu tiên hơn ảnh mẫu. */
  photoUrl?: string;
  size?: number;
  /** undefined = không hiện chấm trạng thái */
  online?: boolean;
  ring?: boolean;
}) {
  const dot = Math.max(10, Math.round(size * 0.26));
  return (
    <View style={{ width: size, height: size }}>
      <Image
        source={photoUrl ? { uri: photoUrl } : avatarSource(avatar)}
        style={[
          { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surfaceAlt },
          ring && styles.ring,
        ]}
      />
      {online !== undefined && (
        <View
          style={[
            styles.dot,
            {
              width: dot,
              height: dot,
              borderRadius: dot / 2,
              backgroundColor: online ? colors.online : colors.offline,
            },
          ]}
        />
      )}
    </View>
  );
}

/** Avatar của một người dùng (đã có trong danh bạ). */
export function UserAvatar({
  user,
  size,
  showOnline,
  ring,
}: {
  user?: AppUser;
  size?: number;
  showOnline?: boolean;
  ring?: boolean;
}) {
  return (
    <Avatar
      avatar={user?.avatar}
      photoUrl={user?.photoUrl}
      size={size}
      online={showOnline ? user?.online ?? false : undefined}
      ring={ring}
    />
  );
}

/** Avatar nhóm: ghép 2 ảnh thành viên chồng lên nhau. */
export function GroupAvatar({ members, size = 48 }: { members: (AppUser | undefined)[]; size?: number }) {
  const [a, b] = members;
  const small = Math.round(size * 0.68);
  if (!a) {
    return (
      <View style={[styles.groupFallback, { width: size, height: size, borderRadius: size / 2 }]}>
        <Icon name="contacts" size={size * 0.45} color={colors.primaryDeep} />
      </View>
    );
  }
  return (
    <View style={{ width: size, height: size }}>
      <View style={styles.groupBack}>
        <UserAvatar user={a} size={small} />
      </View>
      <View style={[styles.groupFront, { borderRadius: small / 2 + 2 }]}>
        {b ? (
          <UserAvatar user={b} size={small} />
        ) : (
          <View style={[styles.groupFallback, { width: small, height: small, borderRadius: small / 2 }]}>
            <Icon name="contacts" size={small * 0.45} color={colors.primaryDeep} />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  dot: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  groupFallback: {
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupBack: { position: 'absolute', left: 0, top: 0 },
  groupFront: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    borderWidth: 2,
    borderColor: colors.surface,
  },
});
