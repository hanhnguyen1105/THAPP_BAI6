import { useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../Icon';

/** Xem ảnh toàn màn hình. Chạm ảnh hoặc nút X để đóng. */
export function ImageViewer({ url, onClose }: { url: string | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  return (
    <Modal
      visible={!!url}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      onShow={() => setLoading(true)}>
      <StatusBar barStyle="light-content" />
      <View style={styles.backdrop}>
        {url && (
          <Pressable style={styles.full} onPress={onClose}>
            <Image
              source={{ uri: url }}
              style={styles.full}
              resizeMode="contain"
              onLoadEnd={() => setLoading(false)}
            />
          </Pressable>
        )}
        {loading && <ActivityIndicator style={styles.loader} color="#fff" size="large" />}
        <Pressable
          onPress={onClose}
          style={[styles.close, { top: insets.top + 12 }]}
          hitSlop={10}
          accessibilityLabel="Đóng ảnh">
          <Icon name="close" size={22} color="#fff" />
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#000' },
  full: { flex: 1, width: '100%' },
  loader: { position: 'absolute', alignSelf: 'center', top: '48%' },
  close: {
    position: 'absolute',
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
