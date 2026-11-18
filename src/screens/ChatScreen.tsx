import Clipboard from '@react-native-clipboard/clipboard';
import { useIsFocused } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  ToastAndroid,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GroupAvatar, UserAvatar } from '../components/Avatar';
import { Composer } from '../components/chat/Composer';
import { ImageViewer } from '../components/chat/ImageViewer';
import { MessageBubble } from '../components/chat/MessageBubble';
import { MessageMenu } from '../components/chat/MessageMenu';
import { PendingUpload, PendingUploadBubble } from '../components/chat/PendingUploadBubble';
import { SearchModal } from '../components/chat/SearchModal';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { useAuth, useCurrentUid } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { RootStackParamList } from '../navigation/types';
import {
  createMessagePager,
  ensureDirectConversation,
  getDirectId,
  markConversationRead,
  MessageContent,
  MessagePager,
  PagerState,
  previewOf,
  recallMessage,
  sendMessage,
  subscribeConversation,
  subscribeReadStatus,
  toggleReaction,
} from '../services/chatService';
import {
  getCurrentLocation,
  LocationPermissionError,
} from '../services/locationService';
import {
  enterConversation,
  setTyping,
  subscribeTyping,
  subscribeViewing,
} from '../services/presenceService';
import { Conversation, Message, ReplyRef } from '../services/types';
import { CameraPermissionError, pickImage, uploadImage } from '../services/uploadService';
import { colors, radius } from '../theme';
import { useAppActive, useNow } from '../utils/hooks';
import { formatClock, formatDayLabel, formatPresence } from '../utils/time';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

type Row =
  | { kind: 'day'; key: string; label: string }
  | { kind: 'pending'; key: string; item: PendingUpload }
  | {
      kind: 'message';
      key: string;
      message: Message;
      showAvatar: boolean;
      senderLabel?: string;
      status?: string;
    };

const TYPING_TIMEOUT = 3000;
const dayKey = (ts: number) => new Date(ts).toDateString();

function toReplyRef(message: Message): ReplyRef {
  return {
    id: message.id,
    senderId: message.senderId,
    createdAt: message.createdAt,
    preview: previewOf(message).slice(0, 100),
  };
}

function showPermissionAlert(title: string, message: string) {
  Alert.alert(title, message, [
    { text: 'Để sau', style: 'cancel' },
    { text: 'Mở Cài đặt', onPress: () => Linking.openSettings() },
  ]);
}

