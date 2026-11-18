import { PermissionsAndroid, Platform } from 'react-native';
import {
  Asset,
  CameraOptions,
  ImageLibraryOptions,
  launchCamera,
  launchImageLibrary,
} from 'react-native-image-picker';
import { cloudinaryConfig } from './cloudinaryConfig';

/** Cạnh dài tối đa của ảnh gửi đi. */
export const MAX_IMAGE_SIZE = 1024;

export class CameraPermissionError extends Error {}

export type PickedImage = {
  uri: string;
  width: number;
  height: number;
  fileName: string;
  type: string;
};

export type UploadedImage = { url: string; width: number; height: number };

/** Kích thước sau khi thu nhỏ để cạnh dài ≤ max, giữ nguyên tỉ lệ. */
export function fitWithin(width: number, height: number, max = MAX_IMAGE_SIZE) {
  const longest = Math.max(width, height);
  if (!longest || longest <= max) {
    return { width, height };
  }
  const scale = max / longest;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

async function requestCameraPermission() {
  if (Platform.OS !== 'android') {
    return true; // iOS: hệ thống tự hỏi khi mở camera (NSCameraUsageDescription)
  }
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA, {
    title: 'Quyền sử dụng camera',
    message: 'Ứng dụng cần camera để chụp ảnh gửi trong cuộc trò chuyện.',
    buttonPositive: 'Cho phép',
    buttonNegative: 'Từ chối',
  });
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

/**
 * Chụp ảnh hoặc chọn từ thư viện. Ảnh được thu nhỏ ngay trên máy
 * (maxWidth/maxHeight = 1024 → cạnh dài ≤ 1024px, giữ tỉ lệ) và nén JPEG trước khi tải lên.
 * Trả về null nếu người dùng hủy.
 */
export async function pickImage(source: 'camera' | 'library'): Promise<PickedImage | null> {
  const options: CameraOptions & ImageLibraryOptions = {
    mediaType: 'photo',
    maxWidth: MAX_IMAGE_SIZE,
    maxHeight: MAX_IMAGE_SIZE,
    quality: 0.8,
    selectionLimit: 1,
    saveToPhotos: false,
  };

  if (source === 'camera' && !(await requestCameraPermission())) {
    throw new CameraPermissionError('Bạn đã từ chối quyền camera.');
  }

  const result =
    source === 'camera' ? await launchCamera(options) : await launchImageLibrary(options);

  if (result.didCancel) {
    return null;
  }
  if (result.errorCode === 'permission') {
    throw new CameraPermissionError(
      source === 'camera' ? 'Bạn đã từ chối quyền camera.' : 'Bạn đã từ chối quyền thư viện ảnh.',
    );
  }
  if (result.errorCode === 'camera_unavailable') {
    throw new Error('Thiết bị không có camera khả dụng.');
  }
  if (result.errorCode) {
    throw new Error(result.errorMessage ?? 'Không lấy được ảnh.');
  }
  const asset: Asset | undefined = result.assets?.[0];
  if (!asset?.uri) {
    return null;
  }
  const size = fitWithin(asset.width ?? 0, asset.height ?? 0);
  return {
    uri: asset.uri,
    width: size.width,
    height: size.height,
    fileName: asset.fileName ?? `photo_${Date.now()}.jpg`,
    type: asset.type ?? 'image/jpeg',
  };
}

/**
 * Tải ảnh lên Cloudinary bằng unsigned upload preset (không cần API secret).
 * Dùng XMLHttpRequest để báo tiến độ (0 → 1). Chỉ trả về URL để lưu vào Realtime Database.
 */
export function uploadImage(
  image: PickedImage,
  onProgress?: (progress: number) => void,
): Promise<UploadedImage> {
  const { cloudName, uploadPreset } = cloudinaryConfig;
  if (!cloudName || cloudName.startsWith('YOUR_') || uploadPreset.startsWith('YOUR_')) {
    return Promise.reject(
      new Error('Chưa cấu hình Cloudinary: điền cloudName và uploadPreset trong cloudinaryConfig.ts.'),
    );
  }

  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', { uri: image.uri, type: image.type, name: image.fileName } as any);
    form.append('upload_preset', uploadPreset);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`);
    xhr.upload.onprogress = event => {
      if (event.lengthComputable) {
        onProgress?.(event.loaded / event.total);
      }
    };
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && body.secure_url) {
          resolve({
            url: body.secure_url,
            width: body.width ?? image.width,
            height: body.height ?? image.height,
          });
        } else {
          reject(new Error(body?.error?.message ?? `Tải lên thất bại (${xhr.status}).`));
        }
      } catch {
        reject(new Error('Phản hồi không hợp lệ từ Cloudinary.'));
      }
    };
    xhr.onerror = () => reject(new Error('Không có kết nối mạng.'));
    xhr.ontimeout = () => reject(new Error('Tải lên quá lâu, vui lòng thử lại.'));
    xhr.timeout = 60000;
    xhr.send(form);
  });
}
