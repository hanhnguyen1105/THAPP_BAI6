import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/** Thời điểm hiện tại, tự làm mới định kỳ — để "Hoạt động 5 phút trước" luôn đúng. */
export function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** true khi app đang ở tiền cảnh. */
export function useAppActive() {
  const [active, setActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => setActive(state === 'active'));
    return () => sub.remove();
  }, []);
  return active;
}
