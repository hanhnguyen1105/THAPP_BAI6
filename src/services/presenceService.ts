import {
  onDisconnect,
  onValue,
  ref,
  remove,
  serverTimestamp,
  set,
  update,
} from 'firebase/database';
import { db } from './firebase';

/**
 * Bật theo dõi online/offline cho người dùng hiện tại.
 * Khi mất kết nối (tắt app, mất mạng), server tự ghi online=false nhờ onDisconnect.
 * Trả về hàm hủy lắng nghe.
 */
export function startPresence(uid: string) {
  const userRef = ref(db, `users/${uid}`);
  const connectedRef = ref(db, '.info/connected');

  return onValue(connectedRef, snapshot => {
    if (snapshot.val() !== true) {
      return;
    }
    onDisconnect(userRef)
      .update({ online: false, lastSeen: serverTimestamp() })
      .then(() => update(userRef, { online: true, lastSeen: serverTimestamp() }))
      .catch(() => undefined);
  });
}

export function goOffline(uid: string) {
  return update(ref(db, `users/${uid}`), {
    online: false,
    lastSeen: serverTimestamp(),
  });
}

export function goOnline(uid: string) {
  return update(ref(db, `users/${uid}`), {
    online: true,
    lastSeen: serverTimestamp(),
  });
}

/** Lắng nghe trạng thái kết nối tới Realtime Database. Trả về hàm hủy. */
export function subscribeConnection(callback: (connected: boolean) => void) {
  return onValue(ref(db, '.info/connected'), snapshot => callback(snapshot.val() === true));
}

// ---------------------------------------------------------------------------
// Trạng thái trong một cuộc trò chuyện: "đang xem" và "đang soạn tin".
// ---------------------------------------------------------------------------

/**
 * Gọi khi người dùng đang mở (và nhìn thấy) một cuộc trò chuyện.
 * - Ghi viewing/{convId}/{uid} = true → người gửi biết không cần tạo thông báo cho mình.
 * - Đăng ký onDisconnect() xóa cả viewing lẫn typing, để app bị tắt đột ngột
 *   thì trạng thái không bị "kẹt".
 * Trả về hàm rời cuộc trò chuyện (dùng làm cleanup của useEffect).
 */
export function enterConversation(convId: string, uid: string) {
  const viewingRef = ref(db, `viewing/${convId}/${uid}`);
  const typingRef = ref(db, `typing/${convId}/${uid}`);

  // Đăng ký lại onDisconnect mỗi lần kết nối lại (mỗi kết nối mới server quên lệnh cũ).
  const stop = onValue(ref(db, '.info/connected'), snapshot => {
    if (snapshot.val() !== true) {
      return;
    }
    Promise.all([onDisconnect(viewingRef).remove(), onDisconnect(typingRef).remove()])
      .then(() => set(viewingRef, true))
      .catch(() => undefined);
  });

  return () => {
    stop();
    remove(viewingRef).catch(() => undefined);
    remove(typingRef).catch(() => undefined);
    onDisconnect(viewingRef).cancel().catch(() => undefined);
    onDisconnect(typingRef).cancel().catch(() => undefined);
  };
}

export function setTyping(convId: string, uid: string, typing: boolean) {
  const typingRef = ref(db, `typing/${convId}/${uid}`);
  return typing ? set(typingRef, true) : remove(typingRef);
}

/** Danh sách uid đang soạn tin trong cuộc trò chuyện. Trả về hàm hủy. */
export function subscribeTyping(convId: string, callback: (uids: string[]) => void) {
  return onValue(
    ref(db, `typing/${convId}`),
    snapshot => {
      const uids: string[] = [];
      snapshot.forEach(child => {
        if (child.val() === true && child.key) {
          uids.push(child.key);
        }
      });
      callback(uids);
    },
    () => callback([]),
  );
}

/** Tập uid đang mở cuộc trò chuyện. Trả về hàm hủy. */
export function subscribeViewing(convId: string, callback: (uids: Set<string>) => void) {
  return onValue(
    ref(db, `viewing/${convId}`),
    snapshot => {
      const uids = new Set<string>();
      snapshot.forEach(child => {
        if (child.val() === true && child.key) {
          uids.add(child.key);
        }
      });
      callback(uids);
    },
    () => callback(new Set()),
  );
}
