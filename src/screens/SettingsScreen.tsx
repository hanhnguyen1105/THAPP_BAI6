import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../components/AppHeader';
import { UserAvatar } from '../components/Avatar';
import { Icon, IconName } from '../components/Icon';
import { useAuth } from '../context/AuthContext';
import { logout } from '../services/authService';
import { firebaseConfig } from '../services/firebaseConfig';
import { subscribeConnection } from '../services/presenceService';
import {
  CameraPermissionError,
  PickedImage,
  pickImage,
  uploadImage,
} from '../services/uploadService';
import { updateMyProfile } from '../services/userService';
import { colors, radius, shadow } from '../theme';

export function SettingsScreen() {
  const { user, profile } = useAuth();
  const [notifyOn, setNotifyOn] = useState(true);
  const [connected, setConnected] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => subscribeConnection(setConnected), []);

  const comingSoon = () => Alert.alert('Sắp ra mắt', 'Tính năng này sẽ có trong bản cập nhật sau.');

  const handleLogout = () =>
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất khỏi PinkyChat?', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          setLoggingOut(true);
          try {
            // AuthContext nhận user = null → navigator tự quay về màn Đăng nhập.
            await logout();
          } catch {
            setLoggingOut(false);
            Alert.alert('Lỗi', 'Không đăng xuất được. Vui lòng thử lại.');
          }
        },
      },
    ]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Cài Đặt" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.profile}>
          <Pressable onPress={() => setEditOpen(true)} accessibilityLabel="Chỉnh sửa hồ sơ">
            <UserAvatar user={profile ?? undefined} size={96} ring />
            <View style={styles.editBadge}>
              <Icon name="pencil" size={14} color={colors.textOnPrimary} />
            </View>
          </Pressable>
          <Text style={styles.name}>{profile?.name ?? user?.displayName ?? 'Bạn'} 🌸</Text>
          <Text style={styles.email}>{profile?.email ?? user?.email}</Text>
        </View>

        <SectionTitle icon="user" title="Cài đặt tài khoản" />
        <View style={styles.card}>
          <SettingRow
            icon="user"
            title="Thông tin cá nhân"
            subtitle="Đổi họ tên và ảnh đại diện"
            onPress={() => setEditOpen(true)}
          />
          <SettingRow
            icon="bellRing"
            title="Thông báo tin nhắn mới"
            subtitle="Âm thanh ngọt ngào & rung nhẹ"
            toggle={{ value: notifyOn, onChange: setNotifyOn }}
          />
          <SettingRow
            icon="pin"
            title="Quyền truy cập vị trí (GPS)"
            subtitle="Được hỏi khi bạn nhấn 📍 trong cuộc trò chuyện"
          />
          <SettingRow
            icon="shield"
            title="Bảo mật & Mật khẩu"
            subtitle="Đổi mật khẩu qua email đặt lại"
            onPress={comingSoon}
            last
          />
        </View>

        <SectionTitle icon="sync" title="Hạ tầng kỹ thuật" />
        <View style={styles.card}>
          <SettingRow
            icon="sync"
            title="Kết nối máy chủ"
            subtitle="Firebase Realtime Database"
            tag={connected ? 'Đang đồng bộ' : 'Mất kết nối'}
            tagTone={connected ? 'ok' : 'warn'}
          />
          <SettingRow
            icon="shield"
            title="Phiên đăng nhập"
            subtitle={`Firebase Auth · ${firebaseConfig.projectId}`}
            tag="Bảo mật cao"
            tagTone="pink"
            last
          />
        </View>

        <Pressable
          onPress={handleLogout}
          disabled={loggingOut}
          style={({ pressed }) => [styles.logout, (pressed || loggingOut) && styles.pressed]}>
          <Icon name="logout" size={20} color={colors.textOnPrimary} />
          <Text style={styles.logoutText}>{loggingOut ? 'Đang đăng xuất...' : 'Đăng xuất tài khoản'}</Text>
        </Pressable>
        <Text style={styles.logoutHint}>
          Nhấn để đăng xuất an toàn và quay về màn hình Đăng nhập
        </Text>
        <Text style={styles.version}>PinkyChat v1.3.0 • Bài thực hành 6 React Native CLI</Text>
      </ScrollView>
      <ProfileEditor visible={editOpen} onClose={() => setEditOpen(false)} />
    </SafeAreaView>
  );
}

