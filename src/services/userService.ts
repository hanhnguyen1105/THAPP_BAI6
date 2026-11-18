import { updateProfile } from 'firebase/auth';
import { onValue, ref, update } from 'firebase/database';
import { auth, db } from './firebase';
import { AppUser } from './types';

function toUser(uid: string, value: any): AppUser {
  return {
    uid,
    name: value?.name ?? 'Người dùng',
    email: value?.email ?? '',
    avatar: value?.avatar ?? 0,
    photoUrl: value?.photoUrl || undefined,
    online: !!value?.online,
    lastSeen: value?.lastSeen,
  };
}

/** Lắng nghe toàn bộ người dùng (kể cả bản thân), sắp xếp theo tên. Trả về hàm hủy. */
export function subscribeAllUsers(callback: (users: AppUser[]) => void) {
  return onValue(ref(db, 'users'), snapshot => {
    const users: AppUser[] = [];
    snapshot.forEach(child => {
      if (child.key) {
        users.push(toUser(child.key, child.val()));
      }
    });
    users.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    callback(users);
  });
}

/** Lắng nghe một người dùng. Trả về hàm hủy. */
export function subscribeUser(uid: string, callback: (user: AppUser | null) => void) {
  return onValue(ref(db, `users/${uid}`), snapshot => {
    callback(snapshot.exists() ? toUser(uid, snapshot.val()) : null);
  });
}

/** Phần C – đổi họ tên / ảnh đại diện. Mọi màn hình đọc users/{uid} nên tự cập nhật. */
export async function updateMyProfile(changes: { name?: string; photoUrl?: string }) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Chưa đăng nhập');
  }
  const patch: Record<string, string> = {};
  if (changes.name !== undefined) {
    const name = changes.name.trim();
    if (!name) {
      throw new Error('Họ tên không được để trống.');
    }
    patch.name = name;
  }
  if (changes.photoUrl !== undefined) {
    patch.photoUrl = changes.photoUrl;
  }
  await update(ref(db, `users/${user.uid}`), patch);
  await updateProfile(user, {
    displayName: patch.name ?? user.displayName,
    photoURL: patch.photoUrl ?? user.photoURL,
  }).catch(() => undefined);
}
