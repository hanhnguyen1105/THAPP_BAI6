/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

// Không kết nối Firebase thật khi chạy test: giả lập lớp services.
jest.mock('../src/services/authService', () => ({
  subscribeAuth: (cb: (user: null) => void) => {
    cb(null);
    return () => {};
  },
  login: jest.fn(),
  register: jest.fn(),
  resetPassword: jest.fn(),
  logout: jest.fn(),
  authErrorMessage: () => '',
}));
jest.mock('../src/services/presenceService', () => ({
  startPresence: () => () => {},
  goOnline: jest.fn(() => Promise.resolve()),
  goOffline: jest.fn(() => Promise.resolve()),
  subscribeConnection: () => () => {},
}));
jest.mock('../src/services/userService', () => ({
  subscribeUser: () => () => {},
  subscribeAllUsers: () => () => {},
  updateMyProfile: jest.fn(),
}));
jest.mock('../src/services/chatService', () => ({
  getDirectId: (a: string, b: string) => [a, b].sort().join('_'),
  subscribeUserChats: () => () => {},
}));
jest.mock('../src/services/groupService', () => ({ MIN_GROUP_MEMBERS: 2 }));
jest.mock('../src/services/uploadService', () => ({}));
jest.mock('../src/services/locationService', () => ({}));
jest.mock('../src/services/notificationService', () => ({
  subscribeNotifications: () => () => {},
}));

test('renders the login screen when signed out', async () => {
  let tree: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(<App />);
  });
  const texts = tree!.root
    .findAll(node => (node.type as unknown) === 'Text')
    .map(node => node.props.children)
    .flat();
  expect(texts).toContain('Đăng nhập ngay');
});