/** Phần C – hồ sơ cá nhân: đổi họ tên và ảnh đại diện (tải lên Cloudinary). */
function ProfileEditor({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { profile } = useAuth();
  const [name, setName] = useState('');
  const [photo, setPhoto] = useState<{ uri: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const photoFile = useRef<PickedImage | null>(null);

  useEffect(() => {
    if (visible) {
      setName(profile?.name ?? '');
      setPhoto(null);
      setSaving(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const choosePhoto = async (source: 'camera' | 'library') => {
    try {
      const image = await pickImage(source);
      if (image) {
        photoFile.current = image;
        setPhoto({ uri: image.uri });
      }
    } catch (e) {
      Alert.alert(
        e instanceof CameraPermissionError ? 'Không có quyền truy cập' : 'Không lấy được ảnh',
        (e as Error).message,
      );
    }
  };
  const save = async () => {
    setSaving(true);
    try {
      let photoUrl: string | undefined;
      if (photo && photoFile.current) {
        setProgress(0);
        photoUrl = (await uploadImage(photoFile.current, setProgress)).url;
      }
      await updateMyProfile({ name, ...(photoUrl ? { photoUrl } : {}) });
      onClose();
    } catch (e) {
      setSaving(false);
      Alert.alert('Không lưu được', (e as Error)?.message ?? 'Vui lòng thử lại.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={() => undefined}>
          <Text style={styles.modalTitle}>Hồ sơ cá nhân</Text>
          <View style={styles.modalAvatar}>
            {photo ? (
              <Image source={{ uri: photo.uri }} style={styles.preview} />
            ) : (
              <UserAvatar user={profile ?? undefined} size={88} ring />
            )}
          </View>
          <View style={styles.photoBtns}>
            <Pressable style={styles.photoBtn} onPress={() => choosePhoto('library')}>
              <Icon name="image" size={15} color={colors.primaryDeep} />
              <Text style={styles.photoBtnText}>Thư viện</Text>
            </Pressable>
            <Pressable style={styles.photoBtn} onPress={() => choosePhoto('camera')}>
              <Icon name="camera" size={15} color={colors.primaryDeep} />
              <Text style={styles.photoBtnText}>Chụp ảnh</Text>
            </Pressable>
          </View>
          <Text style={styles.fieldLabel}>Họ và tên</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            style={styles.fieldInput}
            maxLength={60}
            placeholder="Nhập họ tên"
            placeholderTextColor={colors.textMuted}
          />
          <Pressable
            onPress={save}
            disabled={saving || !name.trim()}
            style={[styles.saveBtn, (saving || !name.trim()) && styles.pressed]}>
            {saving ? (
              <View style={styles.savingRow}>
                <ActivityIndicator color={colors.textOnPrimary} />
                {photo ? (
                  <Text style={styles.saveText}>{Math.round(progress * 100)}%</Text>
                ) : null}
              </View>
            ) : (
              <Text style={styles.saveText}>Lưu thay đổi</Text>
            )}
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const tagStyles = {
  ok: { bg: '#DCFCE7', color: '#15803D' },
  warn: { bg: '#FEF3C7', color: '#B45309' },
  pink: { bg: colors.secondarySoft, color: colors.tertiary },
};

function SectionTitle({ icon, title }: { icon: IconName; title: string }) {
  return (
    <View style={styles.sectionTitle}>
      <Icon name={icon} size={17} color={colors.primaryDeep} />
      <Text style={styles.sectionText}>{title}</Text>
    </View>
  );
}

function SettingRow({
  icon,
  title,
  subtitle,
  onPress,
  toggle,
  tag,
  tagTone = 'pink',
  last,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  onPress?: () => void;
  toggle?: { value: boolean; onChange: (v: boolean) => void };
  tag?: string;
  tagTone?: 'ok' | 'warn' | 'pink';
  last?: boolean;
}) {
  const tagStyle = tagStyles[tagTone];
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[styles.row, !last && styles.rowDivider]}>
      <View style={styles.rowIcon}>
        <Icon name={icon} size={18} color={colors.tertiary} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{subtitle}</Text>
      </View>
      {toggle && (
        <Switch
          value={toggle.value}
          onValueChange={toggle.onChange}
          trackColor={{ true: colors.primary, false: colors.border }}
          thumbColor={colors.surface}
        />
      )}
      {tag && (
        <View style={[styles.tag, { backgroundColor: tagStyle.bg }]}>
          <Text style={[styles.tagText, { color: tagStyle.color }]}>{tag}</Text>
        </View>
      )}
      {onPress && <Icon name="next" size={18} color={colors.textMuted} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 16, paddingBottom: 32 },
  pressed: { opacity: 0.8 },
  profile: { alignItems: 'center', marginTop: 4, marginBottom: 8 },
  editBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primaryDeep,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(43,33,36,0.35)' },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'center' },
  modalAvatar: { alignItems: 'center', marginTop: 16 },
  preview: { width: 88, height: 88, borderRadius: 44, borderWidth: 2, borderColor: colors.primary },
  photoBtns: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 12 },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  photoBtnText: { fontSize: 13, fontWeight: '600', color: colors.primaryDeep },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginTop: 18, marginBottom: 8 },
  fieldInput: {
    height: 48,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    fontSize: 15,
    color: colors.text,
  },
  saveBtn: {
    height: 50,
    marginTop: 20,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  saveText: { color: colors.textOnPrimary, fontSize: 16, fontWeight: '700' },
  name: { fontSize: 22, fontWeight: '700', color: colors.text, marginTop: 12 },
  email: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20, marginBottom: 10 },
  sectionText: { fontSize: 17, fontWeight: '700', color: colors.text },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, ...shadow },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  rowSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  tagText: { fontSize: 11, fontWeight: '700' },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 54,
    borderRadius: radius.pill,
    backgroundColor: colors.secondary,
    marginTop: 28,
    ...shadow,
  },
  logoutText: { color: colors.textOnPrimary, fontSize: 16, fontWeight: '700' },
  logoutHint: { textAlign: 'center', fontSize: 12, color: colors.textMuted, marginTop: 10 },
  version: { textAlign: 'center', fontSize: 11, color: colors.textMuted, marginTop: 18 },
});
