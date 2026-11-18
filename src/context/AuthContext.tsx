import { User } from 'firebase/auth';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { subscribeAuth } from '../services/authService';
import { goOffline, goOnline, startPresence } from '../services/presenceService';
import { AppUser } from '../services/types';
import { subscribeUser } from '../services/userService';

type AuthState = {
  /** undefined = đang kiểm tra phiên đăng nhập */
  user: User | null | undefined;
  profile: AppUser | null;
};

const AuthContext = createContext<AuthState>({ user: undefined, profile: null });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [profile, setProfile] = useState<AppUser | null>(null);

  useEffect(() => subscribeAuth(setUser), []);

  const uid = user?.uid;

  // Hồ sơ của chính mình (tên, avatar) — cập nhật realtime.
  useEffect(() => {
    if (!uid) {
      setProfile(null);
      return;
    }
    return subscribeUser(uid, setProfile);
  }, [uid]);

  // Online/offline: onDisconnect lo trường hợp tắt app / mất mạng,
  // AppState lo trường hợp đưa app xuống nền rồi mở lại.
  useEffect(() => {
    if (!uid) {
      return;
    }
    const stopPresence = startPresence(uid);
    const appStateSub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        goOnline(uid).catch(() => undefined);
      } else if (state === 'background') {
        goOffline(uid).catch(() => undefined);
      }
    });
    return () => {
      stopPresence();
      appStateSub.remove();
    };
  }, [uid]);

  return <AuthContext.Provider value={{ user, profile }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

/** Dùng trong các màn hình sau đăng nhập — luôn có uid. */
export function useCurrentUid() {
  const { user } = useAuth();
  return user?.uid ?? '';
}
