import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { subscribeUserChats } from '../services/chatService';
import { subscribeNotifications } from '../services/notificationService';
import { AppNotification, AppUser, ChatSummary } from '../services/types';
import { subscribeAllUsers } from '../services/userService';
import { useCurrentUid } from './AuthContext';

type DataState = {
  /** Mọi người dùng trừ bản thân (Danh bạ). */
  users: AppUser[];
  usersById: Map<string, AppUser>;
  chats: ChatSummary[] | null;
  notifications: AppNotification[] | null;
  unreadChats: number;
  unreadNotifications: number;
};

const DataContext = createContext<DataState>({
  users: [],
  usersById: new Map(),
  chats: null,
  notifications: null,
  unreadChats: 0,
  unreadNotifications: 0,
});

/**
 * Các luồng realtime dùng ở nhiều màn hình (Home, Danh bạ, Chat, Thông báo, badge của tab).
 * Mỗi luồng chỉ đăng ký một lần cho cả app và được hủy khi đăng xuất.
 */
export function DataProvider({ children }: { children: ReactNode }) {
  const uid = useCurrentUid();
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [chats, setChats] = useState<ChatSummary[] | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[] | null>(null);

  useEffect(() => {
    // Đổi tài khoản / đăng xuất → bỏ dữ liệu của phiên trước.
    setAllUsers([]);
    setChats(null);
    setNotifications(null);
    if (!uid) {
      return;
    }
    const stopUsers = subscribeAllUsers(setAllUsers);
    const stopChats = subscribeUserChats(uid, setChats);
    const stopNotifications = subscribeNotifications(uid, setNotifications);
    return () => {
      stopUsers();
      stopChats();
      stopNotifications();
    };
  }, [uid]);

  const value = useMemo<DataState>(() => {
    const usersById = new Map(allUsers.map(u => [u.uid, u]));
    return {
      users: allUsers.filter(u => u.uid !== uid),
      usersById,
      chats,
      notifications,
      unreadChats: (chats ?? []).reduce((sum, c) => sum + (c.unread > 0 ? 1 : 0), 0),
      unreadNotifications: (notifications ?? []).filter(n => !n.read).length,
    };
  }, [allUsers, chats, notifications, uid]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  return useContext(DataContext);
}
