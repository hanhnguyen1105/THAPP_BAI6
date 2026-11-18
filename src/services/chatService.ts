import {
  DataSnapshot,
  endBefore,
  get,
  increment,
  limitToLast,
  onValue,
  orderByChild,
  push,
  query,
  ref,
  serverTimestamp,
  set,
  startAt,
  update,
} from 'firebase/database';
import { db } from './firebase';
import {
  ChatSummary,
  Conversation,
  Message,
  MessageType,
  NotificationType,
  ReplyRef,
} from './types';

export const PAGE_SIZE = 20;
export const RECALLED_TEXT = 'Tin nhắn đã được thu hồi';

/** Mã cuộc trò chuyện 1-1: ghép 2 uid theo thứ tự để hai bên luôn ra cùng một mã. */
export function getDirectId(uidA: string, uidB: string) {
  return [uidA, uidB].sort().join('_');
}

/** Dòng tóm tắt hiển thị ở Home / thông báo. */
export function previewOf(message: Pick<Message, 'type' | 'text' | 'recalled'>) {
  if (message.recalled) {
    return RECALLED_TEXT;
  }
  switch (message.type) {
    case 'image':
      return '📷 Hình ảnh';
    case 'location':
      return '📍 Vị trí';
    default:
      return message.text ?? '';
  }
}

// ---------------------------------------------------------------------------
// Cuộc trò chuyện
// ---------------------------------------------------------------------------

function toConversation(id: string, value: any): Conversation {
  return {
    id,
    type: value?.type === 'group' ? 'group' : 'direct',
    name: value?.name,
    members: value?.members ?? {},
    createdBy: value?.createdBy ?? '',
    createdAt: value?.createdAt ?? 0,
  };
}

/**
 * Bảo đảm conversations/{convId} của chat 1-1 tồn tại (luật bảo mật dựa vào members
 * để quyết định ai được đọc/ghi tin nhắn). Cũng "di trú" luôn các cuộc trò chuyện của Bài 5.
 */
export async function ensureDirectConversation(myUid: string, partnerId: string) {
  const convId = getDirectId(myUid, partnerId);
  const convRef = ref(db, `conversations/${convId}`);
  const snapshot = await get(convRef);
  if (!snapshot.exists()) {
    await set(convRef, {
      type: 'direct',
      members: { [myUid]: true, [partnerId]: true },
      createdBy: myUid,
      createdAt: serverTimestamp(),
    });
  }
  return convId;
}

/** Lắng nghe thông tin cuộc trò chuyện (tên nhóm, thành viên). Trả về hàm hủy. */
export function subscribeConversation(
  convId: string,
  callback: (conversation: Conversation | null) => void,
  onError?: (error: Error) => void,
) {
  return onValue(
    ref(db, `conversations/${convId}`),
    snapshot => callback(snapshot.exists() ? toConversation(convId, snapshot.val()) : null),
    error => onError?.(error),
  );
}

/** Danh sách cuộc trò chuyện (1-1 và nhóm) của người dùng, mới nhất lên đầu. Trả về hàm hủy. */
export function subscribeUserChats(uid: string, callback: (chats: ChatSummary[]) => void) {
  return onValue(ref(db, `userChats/${uid}`), snapshot => {
    const chats: ChatSummary[] = [];
    snapshot.forEach(child => {
      const v = child.val() ?? {};
      const updatedAt = v.updatedAt ?? v.lastTime; // lastTime: dữ liệu cũ của Bài 5
      if (!child.key || !updatedAt) {
        return; // mục chưa có tin nhắn nào
      }
      chats.push({
        convId: child.key,
        type: v.type === 'group' ? 'group' : 'direct',
        name: v.name,
        partnerId: v.partnerId,
        lastMessage: v.lastMessage ?? '',
        lastMessageId: v.lastMessageId,
        lastType: v.lastType ?? 'text',
        lastSenderId: v.lastSenderId ?? '',
        updatedAt,
        unread: v.unread ?? 0,
      });
    });
    chats.sort((a, b) => b.updatedAt - a.updatedAt);
    callback(chats);
  });
}

