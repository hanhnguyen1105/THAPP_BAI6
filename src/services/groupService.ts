import { push, ref, serverTimestamp, update } from 'firebase/database';
import { addMessageUpdates, Updates } from './chatService';
import { db } from './firebase';
import { Conversation } from './types';

type Me = { uid: string; name: string };

export const MIN_GROUP_MEMBERS = 2; // tối thiểu 2 người ngoài bản thân

function systemPayload(text: string) {
  return { type: 'system', text };
}

/**
 * Tạo nhóm: conversations, tin hệ thống đầu tiên, userChats của mọi thành viên và
 * thông báo "được thêm vào nhóm" — tất cả trong MỘT lệnh update().
 */
export async function createGroup(me: Me, name: string, memberUids: string[]) {
  const groupName = name.trim();
  if (!groupName) {
    throw new Error('Vui lòng nhập tên nhóm.');
  }
  const others = [...new Set(memberUids)].filter(uid => uid !== me.uid);
  if (others.length < MIN_GROUP_MEMBERS) {
    throw new Error(`Hãy chọn ít nhất ${MIN_GROUP_MEMBERS} thành viên.`);
  }
  const convId = push(ref(db, 'conversations')).key as string;
  const all = [me.uid, ...others];
  const members = Object.fromEntries(all.map(uid => [uid, true]));

  const updates: Updates = {
    [`conversations/${convId}`]: {
      type: 'group',
      name: groupName,
      members,
      createdBy: me.uid,
      createdAt: serverTimestamp(),
    },
  };
  const text = `${me.name} đã tạo nhóm "${groupName}"`;
  addMessageUpdates(updates, {
    conv: { id: convId, type: 'group', name: groupName },
    memberUids: all,
    senderId: me.uid,
    payload: systemPayload(text),
    preview: text,
    notify: {
      uids: others,
      type: 'group_added',
      text: `${me.name} đã thêm bạn vào nhóm "${groupName}"`,
    },
  });
  await update(ref(db), updates);
  return convId;
}

// ---------------------------------------------------------------------------
// Phần C – Quản trị nhóm
// ---------------------------------------------------------------------------

export async function renameGroup(conv: Conversation, me: Me, newName: string) {
  const name = newName.trim();
  if (!name || name === conv.name) {
    return;
  }
  const memberUids = Object.keys(conv.members);
  const updates: Updates = { [`conversations/${conv.id}/name`]: name };
  const text = `${me.name} đã đổi tên nhóm thành "${name}"`;
  // addMessageUpdates ghi lại userChats/*/name bằng tên mới cho mọi thành viên.
  addMessageUpdates(updates, {
    conv: { ...conv, name },
    memberUids,
    senderId: me.uid,
    payload: systemPayload(text),
    preview: text,
  });
  await update(ref(db), updates);
}

export async function addMembers(
  conv: Conversation,
  me: Me,
  newMembers: { uid: string; name: string }[],
) {
  const fresh = newMembers.filter(m => !conv.members[m.uid]);
  if (fresh.length === 0) {
    return;
  }
  const updates: Updates = {};
  fresh.forEach(m => {
    updates[`conversations/${conv.id}/members/${m.uid}`] = true;
  });
  const text = `${me.name} đã thêm ${fresh.map(m => m.name).join(', ')} vào nhóm`;
  addMessageUpdates(updates, {
    conv,
    memberUids: [...Object.keys(conv.members), ...fresh.map(m => m.uid)],
    senderId: me.uid,
    payload: systemPayload(text),
    preview: text,
    notify: {
      uids: fresh.map(m => m.uid),
      type: 'group_added',
      text: `${me.name} đã thêm bạn vào nhóm "${conv.name ?? 'Nhóm'}"`,
    },
  });
  await update(ref(db), updates);
}

/** Chỉ trưởng nhóm (createdBy) được xóa người khác — luật bảo mật cũng kiểm tra điều này. */
export async function removeMember(conv: Conversation, me: Me, target: { uid: string; name: string }) {
  const remaining = Object.keys(conv.members).filter(uid => uid !== target.uid);
  const updates: Updates = {
    [`conversations/${conv.id}/members/${target.uid}`]: null,
    [`userChats/${target.uid}/${conv.id}`]: null,
  };
  const text = `${me.name} đã xóa ${target.name} khỏi nhóm`;
  addMessageUpdates(updates, {
    conv,
    memberUids: remaining,
    senderId: me.uid,
    payload: systemPayload(text),
    preview: text,
  });
  await update(ref(db), updates);
}

/** Rời nhóm, để lại tin hệ thống "A đã rời nhóm". Trưởng nhóm rời thì chuyển quyền cho người kế tiếp. */
export async function leaveGroup(conv: Conversation, me: Me) {
  const remaining = Object.keys(conv.members).filter(uid => uid !== me.uid);
  const updates: Updates = {
    [`conversations/${conv.id}/members/${me.uid}`]: null,
    [`userChats/${me.uid}/${conv.id}`]: null,
    [`typing/${conv.id}/${me.uid}`]: null,
    [`viewing/${conv.id}/${me.uid}`]: null,
  };
  if (conv.createdBy === me.uid && remaining.length > 0) {
    updates[`conversations/${conv.id}/createdBy`] = remaining[0];
  }
  const text = `${me.name} đã rời nhóm`;
  if (remaining.length > 0) {
    addMessageUpdates(updates, {
      conv,
      memberUids: remaining,
      senderId: me.uid,
      payload: systemPayload(text),
      preview: text,
    });
  }
  await update(ref(db), updates);
}
