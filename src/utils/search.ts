/** Bỏ dấu tiếng Việt + chữ thường, để "thao" tìm được "Thảo". */
export function normalize(text: string) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

export function matches(query: string, ...fields: string[]) {
  const q = normalize(query);
  return !q || fields.some(f => normalize(f).includes(q));
}