// ---------------------------------------------------------------------------
// Tin nhắn: tải theo trang
// ---------------------------------------------------------------------------

function toMessage(snapshot: DataSnapshot): Message {
  const v = snapshot.val() ?? {};
  return {
    ...v,
    id: snapshot.key as string,
    type: (v.type ?? 'text') as MessageType,
    // Bài 5 lưu latitude/longitude — đọc cả hai kiểu.
    lat: v.lat ?? v.latitude,
    lng: v.lng ?? v.longitude,
    createdAt: v.createdAt ?? 0,
  };
}

function toMessages(snapshot: DataSnapshot) {
  const list: Message[] = [];
  snapshot.forEach(child => {
    list.push(toMessage(child));
  });
  return list;
}

export type MessagePager = {
  /** Tải thêm PAGE_SIZE tin cũ hơn. Trả về false nếu không còn tin cũ. */
  loadOlder: () => Promise<boolean>;
  /** Tải lùi cho tới khi đã có tin có createdAt <= ts (dùng khi cuộn tới tin gốc / kết quả tìm kiếm). */
  loadUntil: (ts: number) => Promise<void>;
  stop: () => void;
};

export type PagerState = { hasMore: boolean; loadingOlder: boolean; ready: boolean };

/**
 * Tải tin nhắn theo trang, vẫn realtime:
 *  1. Lần đầu: limitToLast(20) → biết tin cũ nhất đang có (con trỏ).
 *  2. Lắng nghe "trang sống": mọi tin từ con trỏ trở về sau (tin mới, thu hồi, cảm xúc).
 *  3. Mỗi lần kéo lên đầu: lắng nghe thêm một trang cố định gồm 20 tin ngay trước con trỏ
 *     (endBefore + limitToLast(20)). Vì tin mới luôn có createdAt lớn hơn nên trang cũ
 *     không bao giờ bị xô lệch → danh sách không nhảy, không trùng, không hở.
 */
export function createMessagePager(
  convId: string,
  onChange: (messages: Message[], state: PagerState) => void,
  onError?: (error: Error) => void,
): MessagePager {
  const base = ref(db, `messages/${convId}`);
  const pages = new Map<string, Message[]>();
  const unsubs: (() => void)[] = [];
  let oldest: Message | null = null;
  let hasMore = true;
  let loadingOlder = false;
  let ready = false;
  let stopped = false;
  let pageCount = 0;

  const emit = () => {
    if (stopped) {
      return;
    }
    const byId = new Map<string, Message>();
    pages.forEach(list => list.forEach(m => byId.set(m.id, m)));
    const merged = [...byId.values()].sort(
      (a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id),
    );
    onChange(merged, { hasMore, loadingOlder, ready });
  };

  const fail = (error: Error) => {
    if (!stopped) {
      onError?.(error);
    }
  };

  get(query(base, orderByChild('createdAt'), limitToLast(PAGE_SIZE)))
    .then(snapshot => {
      if (stopped) {
        return;
      }
      const first = toMessages(snapshot);
      oldest = first[0] ?? null;
      hasMore = first.length === PAGE_SIZE;
      const live = oldest
        ? query(base, orderByChild('createdAt'), startAt(oldest.createdAt, oldest.id))
        : query(base, orderByChild('createdAt'));
      unsubs.push(
        onValue(
          live,
          s => {
            pages.set('live', toMessages(s));
            ready = true;
            emit();
          },
          fail,
        ),
      );
    })
    .catch(fail);

  const loadOlder = () =>
    new Promise<boolean>(resolve => {
      if (stopped || !ready || !hasMore || loadingOlder || !oldest) {
        resolve(false);
        return;
      }
      loadingOlder = true;
      emit();
      const key = `page-${++pageCount}`;
      const cursor = oldest;
      let first = true;
      const older = query(
        base,
        orderByChild('createdAt'),
        endBefore(cursor.createdAt, cursor.id),
        limitToLast(PAGE_SIZE),
      );
      unsubs.push(
        onValue(
          older,
          s => {
            const list = toMessages(s);
            pages.set(key, list);
            if (first) {
              first = false;
              hasMore = list.length === PAGE_SIZE;
              oldest = list[0] ?? oldest;
              loadingOlder = false;
              resolve(list.length > 0);
            }
            emit();
          },
          error => {
            loadingOlder = false;
            fail(error);
            resolve(false);
          },
        ),
      );
    });

  const loadUntil = async (ts: number) => {
    for (let i = 0; i < 50 && hasMore && oldest && oldest.createdAt > ts; i++) {
      const loaded = await loadOlder();
      if (!loaded) {
        break;
      }
    }
  };

  return {
    loadOlder,
    loadUntil,
    stop: () => {
      stopped = true;
      unsubs.forEach(u => u());
    },
  };
}

