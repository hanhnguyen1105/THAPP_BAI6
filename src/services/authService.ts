import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  User,
} from 'firebase/auth';
import { ref, serverTimestamp, set } from 'firebase/database';
import { auth, db } from './firebase';
import { goOffline } from './presenceService';

export function subscribeAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function register(name: string, email: string, password: string) {
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  const { uid } = credential.user;
  await updateProfile(credential.user, { displayName: name.trim() });
  await set(ref(db, `users/${uid}`), {
    name: name.trim(),
    email: email.trim().toLowerCase(),
    avatar: Math.floor(Math.random() * 6),
    online: true,
    lastSeen: serverTimestamp(),
  });
  return credential.user;
}

export async function login(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  return credential.user;
}

export async function logout() {
  const uid = auth.currentUser?.uid;
  // Phải ghi offline trước khi signOut, vì sau đó luật bảo mật không cho ghi nữa.
  if (uid) {
    await goOffline(uid).catch(() => undefined);
  }
  await signOut(auth);
}

export function resetPassword(email: string) {
  return sendPasswordResetEmail(auth, email.trim());
}

export function authErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code ?? '';
  if (__DEV__) {
    console.warn('[Firebase Auth]', code, (error as Error)?.message);
  }
  if (code.startsWith('auth/api-key-not-valid') || code === 'auth/invalid-api-key') {
    return 'Chưa cấu hình Firebase: hãy điền apiKey thật trong src/services/firebaseConfig.ts.';
  }
  switch (code) {
    case 'auth/operation-not-allowed':
    case 'auth/configuration-not-found':
      return 'Chưa bật đăng nhập Email/Password trong Firebase Console → Authentication.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-login-credentials':
      return 'Email hoặc mật khẩu không đúng.';
    case 'auth/invalid-email':
      return 'Email không hợp lệ.';
    case 'auth/email-already-in-use':
      return 'Email này đã được đăng ký.';
    case 'auth/weak-password':
      return 'Mật khẩu phải có ít nhất 6 ký tự.';
    case 'auth/too-many-requests':
      return 'Bạn thử quá nhiều lần. Vui lòng thử lại sau.';
    case 'auth/missing-email':
      return 'Vui lòng nhập email.';
    case 'auth/network-request-failed':
      return 'Không có kết nối mạng.';
    default:
      return 'Đã có lỗi xảy ra. Vui lòng thử lại.';
  }
}
