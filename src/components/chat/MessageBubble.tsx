import { memo } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { RECALLED_TEXT } from '../../services/chatService';
import { openInGoogleMaps } from '../../services/locationService';
import { AppUser, Message, ReplyRef } from '../../services/types';
import { colors, radius, shadow } from '../../theme';
import { formatClock } from '../../utils/time';
import { UserAvatar } from '../Avatar';
import { Icon } from '../Icon';

const MAX_IMAGE_W = 220;
const MAX_IMAGE_H = 280;

type Props = {
  message: Message;
  mine: boolean;
  sender?: AppUser;
  /** Nhóm: tên người gửi phía trên bong bóng (tin đầu của một chuỗi). */
  senderLabel?: string;
  showAvatar: boolean;
  /** "Đã gửi" / "Đã xem lúc 14:32" — chỉ có ở tin cuối của mình. */
  status?: string;
  highlighted: boolean;
  replyName?: string;
  onLongPress: (message: Message) => void;
  onPressImage: (url: string) => void;
  onPressReply: (reply: ReplyRef) => void;
};

function MessageBubbleBase({
  message,
  mine,
  sender,
  senderLabel,
  showAvatar,
  status,
  highlighted,
  replyName,
  onLongPress,
  onPressImage,
  onPressReply,
}: Props) {
  if (message.type === 'system') {
    return (
      <View style={styles.systemWrap}>
        <Text style={styles.systemText}>{message.text}</Text>
      </View>
    );
  }

  const longPress = message.recalled ? undefined : () => onLongPress(message);

  let body;
  if (message.recalled) {
    body = (
      <View style={[styles.recalled, mine && styles.alignEnd]}>
        <Icon name="recall" size={14} color={colors.textMuted} />
        <Text style={styles.recalledText}>{RECALLED_TEXT}</Text>
      </View>
    );
  } else if (message.type === 'image' && message.imageUrl) {
    const { width = 1, height = 1 } = message;
    const scale = Math.min(MAX_IMAGE_W / width, MAX_IMAGE_H / height, 1.5);
    body = (
      <Pressable
        onPress={() => onPressImage(message.imageUrl!)}
        onLongPress={longPress}
        delayLongPress={300}
        accessibilityLabel="Xem ảnh toàn màn hình">
        {message.replyTo && (
          <ReplyQuote reply={message.replyTo} name={replyName} mine={mine} onPress={onPressReply} />
        )}
        <Image
          source={{ uri: message.imageUrl }}
          style={[styles.image, { width: width * scale, height: height * scale }]}
        />
      </Pressable>
    );
  } else if (message.type === 'location' && message.lat !== undefined && message.lng !== undefined) {
    body = (
      <LocationCard lat={message.lat} lng={message.lng} mine={mine} onLongPress={longPress} />
    );
  } else {
    body = (
      <Pressable
        onLongPress={longPress}
        delayLongPress={300}
        style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
        {message.replyTo && (
          <ReplyQuote reply={message.replyTo} name={replyName} mine={mine} onPress={onPressReply} />
        )}
        <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{message.text}</Text>
      </Pressable>
    );
  }

  return (
    <View
      style={[
        styles.row,
        mine ? styles.rowMine : styles.rowTheirs,
        highlighted && styles.highlight,
      ]}>
      {!mine && (
        <View style={styles.avatarSlot}>
          {showAvatar ? <UserAvatar user={sender} size={30} /> : null}
        </View>
      )}
      <View style={[styles.column, mine && styles.alignEnd]}>
        {senderLabel ? <Text style={styles.senderName}>{senderLabel}</Text> : null}
        {body}
        {!message.recalled && <Reactions reactions={message.reactions} mine={mine} />}
        <View style={styles.metaRow}>
          <Text style={styles.time}>{formatClock(message.createdAt)}</Text>
          {status ? (
            <>
              <Icon
                name={status.startsWith('Đã xem') || status.startsWith('Mọi') ? 'checkAll' : 'check'}
                size={12}
                color={colors.primaryDeep}
              />
              <Text style={styles.status}>{status}</Text>
            </>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export const MessageBubble = memo(MessageBubbleBase);

function ReplyQuote({
  reply,
  name,
  mine,
  onPress,
}: {
  reply: ReplyRef;
  name?: string;
  mine: boolean;
  onPress: (reply: ReplyRef) => void;
}) {
  return (
    <Pressable
      onPress={() => onPress(reply)}
      style={[styles.quote, mine && styles.quoteMine]}
      accessibilityLabel="Đi tới tin nhắn gốc">
      <Text style={styles.quoteName} numberOfLines={1}>
        {name ?? 'Tin nhắn'}
      </Text>
      <Text style={styles.quoteText} numberOfLines={2}>
        {reply.preview}
      </Text>
    </Pressable>
  );
}

/** Cảm xúc gom theo loại: "❤️ 3 · 👍 1". */
function Reactions({ reactions, mine }: { reactions?: Record<string, string>; mine: boolean }) {
  const values = Object.values(reactions ?? {});
  if (values.length === 0) {
    return null;
  }
  const counts = new Map<string, number>();
  values.forEach(e => counts.set(e, (counts.get(e) ?? 0) + 1));
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return (
    <View style={[styles.reactions, mine ? styles.reactionsMine : styles.reactionsTheirs]}>
      {sorted.map(([emoji, count], i) => (
        <Text key={emoji} style={styles.reactionText}>
          {i > 0 ? ' · ' : ''}
          {emoji}
          {values.length > 1 ? ` ${count}` : ''}
        </Text>
      ))}
    </View>
  );
}

function LocationCard({
  lat,
  lng,
  mine,
  onLongPress,
}: {
  lat: number;
  lng: number;
  mine: boolean;
  onLongPress?: () => void;
}) {
  const open = () =>
    openInGoogleMaps(lat, lng).catch(() =>
      Alert.alert('Không mở được bản đồ', 'Thiết bị không mở được Google Maps.'),
    );
  return (
    <Pressable
      onPress={open}
      onLongPress={onLongPress}
      delayLongPress={300}
      style={({ pressed }) => [styles.locCard, pressed && styles.pressed]}
      accessibilityRole="link"
      accessibilityLabel="Mở vị trí trên Google Maps">
      <View style={styles.locHeader}>
        <View style={styles.locIcon}>
          <Icon name="pin" size={15} color={colors.tertiary} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.locTitle}>Vị trí hiện tại</Text>
          <Text style={styles.locSub}>{mine ? 'Bạn đã chia sẻ vị trí' : 'Đã chia sẻ vị trí'}</Text>
        </View>
      </View>
      <View style={styles.mapBox}>
        <View style={[styles.road, styles.roadH]} />
        <View style={[styles.road, styles.roadV]} />
        <View style={[styles.road, styles.roadD]} />
        <View style={styles.mapPin}>
          <Icon name="pin" size={18} color={colors.textOnPrimary} fill={colors.tertiary} />
        </View>
      </View>
      <Text style={styles.coords}>
        {lat.toFixed(5)}, {lng.toFixed(5)}
      </Text>
      <View style={styles.mapsBtn}>
        <Text style={styles.mapsBtnText}>Mở bản đồ</Text>
        <Icon name="external" size={13} color={colors.primaryDeep} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.85 },
  alignEnd: { alignItems: 'flex-end', alignSelf: 'flex-end' },
  row: { flexDirection: 'row', alignItems: 'flex-end', marginVertical: 3, borderRadius: 12 },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  highlight: { backgroundColor: colors.primarySoft },
  avatarSlot: { width: 30, marginRight: 6, marginBottom: 18 },
  column: { maxWidth: '78%', alignItems: 'flex-start' },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primaryDeep,
    marginBottom: 3,
    marginLeft: 4,
  },
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  bubbleMine: { backgroundColor: colors.bubbleMine, borderBottomRightRadius: 6 },
  bubbleTheirs: { backgroundColor: colors.surface, borderBottomLeftRadius: 6, ...shadow },
  bubbleText: { fontSize: 15, lineHeight: 21, color: colors.text },
  bubbleTextMine: { color: colors.bubbleMineText },
  recalled: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  recalledText: { fontSize: 13, fontStyle: 'italic', color: colors.textMuted },
  image: { borderRadius: 16, backgroundColor: colors.surfaceAlt },
  quote: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 6,
  },
  quoteMine: { backgroundColor: 'rgba(255,255,255,0.45)', borderLeftColor: colors.primaryDeep },
  quoteName: { fontSize: 12, fontWeight: '700', color: colors.primaryDeep },
  quoteText: { fontSize: 12, color: colors.textBody, marginTop: 1 },
  reactions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -8,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reactionsMine: { marginRight: 8 },
  reactionsTheirs: { marginLeft: 8 },
  reactionText: { fontSize: 12, color: colors.textBody },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3, marginHorizontal: 4 },
  time: { fontSize: 10, color: colors.textMuted },
  status: { fontSize: 10, color: colors.primaryDeep, fontWeight: '600' },
  systemWrap: {
    alignSelf: 'center',
    maxWidth: '85%',
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
  },
  systemText: { fontSize: 12, color: colors.textMuted, textAlign: 'center' },
  locCard: {
    width: 220,
    padding: 10,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
  },
  locHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  locIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.secondarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  locSub: { fontSize: 11, color: colors.textMuted },
  mapBox: {
    height: 100,
    borderRadius: 12,
    backgroundColor: '#E7EFE8',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  road: { position: 'absolute', backgroundColor: colors.surface },
  roadH: { height: 8, left: 0, right: 0, top: 36 },
  roadV: { width: 8, top: 0, bottom: 0, left: 140 },
  roadD: { height: 6, width: 300, left: -40, top: 64, transform: [{ rotate: '-20deg' }] },
  mapPin: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primaryDeep,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.surface,
  },
  coords: { fontSize: 11, color: colors.textMuted, marginTop: 6, fontVariant: ['tabular-nums'] },
  mapsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 32,
    marginTop: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  mapsBtnText: { fontSize: 12, fontWeight: '700', color: colors.primaryDeep },
});