/** Lấy toàn bộ tin của một cuộc trò chuyện một lần (dùng cho tìm kiếm). */
export async function fetchAllMessages(convId: string) {
  const snapshot = await get(query(ref(db, `messages/${convId}`), orderByChild('createdAt')));
  return toMessages(snapshot);
}

// ---------------------------------------------------------------------------
// Gửi tin: MỘT lệnh update() nhiều đường dẫn
// ---------------------------------------------------------------------------

export type Updates = Record<string, unknown>;

type NotifyOptions = {
  /** Những người nhận thông báo. */
  uids: string[];
  type: NotificationType;
  text: string;
};

/**
 * Thêm vào `updates` các đường dẫn để ghi một tin nhắn:
 *  - messages/{convId}/{msgId}
 *  - userChats/{uid}/{convId}: lastMessage, lastSenderId, updatedAt cho mọi thành viên,
 *    unread = increment(1) cho mọi người trừ người gửi (không đọc giá trị cũ).
 *  - notifications/{uid}/{id} nếu có `notify`.
 * Dùng chung cho tin thường và tin hệ thống của nhóm.
 */
export function addMessageUpdates(
  updates: Updates,
  params: {
    conv: Pick<Conversation, 'id' | 'type' | 'name'>;
    /** Thành viên sẽ nhận cập nhật userChats (sau khi thay đổi, nếu có). */
    memberUids: string[];
    senderId: string;
    payload: Record<string, unknown>;
    preview: string;
    notify?: NotifyOptions;
  },
) {
  const { conv, memberUids, senderId, payload, preview, notify } = params;
  const now = serverTimestamp();
  const msgId = push(ref(db, `messages/${conv.id}`)).key as string;

  updates[`messages/${conv.id}/${msgId}`] = { ...payload, senderId, createdAt: now };

  memberUids.forEach(uid => {
    const base = `userChats/${uid}/${conv.id}`;
    updates[`${base}/type`] = conv.type;
    if (conv.type === 'group') {
      updates[`${base}/name`] = conv.name ?? 'Nhóm';
    } else {
      updates[`${base}/partnerId`] = memberUids.find(u => u !== uid) ?? uid;
    }
    updates[`${base}/lastMessage`] = preview;
    updates[`${base}/lastMessageId`] = msgId;
    updates[`${base}/lastType`] = payload.type;
    updates[`${base}/lastSenderId`] = senderId;
    updates[`${base}/updatedAt`] = now;
    if (uid !== senderId) {
      updates[`${base}/unread`] = increment(1);
    }
  });

  notify?.uids.forEach(uid => {
    addNotificationUpdate(updates, uid, {
      type: notify.type,
      convId: conv.id,
      fromUid: senderId,
      text: notify.text,
    });
  });

  return msgId;
}

export function addNotificationUpdate(
  updates: Updates,
  toUid: string,
  data: { type: NotificationType; convId: string; fromUid: string; text: string },
) {
  const id = push(ref(db, `notifications/${toUid}`)).key as string;
  updates[`notifications/${toUid}/${id}`] = {
    ...data,
    createdAt: serverTimestamp(),
    read: false,
  };
}

