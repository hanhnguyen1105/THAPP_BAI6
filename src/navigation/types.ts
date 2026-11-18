import { NavigatorScreenParams } from '@react-navigation/native';

export type TabParamList = {
  Home: undefined;
  Contacts: undefined;
  Notifications: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  /**
   * Chat 1-1: truyền partnerId (convId tự tính, conversation tự tạo nếu chưa có).
   * Nhóm / mở từ thông báo: truyền convId.
   */
  Chat: { convId?: string; partnerId?: string };
  CreateGroup: undefined;
  GroupInfo: { convId: string };
  AddMembers: { convId: string };
};
