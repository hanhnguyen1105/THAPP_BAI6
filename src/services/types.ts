export type AppUser = {
  uid: string;
  name: string;
  email: string;
  /** Chỉ số ảnh mẫu (Bài 5) — dùng khi chưa có ảnh đại diện riêng. */
  avatar: number;
  /** Ảnh đại diện tải lên Cloudinary (Phần C – hồ sơ cá nhân). */
  photoUrl?: string;
  online: boolean;
  lastSeen?: number;
};

export type ConversationType = 'direct' | 'group';

export type Conversation = {
  id: string;
  type: ConversationType;
  name?: string;
  members: Record<string, true>;
  createdBy: string;
  createdAt: number;
};

export type MessageType = 'text' | 'image' | 'location' | 'system';

export const REACTIONS = ['👍', '❤️', '😂', '😮', '😢'] as const;
export type Reaction = (typeof REACTIONS)[number];

export type ReplyRef = {
  id: string;
  senderId: string;
  createdAt: number;
  /** Đoạn trích ngắn của tin gốc. */
  preview: string;
};

export type Message = {
  id: string;
  senderId: string;
  type: MessageType;
  text?: string;
  imageUrl?: string;
  width?: number;
  height?: number;
  lat?: number;
  lng?: number;
  createdAt: number;
  recalled?: boolean;
  reactions?: Record<string, string>;
  replyTo?: ReplyRef;
};

/** userChats/{uid}/{convId} */
export type ChatSummary = {
  convId: string;
  type: ConversationType;
  /** Tên nhóm (chỉ với nhóm). */
  name?: string;
  /** uid người kia (chỉ với chat 1-1). */
  partnerId?: string;
  lastMessage: string;
  lastMessageId?: string;
  lastType: MessageType;
  lastSenderId: string;
  updatedAt: number;
  unread: number;
};

export type NotificationType = 'message' | 'group_added' | 'reaction';

/** notifications/{uid}/{id} */
export type AppNotification = {
  id: string;
  type: NotificationType;
  convId: string;
  fromUid: string;
  text: string;
  createdAt: number;
  read: boolean;
};
