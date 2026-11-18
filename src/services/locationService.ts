import Geolocation from '@react-native-community/geolocation';
import { Linking, PermissionsAndroid, Platform } from 'react-native';

export class LocationPermissionError extends Error {}

async function requestPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Quyền truy cập vị trí',
        message: 'Ứng dụng cần quyền vị trí để gửi vị trí hiện tại của bạn.',
        buttonPositive: 'Cho phép',
        buttonNegative: 'Từ chối',
      },
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }
  return new Promise(resolve => {
    Geolocation.requestAuthorization(
      () => resolve(true),
      () => resolve(false),
    );
  });
}

/** Xin quyền rồi lấy tọa độ hiện tại. Ném LocationPermissionError nếu bị từ chối. */
export async function getCurrentLocation(): Promise<{ latitude: number; longitude: number }> {
  const granted = await requestPermission();
  if (!granted) {
    throw new LocationPermissionError('Bạn đã từ chối quyền truy cập vị trí.');
  }
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      position =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      error => {
        if (error.code === error.PERMISSION_DENIED) {
          reject(new LocationPermissionError('Bạn đã từ chối quyền truy cập vị trí.'));
        } else {
          reject(new Error('Không lấy được vị trí. Hãy bật GPS và thử lại.'));
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    );
  });
}

/** Mở Google Maps (app nếu có, không thì trình duyệt) tại đúng tọa độ. */
export function openInGoogleMaps(latitude: number, longitude: number) {
  const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  return Linking.openURL(url);
}
