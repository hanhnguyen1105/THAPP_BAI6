const pad = (n: number) => String(n).padStart(2, '0');

/** 14:05 */
export function formatClock(ts?: number) {
  if (!ts) {
    return '';
  }
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Thời gian ngắn cho danh sách: Vừa xong / 5 phút trước / 14:05 / Hôm qua / 03/11 */
export function formatRelative(ts?: number) {
  if (!ts) {
    return '';
  }
  const now = new Date();
  const d = new Date(ts);
  const diffMin = Math.floor((now.getTime() - ts) / 60000);
  if (diffMin < 1) {
    return 'Vừa xong';
  }
  if (diffMin < 60) {
    return `${diffMin} phút trước`;
  }
  if (isSameDay(now, d)) {
    return formatClock(ts);
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(yesterday, d)) {
    return 'Hôm qua';
  }
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

/** Nhãn ngăn cách theo ngày trong màn Chat. */
export function formatDayLabel(ts: number) {
  const now = new Date();
  const d = new Date(ts);
  if (isSameDay(now, d)) {
    return 'Hôm nay';
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(yesterday, d)) {
    return 'Hôm qua';
  }
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** Trạng thái hiển thị dưới tên: Đang hoạt động / Hoạt động 5 phút trước */
export function formatPresence(online: boolean, lastSeen?: number, now = Date.now()) {
  if (online) {
    return 'Đang hoạt động';
  }
  if (!lastSeen) {
    return 'Không hoạt động';
  }
  const diffMin = Math.floor((now - lastSeen) / 60000);
  if (diffMin < 1) {
    return 'Hoạt động vừa xong';
  }
  if (diffMin < 60) {
    return `Hoạt động ${diffMin} phút trước`;
  }
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) {
    return `Hoạt động ${diffHour} giờ trước`;
  }
  return `Hoạt động ${Math.floor(diffHour / 24)} ngày trước`;
}