export type SendContext = {
  conv: Conversation;
  me: { uid: string; name: string };
  /** uid đang mở cuộc trò chuyện → không cần thông báo. */
  viewers: Set<string>;
  replyTo?: ReplyRef;
};

export type MessageContent =
  | { type: 'text'; text: string }
  | { type: 'image'; imageUrl: string; width?: number; height?: number }
  | { type: 'location'; lat: number; lng: number };

export async function sendMessage(ctx: SendContext, content: MessageContent) {
  if (content.type === 'text' && !content.text.trim()) {
    throw new Error('Tin nhắn rỗng');
  }
  const payload: Record<string, unknown> =
    content.type === 'text' ? { ...content, text: content.text.trim() } : { ...content };
  if (ctx.replyTo) {
    payload.replyTo = ctx.replyTo;
  }
  const preview = previewOf(payload as Message);
  const memberUids = Object.keys(ctx.conv.members);
  const others = memberUids.filter(uid => uid !== ctx.me.uid && !ctx.viewers.has(uid));
  const isGroup = ctx.conv.type === 'group';

  const updates: Updates = {};
  addMessageUpdates(updates, {
    conv: ctx.conv,
    memberUids,
    senderId: ctx.me.uid,
    payload,
    preview,
    notify: {
      uids: others,
      type: 'message',
      text: isGroup ? `${ctx.me.name}: ${preview}` : preview,
    },
  });
  await update(ref(db), updates);
}

// ---------------------------------------------------------------------------
// Thu hồi, cảm xúc, đã đọc
// ---------------------------------------------------------------------------

/**
 * Thu hồi: KHÔNG xóa node, chỉ đánh dấu recalled = true (và xóa nội dung).
 * Nếu đó là tin cuối, cập nhật luôn lastMessage ở Home của mọi thành viên — cùng một lệnh update().
 */
export async function recallMessage(conv: Conversation, message: Message, isLast: boolean) {
  const path = `messages/${conv.id}/${message.id}`;
  const updates: Updates = {
    [`${path}/recalled`]: true,
    [`${path}/text`]: null,
    [`${path}/imageUrl`]: null,
    [`${path}/lat`]: null,
    [`${path}/lng`]: null,
  };
  if (isLast) {
    Object.keys(conv.members).forEach(uid => {
      updates[`userChats/${uid}/${conv.id}/lastMessage`] = RECALLED_TEXT;
    });
  }
  await update(ref(db), updates);
}

/** Thả / đổi / gỡ cảm xúc của chính mình. Báo cho người gửi tin (nếu không phải mình). */
export async function toggleReaction(
  conv: Conversation,
  message: Message,
  me: { uid: string; name: string },
  emoji: string,
) {
  const current = message.reactions?.[me.uid];
  const removing = current === emoji;
  const updates: Updates = {
    [`messages/${conv.id}/${message.id}/reactions/${me.uid}`]: removing ? null : emoji,
  };
  if (!removing && message.senderId !== me.uid && conv.members[message.senderId]) {
    const snippet = previewOf(message).slice(0, 60);
    addNotificationUpdate(updates, message.senderId, {
      type: 'reaction',
      convId: conv.id,
      fromUid: me.uid,
      text: `${me.name} đã thả ${emoji} vào tin nhắn của bạn: "${snippet}"`,
    });
  }
  await update(ref(db), updates);
}

/** Đã đọc tới hiện tại: ghi readStatus và đưa số chưa đọc của mình về 0 trong một lần update. */
export function markConversationRead(convId: string, uid: string) {
  return update(ref(db), {
    [`readStatus/${convId}/${uid}`]: serverTimestamp(),
    [`userChats/${uid}/${convId}/unread`]: 0,
  });
}

/** readStatus/{convId}: { uid: thời điểm đọc cuối }. Trả về hàm hủy. */
export function subscribeReadStatus(
  convId: string,
  callback: (status: Record<string, number>) => void,
) {
  return onValue(
    ref(db, `readStatus/${convId}`),
    snapshot => callback(snapshot.val() ?? {}),
    () => callback({}),
  );
}
