import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { PickedImage } from '../../services/uploadService';
import { colors, radius, shadow } from '../../theme';
import { Icon } from '../Icon';

export type PendingUpload = {
  localId: string;
  image: PickedImage;
  progress: number;
  status: 'uploading' | 'error';
  error?: string;
  /** Đã tải lên xong nhưng ghi tin thất bại → thử lại thì không cần tải lại. */
  uploaded?: { url: string; width: number; height: number };
};

/** Bong bóng tạm khi đang tải ảnh lên: vòng loading + %; lỗi thì có nút "Thử lại". */
export function PendingUploadBubble({
  item,
  onRetry,
  onCancel,
}: {
  item: PendingUpload;
  onRetry: () => void;
  onCancel: () => void;
}) {
  const failed = item.status === 'error';
  const percent = Math.round(item.progress * 100);
  return (
    <View style={styles.row}>
      <View style={[styles.card, failed && styles.cardFailed]}>
        <View>
          <Image source={{ uri: item.image.uri }} style={styles.thumb} />
          {!failed && (
            <View style={styles.thumbOverlay}>
              <ActivityIndicator color="#fff" />
            </View>
          )}
        </View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {item.image.fileName}
          </Text>
          {failed ? (
            <>
              <Text style={styles.errorText} numberOfLines={2}>
                Tải lên thất bại{item.error ? ` · ${item.error}` : ''}
              </Text>
              <View style={styles.actions}>
                <Pressable onPress={onRetry} style={styles.retry} accessibilityLabel="Thử lại">
                  <Icon name="retry" size={14} color={colors.primaryDeep} />
                  <Text style={styles.retryText}>Thử lại</Text>
                </Pressable>
                <Pressable onPress={onCancel} hitSlop={8} accessibilityLabel="Bỏ ảnh này">
                  <Text style={styles.cancelText}>Bỏ</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <View style={styles.track}>
                <View style={[styles.bar, { width: `${Math.max(4, percent)}%` }]} />
              </View>
              <Text style={styles.progressText}>Đang tải lên {percent}%...</Text>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'flex-end', marginVertical: 4 },
  card: {
    width: 250,
    flexDirection: 'row',
    gap: 10,
    padding: 10,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
  },
  cardFailed: { borderColor: colors.secondary },
  thumb: { width: 54, height: 54, borderRadius: 12, backgroundColor: colors.surfaceAlt },
  thumbOverlay: {
    ...StyleSheet.absoluteFill,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, justifyContent: 'center' },
  name: { fontSize: 13, fontWeight: '700', color: colors.text },
  track: {
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.surfaceAlt,
    marginTop: 8,
    overflow: 'hidden',
  },
  bar: { height: 5, borderRadius: 3, backgroundColor: colors.primary },
  progressText: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  errorText: { fontSize: 12, color: colors.danger, marginTop: 3 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 6 },
  retry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  retryText: { fontSize: 12, fontWeight: '700', color: colors.primaryDeep },
  cancelText: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
});
