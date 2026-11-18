import { limitToLast, onValue, orderByChild, query, ref, update } from 'firebase/database';
import { db } from './firebase';
import { AppNotification } from './types';

/** 100 thông báo mới nhất của người dùng, mới nhất lên đầu. Trả về hàm hủy. */
export function subscribeNotifications(
  uid: string,
  callback: (items: AppNotification[]) => void,
) {
  const q = query(ref(db, `notifications/${uid}`), orderByChild('createdAt'), limitToLast(100));
  return onValue(
    q,
    snapshot => {
      const items: AppNotification[] = [];
      snapshot.forEach(child => {
        const v = child.val() ?? {};
        items.push({
          id: child.key as string,
          type: v.type ?? 'message',
          convId: v.convId ?? '',
          fromUid: v.fromUid ?? '',
          text: v.text ?? '',
          createdAt: v.createdAt ?? 0,
          read: !!v.read,
        });
      });
      items.sort((a, b) => b.createdAt - a.createdAt);
      callback(items);
    },
    () => callback([]),
  );
}

export function markNotificationRead(uid: string, id: string) {
  return update(ref(db, `notifications/${uid}/${id}`), { read: true });
}

/** Đánh dấu tất cả đã đọc trong một lệnh update(). */
export function markAllNotificationsRead(uid: string, ids: string[]) {
  if (ids.length === 0) {
    return Promise.resolve();
  }
  const updates: Record<string, boolean> = {};
  ids.forEach(id => {
    updates[`notifications/${uid}/${id}/read`] = true;
  });
  return update(ref(db), updates);
}