export function ChatScreen({ navigation, route }: Props) {
  const { partnerId } = route.params;
  const myUid = useCurrentUid();
  const { profile } = useAuth();
  const { usersById } = useData();
  const convId = route.params.convId ?? (partnerId ? getDirectId(myUid, partnerId) : '');
  const me = useMemo(() => ({ uid: myUid, name: profile?.name ?? 'Bạn' }), [myUid, profile?.name]);

  const [conv, setConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [pagerState, setPagerState] = useState<PagerState>({
    hasMore: false,
    loadingOlder: false,
    ready: false,
  });
  const [typingUids, setTypingUids] = useState<string[]>([]);
  const [viewers, setViewers] = useState<Set<string>>(new Set());
  const [readStatus, setReadStatus] = useState<Record<string, number>>({});
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [menuMessage, setMenuMessage] = useState<Message | null>(null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [sendingLocation, setSendingLocation] = useState(false);
  const [scrollTarget, setScrollTarget] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const pagerRef = useRef<MessagePager | null>(null);
  const listRef = useRef<FlatList<Row>>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isTypingRef = useRef(false);
  const lostRef = useRef(false);
  // Giá trị mới nhất cho các tác vụ bất đồng bộ (tải ảnh xong mới gửi).
  const latest = useRef({ conv, me, viewers });
  latest.current = { conv, me, viewers };

  const isFocused = useIsFocused();
  const appActive = useAppActive();
  const active = isFocused && appActive;
  const now = useNow();
  const convReady = conv !== null;

  const handleLost = useCallback(() => {
    if (lostRef.current) {
      return;
    }
    lostRef.current = true;
    Alert.alert('Không thể mở cuộc trò chuyện', 'Bạn không còn là thành viên của cuộc trò chuyện này.');
    navigation.goBack();
  }, [navigation]);

  // 1. Chat 1-1: tạo conversations/{convId} nếu chưa có, rồi lắng nghe thông tin cuộc trò chuyện.
  useEffect(() => {
    if (!myUid || !convId) {
      return;
    }
    let stop: (() => void) | undefined;
    let cancelled = false;
    setConv(null);
    (partnerId ? ensureDirectConversation(myUid, partnerId) : Promise.resolve(convId))
      .then(() => {
        if (cancelled) {
          return;
        }
        stop = subscribeConversation(
          convId,
          c => (c && c.members[myUid] ? setConv(c) : handleLost()),
          handleLost,
        );
      })
      .catch(() => !cancelled && handleLost());
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [myUid, convId, partnerId, handleLost]);

  // 2. Tin nhắn theo trang (20 tin mới nhất, kéo lên tải thêm 20).
  useEffect(() => {
    if (!convReady) {
      return;
    }
    setMessages(null);
    const pager = createMessagePager(convId, (list, state) => {
      setMessages(list);
      setPagerState(state);
    });
    pagerRef.current = pager;
    return () => {
      pager.stop();
      pagerRef.current = null;
    };
  }, [convId, convReady]);

  // 3. Đang soạn tin / đang xem / đã đọc của các thành viên.
  useEffect(() => {
    if (!convReady) {
      return;
    }
    const stopTyping = subscribeTyping(convId, setTypingUids);
    const stopViewing = subscribeViewing(convId, setViewers);
    const stopRead = subscribeReadStatus(convId, setReadStatus);
    return () => {
      stopTyping();
      stopViewing();
      stopRead();
    };
  }, [convId, convReady]);

  // 4. Mình đang mở màn hình này (app ở tiền cảnh): ghi viewing + onDisconnect.
  //    Rời màn / app xuống nền → xóa viewing và typing.
  useEffect(() => {
    if (!active || !convReady) {
      return;
    }
    const leave = enterConversation(convId, myUid);
    return () => {
      clearTimeout(typingTimer.current);
      isTypingRef.current = false;
      leave();
    };
  }, [active, convReady, convId, myUid]);

  // 5. Có tin mới khi đang xem → đánh dấu đã đọc (readStatus + unread = 0).
  const lastId = messages?.[messages.length - 1]?.id;
  useEffect(() => {
    if (active && lastId) {
      markConversationRead(convId, myUid).catch(() => undefined);
    }
  }, [active, lastId, convId, myUid]);

  // ----- Đang soạn tin: bật khi gõ, tự tắt sau 3 giây không gõ / khi gửi -----
  const stopTyping = useCallback(() => {
    clearTimeout(typingTimer.current);
    if (isTypingRef.current) {
      isTypingRef.current = false;
      setTyping(convId, myUid, false).catch(() => undefined);
    }
  }, [convId, myUid]);

  const handleChangeText = (value: string) => {
    setText(value);
    if (!value.trim()) {
      stopTyping();
      return;
    }
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      setTyping(convId, myUid, true).catch(() => undefined);
    }
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(stopTyping, TYPING_TIMEOUT);
  };

  // ----- Gửi tin -----
  const send = async (content: MessageContent, reply?: Message | null) => {
    const { conv: c, me: m, viewers: v } = latest.current;
    if (!c) {
      throw new Error('Cuộc trò chuyện chưa sẵn sàng');
    }
    await sendMessage({ conv: c, me: m, viewers: v, replyTo: reply ? toReplyRef(reply) : undefined }, content);
  };

  const handleSend = async () => {
    const content = text.trim();
    if (!content) {
      return;
    }
    stopTyping();
    const reply = replyTo;
    setText('');
    setReplyTo(null);
    try {
      await send({ type: 'text', text: content }, reply);
    } catch {
      setText(content);
      setReplyTo(reply);
      Alert.alert('Gửi thất bại', 'Không gửi được tin nhắn. Kiểm tra kết nối và thử lại.');
    }
  };

  const handleSendLocation = async () => {
    if (sendingLocation) {
      return;
    }
    setSendingLocation(true);
    try {
      const { latitude, longitude } = await getCurrentLocation();
      await send({ type: 'location', lat: latitude, lng: longitude });
    } catch (e) {
      if (e instanceof LocationPermissionError) {
        showPermissionAlert(
          'Không có quyền vị trí',
          'Bạn đã từ chối quyền truy cập vị trí nên không thể gửi vị trí.',
        );
      } else {
        Alert.alert('Không gửi được vị trí', (e as Error)?.message ?? 'Vui lòng thử lại.');
      }
    } finally {
      setSendingLocation(false);
    }
  };

  // ----- Gửi ảnh: chọn → thu nhỏ → tải lên Cloudinary (bong bóng tạm) → ghi URL -----
  const patchPending = (localId: string, changes: Partial<PendingUpload>) =>
    setPending(list => list.map(p => (p.localId === localId ? { ...p, ...changes } : p)));

  const runUpload = async (item: PendingUpload) => {
    patchPending(item.localId, { status: 'uploading', error: undefined });
    try {
      const uploaded =
        item.uploaded ??
        (await uploadImage(item.image, progress => patchPending(item.localId, { progress })));
      patchPending(item.localId, { uploaded, progress: 1 });
      await send({ type: 'image', imageUrl: uploaded.url, width: uploaded.width, height: uploaded.height });
      setPending(list => list.filter(p => p.localId !== item.localId));
    } catch (e) {
      patchPending(item.localId, { status: 'error', error: (e as Error)?.message });
    }
  };

  const pickAndUpload = async (source: 'camera' | 'library') => {
    try {
      const image = await pickImage(source);
      if (!image) {
        return;
      }
      const item: PendingUpload = {
        localId: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        image,
        progress: 0,
        status: 'uploading',
      };
      setPending(list => [...list, item]);
      runUpload(item);
    } catch (e) {
      if (e instanceof CameraPermissionError) {
        showPermissionAlert('Không có quyền truy cập', `${e.message} Hãy bật lại trong Cài đặt của máy.`);
      } else {
        Alert.alert('Không lấy được ảnh', (e as Error)?.message ?? 'Vui lòng thử lại.');
      }
    }
  };

  const handlePickImage = () =>
    Alert.alert('Gửi ảnh', 'Bạn muốn lấy ảnh từ đâu?', [
      { text: 'Chụp ảnh', onPress: () => pickAndUpload('camera') },
      { text: 'Chọn từ thư viện', onPress: () => pickAndUpload('library') },
      { text: 'Hủy', style: 'cancel' },
    ]);

  // ----- Menu nhấn giữ -----
  const handleReact = (message: Message, emoji: string) => {
    if (conv) {
      toggleReaction(conv, message, me, emoji).catch(() =>
        Alert.alert('Lỗi', 'Không thả được cảm xúc. Vui lòng thử lại.'),
      );
    }
  };

  const handleCopy = (message: Message) => {
    Clipboard.setString(message.text ?? '');
    if (Platform.OS === 'android') {
      ToastAndroid.show('Đã sao chép', ToastAndroid.SHORT);
    }
  };

  const handleRecall = (message: Message) =>
    Alert.alert('Thu hồi tin nhắn', 'Tin nhắn sẽ được thu hồi với mọi người trong cuộc trò chuyện.', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Thu hồi',
        style: 'destructive',
        onPress: () => {
          if (!conv) {
            return;
          }
          const isLast = messages?.[messages.length - 1]?.id === message.id;
          recallMessage(conv, message, isLast).catch(() =>
            Alert.alert('Lỗi', 'Không thu hồi được tin nhắn.'),
          );
        },
      },
    ]);

  // ----- Cuộn tới một tin (trích dẫn / kết quả tìm kiếm) -----
  const goToMessage = useCallback(async (id: string, createdAt: number) => {
    await pagerRef.current?.loadUntil(createdAt);
    setScrollTarget(id);
  }, []);

  const handlePressReply = useCallback(
    (reply: ReplyRef) => goToMessage(reply.id, reply.createdAt),
    [goToMessage],
  );

  // ----- Thông tin hiển thị -----
  const isGroup = conv?.type === 'group';
  const memberIds = useMemo(() => Object.keys(conv?.members ?? {}), [conv?.members]);
  const otherIds = useMemo(() => memberIds.filter(uid => uid !== myUid), [memberIds, myUid]);
  const partnerUid = isGroup ? undefined : partnerId ?? otherIds[0];
  const partner = partnerUid ? usersById.get(partnerUid) : undefined;
  const nameOf = useCallback(
    (uid: string) => (uid === myUid ? 'Bạn' : usersById.get(uid)?.name ?? 'Người dùng'),
    [myUid, usersById],
  );

  const title = isGroup ? conv?.name ?? 'Nhóm' : partner?.name ?? 'Người dùng';
  const othersTyping = typingUids.filter(uid => uid !== myUid && conv?.members[uid]);
  const onlineCount = memberIds.filter(uid => usersById.get(uid)?.online).length;

  let subtitle: string;
  if (othersTyping.length > 0) {
    subtitle = !isGroup
      ? 'đang soạn tin…'
      : othersTyping.length === 1
      ? `${nameOf(othersTyping[0])} đang soạn tin…`
      : `${othersTyping.length} người đang soạn tin…`;
  } else if (isGroup) {
    subtitle = `${memberIds.length} thành viên • ${onlineCount} đang online`;
  } else {
    subtitle = formatPresence(partner?.online ?? false, partner?.lastSeen, now);
  }
  const subtitleActive = othersTyping.length > 0 || (!isGroup && partner?.online);

  const rows = useMemo<Row[]>(() => {
    const list = messages ?? [];
    let myLast: Message | undefined;
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].senderId === myUid && list[i].type !== 'system') {
        myLast = list[i];
        break;
      }
    }

    const statusOf = (m: Message) => {
      const seen = otherIds.filter(uid => (readStatus[uid] ?? 0) >= m.createdAt);
      if (seen.length === 0) {
        return 'Đã gửi';
      }
      if (!isGroup) {
        return `Đã xem lúc ${formatClock(readStatus[seen[0]])}`;
      }
      return seen.length === otherIds.length
        ? 'Đã xem bởi tất cả'
        : `Đã xem bởi ${seen.length} người`;
    };

    const out: Row[] = [];
    list.forEach((m, i) => {
      const prev = list[i - 1];
      const next = list[i + 1];
      const newDay = !prev || dayKey(prev.createdAt) !== dayKey(m.createdAt);
      if (newDay) {
        out.push({
          kind: 'day',
          key: `day-${m.id}`,
          label: `${formatDayLabel(m.createdAt)}, ${formatClock(m.createdAt)}`,
        });
      }
      const fromOther = m.senderId !== myUid && m.type !== 'system';
      const sameAsPrev = !newDay && prev?.senderId === m.senderId && prev?.type !== 'system';
      const sameAsNext =
        next?.senderId === m.senderId &&
        next?.type !== 'system' &&
        dayKey(next.createdAt) === dayKey(m.createdAt);
      out.push({
        kind: 'message',
        key: m.id,
        message: m,
        showAvatar: fromOther && !sameAsNext,
        senderLabel: isGroup && fromOther && !sameAsPrev ? nameOf(m.senderId) : undefined,
        status: m.id === myLast?.id ? statusOf(m) : undefined,
      });
    });
    out.reverse();
    const pendingRows: Row[] = pending
      .map(item => ({ kind: 'pending' as const, key: item.localId, item }))
      .reverse();
    return [...pendingRows, ...out];
  }, [messages, pending, myUid, otherIds, readStatus, isGroup, nameOf]);

  // Sau khi đã tải đủ trang, cuộn tới tin đích và tô sáng.
  useEffect(() => {
    if (!scrollTarget) {
      return;
    }
    const index = rows.findIndex(r => r.kind === 'message' && r.message.id === scrollTarget);
    if (index < 0) {
      if (!pagerState.loadingOlder) {
        setScrollTarget(null);
        Alert.alert('Không tìm thấy', 'Không tìm thấy tin nhắn gốc.');
      }
      return;
    }
    listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
    setHighlightId(scrollTarget);
    setScrollTarget(null);
  }, [scrollTarget, rows, pagerState.loadingOlder]);

  useEffect(() => {
    if (!highlightId) {
      return;
    }
    const t = setTimeout(() => setHighlightId(null), 1800);
    return () => clearTimeout(t);
  }, [highlightId]);

  const renderItem = ({ item }: { item: Row }) => {
    if (item.kind === 'day') {
      return (
        <View style={styles.dayPill}>
          <Text style={styles.dayText}>{item.label}</Text>
        </View>
      );
    }
    if (item.kind === 'pending') {
      return (
        <PendingUploadBubble
          item={item.item}
          onRetry={() => runUpload(item.item)}
          onCancel={() => setPending(list => list.filter(p => p.localId !== item.item.localId))}
        />
      );
    }
    const m = item.message;
    return (
      <MessageBubble
        message={m}
        mine={m.senderId === myUid}
        sender={usersById.get(m.senderId)}
        senderLabel={item.senderLabel}
        showAvatar={item.showAvatar}
        status={item.status}
        highlighted={highlightId === m.id}
        replyName={m.replyTo ? nameOf(m.replyTo.senderId) : undefined}
        onLongPress={setMenuMessage}
        onPressImage={setViewerUrl}
        onPressReply={handlePressReply}
      />
    );
  };

  const memberUsers = memberIds.filter(uid => uid !== myUid).map(uid => usersById.get(uid));

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={10}
          style={styles.iconBtn}
          accessibilityLabel="Quay lại">
          <Icon name="back" size={22} color={colors.primaryDeep} />
        </Pressable>
        <Pressable
          style={styles.headerMain}
          disabled={!isGroup}
          onPress={() => navigation.navigate('GroupInfo', { convId })}>
          {isGroup ? (
            <GroupAvatar members={memberUsers} size={40} />
          ) : (
            <UserAvatar user={partner} size={40} showOnline />
          )}
          <View style={styles.headerText}>
            <Text style={styles.headerName} numberOfLines={1}>
              {title}
            </Text>
            <Text
              style={[styles.headerStatus, subtitleActive && styles.headerStatusActive]}
              numberOfLines={1}>
              {subtitle}
            </Text>
          </View>
        </Pressable>
        <Pressable
          onPress={() => setSearchOpen(true)}
          hitSlop={8}
          style={styles.iconBtn}
          disabled={!convReady}
          accessibilityLabel="Tìm trong cuộc trò chuyện">
          <Icon name="search" size={20} color={colors.primaryDeep} />
        </Pressable>
        {isGroup && (
          <Pressable
            onPress={() => navigation.navigate('GroupInfo', { convId })}
            hitSlop={8}
            style={styles.iconBtn}
            accessibilityLabel="Thông tin nhóm">
            <Icon name="more" size={20} color={colors.primaryDeep} />
          </Pressable>
        )}
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        {messages === null ? (
          <ActivityIndicator style={styles.flex} color={colors.primary} />
        ) : (
          <FlatList
            ref={listRef}
            data={rows}
            inverted
            keyExtractor={row => row.key}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            // inverted: "cuối danh sách" là phía trên cùng → kéo lên đầu thì tải 20 tin cũ hơn.
            // Tin cũ được nối vào cuối mảng nên các tin đang hiển thị không bị xô lệch.
            onEndReached={() => pagerRef.current?.loadOlder()}
            onEndReachedThreshold={0.3}
            onScrollToIndexFailed={info => {
              listRef.current?.scrollToOffset({
                offset: info.averageItemLength * info.index,
                animated: true,
              });
              setTimeout(
                () =>
                  listRef.current?.scrollToIndex({
                    index: info.index,
                    animated: true,
                    viewPosition: 0.5,
                  }),
                350,
              );
            }}
            ListFooterComponent={
              pagerState.loadingOlder ? (
                <ActivityIndicator style={styles.olderLoader} color={colors.primary} />
              ) : !pagerState.hasMore && rows.length > 0 ? (
                <Text style={styles.beginning}>Bắt đầu cuộc trò chuyện</Text>
              ) : undefined
            }
            ListEmptyComponent={
              // FlatList inverted lật cả phần rỗng, nên lật lại cho đúng chiều.
              <View style={styles.flipped}>
                <EmptyState
                  icon="heart"
                  title={isGroup ? `Chào mừng đến nhóm ${title}` : `Bắt đầu trò chuyện với ${title}`}
                  body="Gửi lời chào đầu tiên nhé 💕"
                />
              </View>
            }
          />
        )}

        <Composer
          text={text}
          onChangeText={handleChangeText}
          onSend={handleSend}
          onPickImage={handlePickImage}
          onSendLocation={handleSendLocation}
          sendingLocation={sendingLocation}
          placeholder={isGroup ? `Nhắn tin tới ${title}...` : 'Nhập tin nhắn...'}
          replyLabel={replyTo ? nameOf(replyTo.senderId) : undefined}
          replyPreview={replyTo ? previewOf(replyTo) : undefined}
          onCancelReply={() => setReplyTo(null)}
        />
      </KeyboardAvoidingView>

      <MessageMenu
        message={menuMessage}
        myUid={myUid}
        onClose={() => setMenuMessage(null)}
        onReact={handleReact}
        onReply={setReplyTo}
        onCopy={handleCopy}
        onRecall={handleRecall}
      />
      <ImageViewer url={viewerUrl} onClose={() => setViewerUrl(null)} />
      <SearchModal
        visible={searchOpen}
        convId={convId}
        myUid={myUid}
        usersById={usersById}
        onClose={() => setSearchOpen(false)}
        onSelect={m => {
          setSearchOpen(false);
          goToMessage(m.id, m.createdAt);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flipped: { transform: [{ scaleY: -1 }] },
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerText: { flex: 1 },
  headerName: { fontSize: 17, fontWeight: '700', color: colors.text },
  headerStatus: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  headerStatusActive: { color: colors.online, fontWeight: '600' },
  list: { paddingHorizontal: 12, paddingVertical: 12, flexGrow: 1 },
  dayPill: {
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    marginVertical: 10,
  },
  dayText: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
  olderLoader: { marginVertical: 12 },
  beginning: { textAlign: 'center', fontSize: 11, color: colors.textMuted, marginVertical: 12 },
});
