// Cấu hình Cloudinary — CHỈ dùng unsigned upload preset.
// KHÔNG đưa API key / API secret vào mã nguồn.
//
// Cách tạo: Cloudinary Console → Settings → Upload → Upload presets → Add upload preset
//   • Signing mode: Unsigned
//   • Folder (tuỳ chọn): pinkychat
// Sau đó điền cloud name (góc trên Dashboard) và tên preset vào đây.
export const cloudinaryConfig = {
  cloudName: 'YOUR_CLOUD_NAME',
  uploadPreset: 'YOUR_UNSIGNED_PRESET',
};
